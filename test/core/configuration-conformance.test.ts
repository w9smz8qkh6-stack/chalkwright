import assert from 'node:assert/strict';
import test from 'node:test';

import { runConfigurationStateRepositoryConformance } from '../../src/core/configuration.js';
import type { ConfigurationStateRepository } from '../../src/ports/configuration-state.js';
import { InMemoryConfigurationStateRepository } from '../../src/infrastructure/memory/configuration-state.js';
import { coreGoal1FixtureCatalog } from '../fixtures/core-goal1.js';

test('configuration repository conformance accepts the isolated in-memory adapter', async () => {
  const report = await runConfigurationStateRepositoryConformance(
    new InMemoryConfigurationStateRepository([
      coreGoal1FixtureCatalog.configurationStates.rolledBack,
    ]),
    coreGoal1FixtureCatalog.workspace,
  );
  assert.equal(report.status, 'passed');
});

test('configuration repository conformance rejects an adapter that aliases its state', async () => {
  const state = structuredClone(
    coreGoal1FixtureCatalog.configurationStates.rolledBack,
  );
  const aliasing: ConfigurationStateRepository = {
    read: async () => state,
    readAuditEvents: async () => [],
    transact: async () => {
      throw new Error('not-needed');
    },
  };
  const report = await runConfigurationStateRepositoryConformance(
    aliasing,
    coreGoal1FixtureCatalog.workspace,
  );
  assert.deepEqual(report, {
    status: 'failed',
    results: [
      { id: 'reads-initialized-workspace', status: 'passed' },
      {
        id: 'detaches-read-state',
        status: 'failed',
        diagnostic: 'case-failed',
      },
      { id: 'returns-detached-audit-history', status: 'passed' },
    ],
  });
});
