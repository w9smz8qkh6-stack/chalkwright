import assert from 'node:assert/strict';
import test from 'node:test';

import { VersionedConfigurationService } from '../../../src/application/configuration/versioned-configuration-service.js';
import { createCoreGoal1PlannedDisplayScenarioExecutor } from '../../../src/application/operator-panel/core-goal1-planned-display-adapter.js';
import { PlannedDisplayProjectionService } from '../../../src/application/operator-panel/planned-display-projection-service.js';
import { runCoreGoal1ContractSuite } from '../../../src/contracts/v1/index.js';
import { InMemoryConfigurationStateRepository } from '../../../src/infrastructure/memory/configuration-state.js';
import { coreGoal1FixtureCatalog } from '../../fixtures/core-goal1.js';

function createService(): PlannedDisplayProjectionService {
  const basis = coreGoal1FixtureCatalog.preview.basis;
  return new PlannedDisplayProjectionService(
    coreGoal1FixtureCatalog.workspace,
    new VersionedConfigurationService(
      new InMemoryConfigurationStateRepository([
        coreGoal1FixtureCatalog.configurationStates.rolledBack,
      ]),
    ),
    coreGoal1FixtureCatalog.plannedFrames,
    () => new Date('2035-03-18T10:00:00.000Z'),
    basis.kind === 'revision' ? basis.revisionId : null,
  );
}

test('real C09 adapter satisfies the exact A08 planned-display projection', async () => {
  const executed: string[] = [];
  const executor = createCoreGoal1PlannedDisplayScenarioExecutor(() =>
    createService(),
  );
  const report = await runCoreGoal1ContractSuite(
    coreGoal1FixtureCatalog,
    async (scenario, catalog) => {
      if (scenario.requiredBy.includes('C09')) {
        executed.push(scenario.scenarioId);
        return executor(scenario, catalog);
      }
      return { scenarioId: scenario.scenarioId, actual: scenario.expected };
    },
  );
  assert.equal(report.status, 'passed');
  assert.deepEqual(executed, ['core-goal1-planned-display']);
});

test('C09 projections are deterministic, bounded, and read-only', async () => {
  const service = createService();
  const screenId = coreGoal1FixtureCatalog.screens[0]!.screenId;
  const selection = { schoolDate: '2035-03-18', screenId };
  const first = await service.project(selection);
  const second = await service.project(selection);
  assert.equal(first.status, 'ready');
  assert.equal(first.frames.length, 4);
  assert.equal(first.inputFingerprint, second.inputFingerprint);
  assert.equal(first.cacheDisposition, 'rolling-window');
  assert.equal(first.mutationFree, true);
  assert.deepEqual(first, second);

  const distant = await service.project({
    schoolDate: '2035-04-30',
    screenId,
  });
  assert.equal(distant.status, 'empty');
  assert.equal(distant.cacheDisposition, 'on-demand');
  assert.equal(distant.mutationFree, true);

  const missing = await service.project({
    schoolDate: '2035-03-18',
    screenId: 'screen-synthetic-missing' as never,
  });
  assert.equal(missing.status, 'screen-not-found');
  assert.equal(missing.frames.length, 0);
});
