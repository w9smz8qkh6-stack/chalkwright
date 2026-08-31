import assert from 'node:assert/strict';
import test from 'node:test';

import { VersionedConfigurationService } from '../../../src/application/configuration/versioned-configuration-service.js';
import { createCoreGoal1OperatorShellScenarioExecutor } from '../../../src/application/operator-panel/core-goal1-operator-shell-adapter.js';
import { CoreOperatorShellService } from '../../../src/application/operator-panel/core-operator-shell-service.js';
import {
  isOperatorFeatureRegionModel,
  forbiddenOperatorFeatureRegionFields,
  operatorPageKeys,
  runCoreGoal1ContractSuite,
} from '../../../src/contracts/v1/index.js';
import { InMemoryConfigurationStateRepository } from '../../../src/infrastructure/memory/configuration-state.js';
import { coreGoal1FixtureCatalog } from '../../fixtures/core-goal1.js';

function createShell(): CoreOperatorShellService {
  return new CoreOperatorShellService(
    coreGoal1FixtureCatalog.workspace,
    new VersionedConfigurationService(
      new InMemoryConfigurationStateRepository([
        coreGoal1FixtureCatalog.configurationStates.rolledBack,
      ]),
    ),
  );
}

function objectKeys(value: unknown): readonly string[] {
  if (value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(objectKeys);
  return [...Object.keys(value), ...Object.values(value).flatMap(objectKeys)];
}

test('real C02 shell adapter satisfies the exact A08 private-operator scenario', async () => {
  const executed: string[] = [];
  const executor = createCoreGoal1OperatorShellScenarioExecutor(() =>
    createShell(),
  );
  const report = await runCoreGoal1ContractSuite(
    coreGoal1FixtureCatalog,
    async (scenario, catalog) => {
      if (scenario.requiredBy.includes('C02')) {
        executed.push(scenario.scenarioId);
        return executor(scenario, catalog);
      }
      return { scenarioId: scenario.scenarioId, actual: scenario.expected };
    },
  );
  assert.equal(report.status, 'passed');
  assert.deepEqual(executed, ['core-goal1-private-operator-shell']);
});

test('shell service discovers all stable pages and renders guarded C01-backed models', async () => {
  const shell = createShell();
  assert.deepEqual(
    shell
      .discoverCapabilities()
      .map((capability) => [
        capability.pageKey,
        capability.status,
        capability.implementationTask,
      ]),
    [
      ['overview', 'available', 'C02'],
      ['displays', 'planned', 'C03'],
      ['sources', 'planned', 'C04'],
      ['planned-display', 'planned', 'C09'],
      ['presentation', 'available', 'C02'],
      ['configuration', 'available', 'C01'],
      ['diagnostics-recovery', 'available', 'C02'],
    ],
  );
  assert.deepEqual(await shell.readiness(), {
    ready: true,
    authority: 'private-reachability',
    workspaceId: coreGoal1FixtureCatalog.workspace.workspaceId,
    configuration: 'ready',
  });

  for (const pageKey of operatorPageKeys) {
    const model = await shell.page(pageKey);
    assert.equal(isOperatorFeatureRegionModel(model), true, pageKey);
    assert.equal(model.pageKey, pageKey);
    assert.equal(model.workspace.kind, 'self-hosted-installation');
    const keys = new Set(objectKeys(model));
    for (const forbidden of forbiddenOperatorFeatureRegionFields) {
      assert.equal(keys.has(forbidden), false, `${pageKey}:${forbidden}`);
    }
  }
  const overview = await shell.page('overview');
  assert.equal(
    overview.sections
      .flatMap((section) => section.items)
      .find((candidate) => candidate.itemKey === 'active-revision')?.value,
    coreGoal1FixtureCatalog.configurationStates.rolledBack.activePointer
      ?.revisionId,
  );
});
