import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

import type { OperatorPageKey } from '../../contracts/v1/index.js';
import {
  coreOperatorPagePaths,
  coreOperatorShellStyles,
  renderCoreOperatorErrorDocument,
} from '../../presentation/core-operator-shell.js';
import type {
  CoreOperatorHttpController,
  CoreOperatorHttpServerOptions,
  RunningCoreOperatorHttpServer,
} from './types.js';

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_GRACEFUL_CLOSE_TIMEOUT_MS = 5_000;
const MAX_URL_BYTES = 2_048;
const FORWARDED_HEADERS = [
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
] as const;

type OperatorRoute =
  | { readonly kind: 'page'; readonly pageKey: OperatorPageKey }
  | { readonly kind: 'capabilities' }
  | { readonly kind: 'health' }
  | { readonly kind: 'readiness' }
  | { readonly kind: 'stylesheet' }
  | { readonly kind: 'redirect' };

const routeTable = new Map<string, OperatorRoute>([
  ['/', { kind: 'redirect' }],
  ['/capabilities', { kind: 'capabilities' }],
  ['/health', { kind: 'health' }],
  ['/ready', { kind: 'readiness' }],
  ['/assets/operator-shell.css', { kind: 'stylesheet' }],
  ...Object.entries(coreOperatorPagePaths).map(
    ([pageKey, path]) =>
      [path, { kind: 'page', pageKey: pageKey as OperatorPageKey }] as const,
  ),
]);

class OperatorProtocolError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly messageForClient: string,
    readonly headers: Readonly<Record<string, string>> = {},
  ) {
    super(code);
    this.name = 'OperatorProtocolError';
  }
}

function positiveBoundedInteger(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${label} must be an integer from ${minimum} through ${maximum}.`,
    );
  }
  return value;
}

function operatorOrigin(host: '127.0.0.1' | '::1', port: number): string {
  return `http://${host === '::1' ? `[${host}]` : host}:${port}`;
}

function expectedAuthority(host: '127.0.0.1' | '::1', port: number): string {
  return `${host === '::1' ? `[${host}]` : host}:${port}`;
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'none'; connect-src 'self'",
  );
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader(
    'Permissions-Policy',
    'camera=(), geolocation=(), microphone=()',
  );
}

function validateIngress(
  request: IncomingMessage,
  authority: string,
  origin: string,
): 'GET' | 'HEAD' {
  const host = request.headers.host;
  if (host === undefined || host !== authority) {
    throw new OperatorProtocolError(
      421,
      'host_rejected',
      'Request host is not allowed.',
    );
  }
  if (
    FORWARDED_HEADERS.some((header) => request.headers[header] !== undefined)
  ) {
    throw new OperatorProtocolError(
      400,
      'forwarding_rejected',
      'Forwarded request metadata is not accepted.',
    );
  }
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD') {
    const requestOrigin = request.headers.origin;
    if (requestOrigin === undefined || requestOrigin !== origin) {
      throw new OperatorProtocolError(
        403,
        'origin_rejected',
        'Mutation origin is not allowed.',
      );
    }
    if (request.headers['sec-fetch-site'] === 'cross-site') {
      throw new OperatorProtocolError(
        403,
        'cross_site_rejected',
        'Cross-site requests are not allowed.',
      );
    }
    const contentType = request.headers['content-type'];
    if (
      contentType !== undefined &&
      !contentType.toLowerCase().startsWith('application/x-www-form-urlencoded')
    ) {
      throw new OperatorProtocolError(
        415,
        'content_type_rejected',
        'Mutation content type is not allowed.',
      );
    }
    throw new OperatorProtocolError(
      405,
      'method_not_allowed',
      'Method not allowed.',
      { Allow: 'GET, HEAD' },
    );
  }
  const requestOrigin = request.headers.origin;
  if (requestOrigin !== undefined && requestOrigin !== origin) {
    throw new OperatorProtocolError(
      403,
      'origin_rejected',
      'Request origin is not allowed.',
    );
  }
  return method;
}

function parseRoute(request: IncomingMessage): OperatorRoute {
  const target = request.url;
  if (
    target === undefined ||
    Buffer.byteLength(target, 'utf8') > MAX_URL_BYTES ||
    !target.startsWith('/') ||
    target.includes('#')
  ) {
    throw new OperatorProtocolError(
      400,
      'invalid_target',
      'Invalid request target.',
    );
  }
  let parsed: URL;
  const operatorBase = 'http://operator.invalid';
  try {
    parsed = new URL(target, operatorBase);
  } catch {
    throw new OperatorProtocolError(
      400,
      'invalid_target',
      'Invalid request target.',
    );
  }
  if (
    parsed.origin !== operatorBase ||
    target !== parsed.pathname ||
    parsed.search !== '' ||
    parsed.username !== '' ||
    parsed.password !== ''
  ) {
    throw new OperatorProtocolError(
      400,
      'invalid_target',
      'Invalid request target.',
    );
  }
  const route = routeTable.get(parsed.pathname);
  if (route === undefined) {
    throw new OperatorProtocolError(404, 'not_found', 'Not found.');
  }
  return route;
}

function sendBytes(
  response: ServerResponse,
  method: 'GET' | 'HEAD',
  status: number,
  contentType: string,
  value: string,
  headers: Readonly<Record<string, string>> = {},
): void {
  const bytes = Buffer.from(value, 'utf8');
  response.statusCode = status;
  response.setHeader('Content-Type', contentType);
  response.setHeader('Content-Length', bytes.byteLength);
  for (const [name, headerValue] of Object.entries(headers)) {
    response.setHeader(name, headerValue);
  }
  response.end(method === 'HEAD' ? undefined : bytes);
}

function sendJson(
  response: ServerResponse,
  method: 'GET' | 'HEAD',
  status: number,
  value: unknown,
): void {
  sendBytes(
    response,
    method,
    status,
    'application/json; charset=utf-8',
    `${JSON.stringify(value)}\n`,
  );
}

async function dispatchRoute(options: {
  readonly route: OperatorRoute;
  readonly controller: CoreOperatorHttpController;
  readonly response: ServerResponse;
  readonly method: 'GET' | 'HEAD';
}): Promise<void> {
  const { route, controller, response, method } = options;
  if (route.kind === 'redirect') {
    sendBytes(
      response,
      method,
      303,
      'text/plain; charset=utf-8',
      'See overview.\n',
      {
        Location: '/overview',
      },
    );
    return;
  }
  if (route.kind === 'stylesheet') {
    sendBytes(
      response,
      method,
      200,
      'text/css; charset=utf-8',
      coreOperatorShellStyles,
    );
    return;
  }
  if (route.kind === 'health') {
    sendJson(response, method, 200, { status: 'ok', process: 'core-operator' });
    return;
  }
  if (route.kind === 'capabilities') {
    sendJson(response, method, 200, {
      authority: 'private-reachability',
      capabilities: await controller.capabilities(),
    });
    return;
  }
  if (route.kind === 'readiness') {
    const readiness = await controller.readiness();
    const ready =
      typeof readiness === 'object' &&
      readiness !== null &&
      Reflect.get(readiness, 'ready') === true;
    sendJson(response, method, ready ? 200 : 503, readiness);
    return;
  }
  sendBytes(
    response,
    method,
    200,
    'text/html; charset=utf-8',
    await controller.renderPage(route.pageKey),
  );
}

function sendFailure(
  response: ServerResponse,
  method: string | undefined,
  error: unknown,
): void {
  const head = method === 'HEAD';
  if (error instanceof OperatorProtocolError) {
    sendBytes(
      response,
      head ? 'HEAD' : 'GET',
      error.status,
      'application/json; charset=utf-8',
      `${JSON.stringify({ error: { code: error.code, message: error.messageForClient } })}\n`,
      error.headers,
    );
    return;
  }
  sendBytes(
    response,
    head ? 'HEAD' : 'GET',
    500,
    'text/html; charset=utf-8',
    renderCoreOperatorErrorDocument(),
  );
}

export async function startCoreOperatorHttpServer(
  options: CoreOperatorHttpServerOptions,
): Promise<RunningCoreOperatorHttpServer> {
  if (options.host !== '127.0.0.1' && options.host !== '::1') {
    throw new TypeError('Operator host must be an explicit loopback address.');
  }
  const port = positiveBoundedInteger(options.port ?? 0, 0, 65_535, 'port');
  const requestTimeoutMs = positiveBoundedInteger(
    options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    100,
    120_000,
    'requestTimeoutMs',
  );
  const gracefulCloseTimeoutMs = positiveBoundedInteger(
    options.gracefulCloseTimeoutMs ?? DEFAULT_GRACEFUL_CLOSE_TIMEOUT_MS,
    10,
    60_000,
    'gracefulCloseTimeoutMs',
  );
  let origin = '';
  let authority = '';
  const server = createServer((request, response) => {
    setSecurityHeaders(response);
    void (async () => {
      try {
        const method = validateIngress(request, authority, origin);
        const route = parseRoute(request);
        await dispatchRoute({
          route,
          controller: options.controller,
          response,
          method,
        });
      } catch (error) {
        if (!response.headersSent) sendFailure(response, request.method, error);
        else response.destroy();
      }
    })();
  });
  server.on('upgrade', (_request, socket) => {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
  });
  server.requestTimeout = requestTimeoutMs;
  server.headersTimeout = Math.min(requestTimeoutMs, 5_000);
  server.keepAliveTimeout = Math.min(requestTimeoutMs, 5_000);
  server.maxRequestsPerSocket = 100;

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => reject(error);
    server.once('error', onError);
    server.listen(port, options.host, () => {
      server.off('error', onError);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  origin = operatorOrigin(options.host, address.port);
  authority = expectedAuthority(options.host, address.port);
  let closed = false;
  return {
    host: options.host,
    port: address.port,
    origin,
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(
          () => server.closeAllConnections(),
          gracefulCloseTimeoutMs,
        );
        timer.unref();
        server.close(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    },
  };
}
