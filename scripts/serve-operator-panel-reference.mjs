import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  renderOperatorPanelGallery,
  renderOperatorStateGallery,
} from '../.test-dist/test/reference/operator-panel-gallery.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const styles = readFileSync(
  join(repositoryRoot, 'test', 'reference', 'operator-panel-gallery.css'),
  'utf8',
);
const pageKeys = new Set([
  'overview',
  'displays',
  'sources',
  'planned-display',
  'presentation',
  'configuration',
  'diagnostics-recovery',
]);
const host = '127.0.0.1';
const requestedPort = Number.parseInt(
  process.env.CHALKWRIGHT_OPERATOR_REFERENCE_PORT ?? '43118',
  10,
);
if (
  !Number.isSafeInteger(requestedPort) ||
  requestedPort < 0 ||
  requestedPort > 65_535
) {
  throw new Error('operator-reference-port-invalid');
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${host}`);
  if (requestUrl.pathname === '/favicon.ico') {
    response.writeHead(204).end();
    return;
  }
  if (requestUrl.pathname === '/states') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(renderOperatorStateGallery(styles));
    return;
  }
  if (requestUrl.pathname !== '/') {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found.');
    return;
  }
  const requestedPage = requestUrl.searchParams.get('page') ?? 'overview';
  const requestedShell = requestUrl.searchParams.get('shell') ?? 'self-hosted';
  if (
    !pageKeys.has(requestedPage) ||
    (requestedShell !== 'self-hosted' && requestedShell !== 'hosted')
  ) {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Invalid reference selection.');
    return;
  }
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-security-policy':
      "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
  });
  response.end(
    renderOperatorPanelGallery({
      styles,
      pageKey: requestedPage,
      shell: requestedShell,
    }),
  );
});

server.listen(requestedPort, host, () => {
  const address = server.address();
  const port =
    typeof address === 'object' && address !== null
      ? address.port
      : requestedPort;
  process.stdout.write(`operator-panel-reference=http://${host}:${port}/\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
