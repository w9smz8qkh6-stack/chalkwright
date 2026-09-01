import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

import { scopeIdentifier, type ScreenId } from '../../core/contracts.js';
import type {
  CoreDisplayHttpServerOptions,
  RunningCoreDisplayHttpServer,
} from './types.js';

const SESSION_COOKIE = 'chalkwright_core_display_session';

function originFor(host: '127.0.0.1' | '::1', port: number): string {
  return `http://${host === '::1' ? `[${host}]` : host}:${port}`;
}

function setHeaders(response: ServerResponse): void {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
}

function cookieValue(request: IncomingMessage): string | null {
  const header = request.headers.cookie;
  if (header === undefined) return null;
  for (const pair of header.split(';')) {
    const [name, value] = pair.trim().split('=', 2);
    if (
      name === SESSION_COOKIE &&
      value !== undefined &&
      /^[A-Za-z0-9_-]{32,}$/u.test(value)
    )
      return value;
  }
  return null;
}

async function form(
  request: IncomingMessage,
): Promise<Readonly<Record<string, string>> | null> {
  if (
    !/^application\/x-www-form-urlencoded(?:\s*;|\s*$)/iu.test(
      request.headers['content-type'] ?? '',
    )
  )
    return null;
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;
    if (length > 1024) return null;
    chunks.push(bytes);
  }
  const values = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  const result: Record<string, string> = Object.create(null) as Record<
    string,
    string
  >;
  for (const [key, value] of values) {
    if (
      key.length === 0 ||
      key.length > 32 ||
      value.length > 128 ||
      Object.hasOwn(result, key)
    )
      return null;
    result[key] = value;
  }
  return result;
}

function screenFromPath(path: string): ScreenId | null {
  const match = /^\/screens\/([A-Za-z0-9][A-Za-z0-9._~-]{0,127})$/u.exec(path);
  if (match?.[1] === undefined) return null;
  try {
    return scopeIdentifier('screen', match[1]);
  } catch {
    return null;
  }
}

function send(response: ServerResponse, status: number, body = ''): void {
  response.statusCode = status;
  response.end(body);
}

/**
 * Starts the bounded Core viewer ingress. It has no operator route, controller,
 * cookie name, or configuration-write capability; publication remains a
 * separate deployment decision.
 */
export async function startCoreDisplayHttpServer(
  options: CoreDisplayHttpServerOptions,
): Promise<RunningCoreDisplayHttpServer> {
  if (options.host !== '127.0.0.1' && options.host !== '::1')
    throw new TypeError('display ingress requires an explicit loopback host.');
  const server = createServer((request, response) => {
    void (async () => {
      setHeaders(response);
      const address = server.address() as AddressInfo;
      const origin = originFor(options.host, address.port);
      if (
        request.headers.host !==
          `${options.host === '::1' ? `[${options.host}]` : options.host}:${address.port}` ||
        request.headers.forwarded !== undefined ||
        request.headers['x-forwarded-host'] !== undefined
      )
        return send(response, 400);
      const path = request.url;
      if (
        path === '/health' &&
        (request.method === 'GET' || request.method === 'HEAD')
      )
        return send(response, 200);
      if (
        path === '/ready' &&
        (request.method === 'GET' || request.method === 'HEAD')
      ) {
        const readiness = await options.renderer.readiness();
        const ready =
          typeof readiness === 'object' &&
          readiness !== null &&
          Reflect.get(readiness, 'ready') === true;
        response.setHeader('content-type', 'application/json; charset=utf-8');
        return send(
          response,
          ready ? 200 : 503,
          request.method === 'HEAD' ? '' : JSON.stringify(readiness),
        );
      }
      if (path === '/admit' && request.method === 'POST') {
        if (request.headers.origin !== origin) return send(response, 403);
        const fields = await form(request);
        const screenId =
          fields === null
            ? null
            : screenFromPath(`/screens/${fields.screenId ?? ''}`);
        if (screenId === null || fields?.classCode === undefined)
          return send(response, 422);
        const admitted = await options.admission.admitViewer(
          screenId,
          fields.classCode,
        );
        if (admitted.status !== 'admitted') return send(response, 403);
        response.statusCode = 303;
        response.setHeader('Location', `/screens/${screenId}`);
        response.setHeader(
          'Set-Cookie',
          `${SESSION_COOKIE}=${admitted.sessionToken}; Path=/screens/${screenId}; HttpOnly; SameSite=Strict; Max-Age=900`,
        );
        return response.end();
      }
      const screenId = path === undefined ? null : screenFromPath(path);
      if (
        screenId === null ||
        (request.method !== 'GET' && request.method !== 'HEAD')
      )
        return send(response, 404);
      const token = cookieValue(request);
      if (
        token === null ||
        !(await options.admission.validateViewerSession(screenId, token))
      )
        return send(response, 403);
      response.setHeader('content-type', 'text/html; charset=utf-8');
      return send(
        response,
        200,
        request.method === 'HEAD'
          ? ''
          : await options.renderer.renderCommittedScreen(screenId),
      );
    })().catch(() => send(response, 500));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, options.host, () => resolve());
  });
  const address = server.address() as AddressInfo;
  return {
    host: options.host,
    port: address.port,
    origin: originFor(options.host, address.port),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
