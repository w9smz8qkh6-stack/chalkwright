import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCoreOperatorEntrypointConfig } from '../../src/entrypoints/core-operator-server.js';

test('Core operator process requires explicit synthetic acknowledgement, loopback host, and port', () => {
  assert.throws(() => loadCoreOperatorEntrypointConfig({}), /acknowledgement/u);
  assert.throws(
    () =>
      loadCoreOperatorEntrypointConfig({
        CHALKWRIGHT_CORE_OPERATOR_SYNTHETIC: '1',
        CHALKWRIGHT_CORE_OPERATOR_HOST: '0.0.0.0',
        CHALKWRIGHT_CORE_OPERATOR_PORT: '4317',
      }),
    /loopback/u,
  );
  assert.throws(
    () =>
      loadCoreOperatorEntrypointConfig({
        CHALKWRIGHT_CORE_OPERATOR_SYNTHETIC: '1',
        CHALKWRIGHT_CORE_OPERATOR_HOST: '127.0.0.1',
      }),
    /port/u,
  );
  assert.deepEqual(
    loadCoreOperatorEntrypointConfig({
      CHALKWRIGHT_CORE_OPERATOR_SYNTHETIC: '1',
      CHALKWRIGHT_CORE_OPERATOR_HOST: '::1',
      CHALKWRIGHT_CORE_OPERATOR_PORT: '4317',
    }),
    { host: '::1', port: 4317 },
  );
});
