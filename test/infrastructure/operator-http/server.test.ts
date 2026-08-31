import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { afterEach, test } from 'node:test';

import { startCoreOperatorApplication } from '../../../src/app/core-operator-server.js';
import type { CoreOperatorHttpController } from '../../../src/infrastructure/operator-http/index.js';
import {
  startCoreOperatorHttpServer,
  type RunningCoreOperatorHttpServer,
} from '../../../src/infrastructure/operator-http/index.js';
import { VersionedConfigurationService } from '../../../src/application/configuration/versioned-configuration-service.js';
import { operatorPageKeys } from '../../../src/contracts/v1/index.js';
import { startClassroomHttpServer } from '../../../src/infrastructure/http/index.js';
import { InMemoryConfigurationStateRepository } from '../../../src/infrastructure/memory/configuration-state.js';
import { coreOperatorPagePaths } from '../../../src/presentation/core-operator-shell.js';
import { coreGoal1FixtureCatalog } from '../../fixtures/core-goal1.js';

const runningServers: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.close()));
});

async function startOperator(): Promise<RunningCoreOperatorHttpServer> {
  const running = await startCoreOperatorApplication({
    host: '127.0.0.1',
    port: 0,
    workspace: coreGoal1FixtureCatalog.workspace,
    configuration: new VersionedConfigurationService(
      new InMemoryConfigurationStateRepository([
        coreGoal1FixtureCatalog.configurationStates.rolledBack,
      ]),
    ),
  });
  runningServers.push(running);
  return running;
}

function rawRequest(
  running: RunningCoreOperatorHttpServer,
  path: string,
  options: {
    readonly method?: string;
    readonly headers?: Readonly<Record<string, string>>;
  } = {},
): Promise<{
  readonly status: number;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: string;
}> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: running.host,
        port: running.port,
        path,
        method: options.method ?? 'GET',
        headers: options.headers,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    request.on('error', reject);
    request.end();
  });
}

test('private operator ingress serves only its seven-page shell and bounded discovery routes', async () => {
  const running = await startOperator();
  assert.equal(running.host, '127.0.0.1');
  assert.match(running.origin, /^http:\/\/127\.0\.0\.1:\d+$/u);

  const root = await fetch(`${running.origin}/`, { redirect: 'manual' });
  assert.equal(root.status, 303);
  assert.equal(root.headers.get('location'), '/overview');

  for (const pageKey of operatorPageKeys) {
    const response = await fetch(
      `${running.origin}${coreOperatorPagePaths[pageKey]}`,
    );
    assert.equal(response.status, 200, pageKey);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html/u);
    assert.match(
      response.headers.get('content-security-policy') ?? '',
      /default-src 'none'.*script-src 'none'/u,
    );
    assert.equal(response.headers.get('set-cookie'), null);
    const body = await response.text();
    assert.match(body, /Core operator navigation/u);
    assert.match(body, /Private operator access:/u);
    assert.doesNotMatch(body, /type="password"|sign in|log in/iu);
    assert.doesNotMatch(body, /<script/u);
  }

  const capabilities = await fetch(`${running.origin}/capabilities`);
  assert.equal(capabilities.status, 200);
  const capabilityBody = (await capabilities.json()) as {
    authority: string;
    capabilities: unknown[];
  };
  assert.equal(capabilityBody.authority, 'private-reachability');
  assert.equal(capabilityBody.capabilities.length, 7);

  const ready = await fetch(`${running.origin}/ready`);
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), {
    ready: true,
    authority: 'private-reachability',
    workspaceId: coreGoal1FixtureCatalog.workspace.workspaceId,
    configuration: 'ready',
  });
  assert.equal((await fetch(`${running.origin}/health`)).status, 200);
  assert.equal((await fetch(`${running.origin}/display/screen-a`)).status, 404);
  assert.equal(
    (await fetch(`${running.origin}/overrides/screen-a`)).status,
    404,
  );
});

test('Host, Origin, forwarding, method, and content-type negatives fail closed', async () => {
  const running = await startOperator();
  const authority = `127.0.0.1:${running.port}`;
  assert.equal(
    (
      await rawRequest(running, '/overview', {
        headers: { Host: 'rebind.invalid' },
      })
    ).status,
    421,
  );
  assert.equal(
    (
      await rawRequest(running, '/overview', {
        headers: { Host: authority, 'X-Forwarded-Host': authority },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await rawRequest(running, '/overview', {
        headers: { Host: authority, Origin: 'https://hostile.invalid' },
      })
    ).status,
    403,
  );
  assert.equal(
    (await rawRequest(running, '/overview', { method: 'POST' })).status,
    403,
  );
  assert.equal(
    (
      await rawRequest(running, '/overview', {
        method: 'POST',
        headers: { Host: authority, Origin: 'https://hostile.invalid' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await rawRequest(running, '/overview', {
        method: 'POST',
        headers: {
          Host: authority,
          Origin: running.origin,
          'Content-Type': 'application/json',
        },
      })
    ).status,
    415,
  );
  const method = await rawRequest(running, '/overview', {
    method: 'POST',
    headers: {
      Host: authority,
      Origin: running.origin,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  assert.equal(method.status, 405);
  assert.equal(method.headers.allow, 'GET, HEAD');
  assert.equal(
    (await fetch(`${running.origin}/overview?workspace=other`)).status,
    400,
  );
});

test('request targets must be canonical origin-form paths before route lookup', async () => {
  const running = await startOperator();
  const exact = await rawRequest(running, '/overview');
  assert.equal(exact.status, 200);

  for (const target of [
    '//foreign.invalid/overview',
    '/x/../overview',
    '/%2e%2e/overview',
    String.raw`/x\..\overview`,
  ]) {
    const response = await rawRequest(running, target);
    assert.equal(response.status, 400, target);
    assert.match(response.body, /Invalid request target/u, target);
  }

  assert.equal((await rawRequest(running, '/unknown')).status, 404);
});

test('operator bind must be explicit loopback and display ingress cannot resolve an operator handler', async () => {
  const controller: CoreOperatorHttpController = {
    renderPage: () => '<main>synthetic</main>',
    capabilities: () => [],
    readiness: () => ({ ready: true }),
  };
  await assert.rejects(
    startCoreOperatorHttpServer({
      controller,
      host: '0.0.0.0' as '127.0.0.1',
    }),
    /explicit loopback/u,
  );
  await assert.rejects(
    startCoreOperatorHttpServer({
      controller,
      host: undefined as unknown as '127.0.0.1',
    }),
    /explicit loopback/u,
  );

  const display = await startClassroomHttpServer({
    host: '127.0.0.1',
    port: 0,
    controller: { handle: () => undefined },
    assets: {},
    media: {},
  });
  runningServers.push(display);
  assert.equal((await fetch(`${display.origin}/overview`)).status, 404);
  assert.equal((await fetch(`${display.origin}/configuration`)).status, 404);
  assert.equal((await fetch(`${display.origin}/capabilities`)).status, 404);
});

test('unexpected controller failures render a finite HTML boundary without detail leakage', async () => {
  const controller: CoreOperatorHttpController = {
    renderPage: () => {
      throw new Error('synthetic-private-canary-value');
    },
    capabilities: () => [],
    readiness: () => ({ ready: false }),
  };
  const running = await startCoreOperatorHttpServer({
    controller,
    host: '127.0.0.1',
  });
  runningServers.push(running);
  const response = await fetch(`${running.origin}/overview`);
  assert.equal(response.status, 500);
  assert.match(response.headers.get('content-type') ?? '', /^text\/html/u);
  const body = await response.text();
  assert.match(body, /operator page is unavailable/iu);
  assert.doesNotMatch(body, /synthetic-private-canary-value/u);
});
