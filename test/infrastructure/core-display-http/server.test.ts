import assert from 'node:assert/strict';
import test from 'node:test';

import { scopeIdentifier } from '../../../src/core/contracts.js';
import { startCoreDisplayHttpServer } from '../../../src/infrastructure/core-display-http/index.js';

const screenId = scopeIdentifier('screen', 'screen-core-display');

test('Core display ingress admits a class-code viewer without exposing operator routes or cookies', async () => {
  const calls: string[] = [];
  const running = await startCoreDisplayHttpServer({
    host: '127.0.0.1',
    admission: {
      async admitViewer(requestedScreen, code) {
        calls.push(`admit:${requestedScreen}:${code}`);
        return code === 'correct-class-code'
          ? { status: 'admitted', sessionToken: 'a'.repeat(43) }
          : { status: 'denied' };
      },
      async validateViewerSession(requestedScreen, token) {
        calls.push(`validate:${requestedScreen}:${token}`);
        return requestedScreen === screenId && token === 'a'.repeat(43);
      },
    },
    renderer: {
      renderCommittedScreen: (requestedScreen) =>
        `<main>committed ${requestedScreen}</main>`,
      readiness: () => ({ ready: true, projection: 'committed' }),
    },
  });
  try {
    assert.equal((await fetch(`${running.origin}/overview`)).status, 404);
    assert.equal((await fetch(`${running.origin}/configuration`)).status, 404);
    assert.equal((await fetch(`${running.origin}/capabilities`)).status, 404);
    assert.equal(
      (await fetch(`${running.origin}/actions/displays/save-draft`)).status,
      404,
    );
    assert.equal((await fetch(`${running.origin}/health`)).status, 200);
    assert.deepEqual(await (await fetch(`${running.origin}/ready`)).json(), {
      ready: true,
      projection: 'committed',
    });

    const rejected = await fetch(`${running.origin}/admit`, {
      method: 'POST',
      headers: {
        Origin: running.origin,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ screenId, classCode: 'wrong-code' }),
    });
    assert.equal(rejected.status, 403);
    assert.equal(rejected.headers.get('set-cookie'), null);

    const admitted = await fetch(`${running.origin}/admit`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Origin: running.origin,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ screenId, classCode: 'correct-class-code' }),
    });
    assert.equal(admitted.status, 303);
    assert.equal(admitted.headers.get('location'), `/screens/${screenId}`);
    const cookie = admitted.headers.get('set-cookie');
    assert.match(cookie ?? '', /HttpOnly; SameSite=Strict; Max-Age=900/u);
    assert.match(cookie ?? '', new RegExp(`Path=/screens/${screenId}`));

    const screen = await fetch(`${running.origin}/screens/${screenId}`, {
      headers: { Cookie: cookie!.split(';', 1)[0]! },
    });
    assert.equal(screen.status, 200);
    assert.match(await screen.text(), /committed screen-core-display/u);
    assert.equal(calls.filter((call) => call.startsWith('admit:')).length, 2);
  } finally {
    await running.close();
  }
});

test('Core display ingress fails closed for cross-origin admission and invalid viewer state', async () => {
  const running = await startCoreDisplayHttpServer({
    host: '127.0.0.1',
    admission: {
      admitViewer: async () => ({ status: 'denied' }),
      validateViewerSession: async () => false,
    },
    renderer: {
      renderCommittedScreen: () => '<main>unreachable</main>',
      readiness: () => ({ ready: false }),
    },
  });
  try {
    assert.equal((await fetch(`${running.origin}/ready`)).status, 503);
    assert.equal(
      (
        await fetch(`${running.origin}/admit`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ screenId, classCode: 'wrong-code' }),
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(`${running.origin}/screens/${screenId}`)).status,
      403,
    );
  } finally {
    await running.close();
  }
});
