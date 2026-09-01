import assert from 'node:assert/strict';
import test from 'node:test';

import { composeSelfHostedCore } from '../../src/app/self-hosted-core-composition.js';
import { VersionedConfigurationService } from '../../src/core/configuration.js';
import { InMemoryConfigurationStateRepository } from '../../src/infrastructure/memory/configuration-state.js';
import { coreGoal1FixtureCatalog } from '../fixtures/core-goal1.js';

test('self-hosted composition builds the private Core controller from public Core surfaces', async () => {
  const composition = composeSelfHostedCore({
    workspace: coreGoal1FixtureCatalog.workspace,
    configuration: new VersionedConfigurationService(
      new InMemoryConfigurationStateRepository([
        coreGoal1FixtureCatalog.configurationStates.rolledBack,
      ]),
    ),
    plannedFrames: coreGoal1FixtureCatalog.plannedFrames,
  });

  assert.equal(composition.controller.shell, composition.shell);
  assert.equal(composition.controller.displays, composition.displays);
  assert.equal(composition.controller.sources, composition.sources);
  assert.equal(
    composition.controller.plannedDisplays,
    composition.plannedDisplays,
  );
  assert.equal(composition.controller.presentation, composition.presentation);
  assert.deepEqual(await composition.controller.readiness(), {
    ready: true,
    authority: 'private-reachability',
    workspaceId: 'workspace-synthetic-core-goal1',
    configuration: 'ready',
  });
  assert.match(
    JSON.stringify(composition.controller.capabilities()),
    /"authority":"private-reachability"/u,
  );
});
