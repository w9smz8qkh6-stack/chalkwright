import assert from 'node:assert/strict';
import test from 'node:test';

import { runCoreConformanceSuite } from '../../src/core/contract-test-kit.js';

test('Core conformance runner accepts a conforming adapter and reports no adapter detail', async () => {
  const report = await runCoreConformanceSuite({ revision: 3 }, [
    {
      id: 'reads-revision',
      run: (adapter) => assert.equal(adapter.revision, 3),
    },
    {
      id: 'preserves-revision',
      run: (adapter) => assert.equal(adapter.revision, 3),
    },
  ]);
  assert.deepEqual(report, {
    status: 'passed',
    results: [
      { id: 'reads-revision', status: 'passed' },
      { id: 'preserves-revision', status: 'passed' },
    ],
  });
});

test('Core conformance runner fails a nonconforming adapter without leaking its error', async () => {
  const report = await runCoreConformanceSuite({ revision: 2 }, [
    {
      id: 'requires-current-revision',
      run: (adapter) => {
        if (adapter.revision !== 3) throw new Error('adapter-private-secret');
      },
    },
  ]);
  assert.deepEqual(report, {
    status: 'failed',
    results: [
      {
        id: 'requires-current-revision',
        status: 'failed',
        diagnostic: 'case-failed',
      },
    ],
  });
  assert.doesNotMatch(JSON.stringify(report), /adapter-private-secret/u);
});
