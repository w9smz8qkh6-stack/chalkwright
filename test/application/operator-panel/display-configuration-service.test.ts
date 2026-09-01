import assert from 'node:assert/strict';
import test from 'node:test';

import { VersionedConfigurationService } from '../../../src/application/configuration/versioned-configuration-service.js';
import { createCoreGoal1DisplayConfigurationScenarioExecutor } from '../../../src/application/operator-panel/core-goal1-display-configuration-adapter.js';
import { DisplayConfigurationService } from '../../../src/application/operator-panel/display-configuration-service.js';
import { CoreOperatorShellService } from '../../../src/application/operator-panel/core-operator-shell-service.js';
import {
  contractVersion,
  runCoreGoal1ContractSuite,
  scopeIdentifier,
} from '../../../src/contracts/v1/index.js';
import { InMemoryConfigurationStateRepository } from '../../../src/infrastructure/memory/configuration-state.js';
import { InMemoryDisplayAccessRepository } from '../../../src/infrastructure/memory/display-access.js';
import { coreGoal1FixtureCatalog } from '../../fixtures/core-goal1.js';

function harness() {
  const configuration = new VersionedConfigurationService(
    new InMemoryConfigurationStateRepository([
      coreGoal1FixtureCatalog.configurationStates.rolledBack,
    ]),
  );
  const access = new InMemoryDisplayAccessRepository(
    coreGoal1FixtureCatalog.screens.map((screen) => ({
      workspace: coreGoal1FixtureCatalog.workspace,
      screenId: screen.screenId,
      state: {
        classCodeState: screen.classCodeState,
        verifier: null,
        viewerSessions: [],
        admissionFailures: [],
      },
    })),
  );
  const displays = new DisplayConfigurationService(
    coreGoal1FixtureCatalog.workspace,
    configuration,
    access,
    'https://display.synthetic.invalid',
    () => new Date('2035-03-18T10:00:00.000Z'),
  );
  return { configuration, access, displays };
}

test('real C03 adapter satisfies the exact A08 room, screen, and class-code projection', async () => {
  const executed: string[] = [];
  const executor = createCoreGoal1DisplayConfigurationScenarioExecutor(
    () => harness().displays,
  );
  const report = await runCoreGoal1ContractSuite(
    coreGoal1FixtureCatalog,
    async (scenario, catalog) => {
      if (scenario.requiredBy.includes('C03')) {
        executed.push(scenario.scenarioId);
        return executor(scenario, catalog);
      }
      return { scenarioId: scenario.scenarioId, actual: scenario.expected };
    },
  );
  assert.equal(report.status, 'passed');
  assert.deepEqual(executed, ['core-goal1-room-screen-class-code']);
});

test('rotation invalidates old viewer sessions without affecting private operator access', async () => {
  const { configuration, access, displays } = harness();
  const screenId = coreGoal1FixtureCatalog.screens[0]!.screenId;
  const first = await displays.rotateClassCode(screenId);
  assert.equal(first.status, 'rotated');
  if (first.status !== 'rotated') return;
  const admitted = await displays.admitViewer(screenId, first.classCode);
  assert.equal(admitted.status, 'admitted');
  if (admitted.status !== 'admitted') return;
  assert.equal(
    await displays.validateViewerSession(screenId, admitted.sessionToken),
    true,
  );

  const shell = new CoreOperatorShellService(
    coreGoal1FixtureCatalog.workspace,
    configuration,
    displays,
  );
  assert.equal((await shell.page('displays')).state, 'ready');
  const second = await displays.rotateClassCode(screenId);
  assert.equal(second.status, 'rotated');
  assert.equal(
    await displays.validateViewerSession(screenId, admitted.sessionToken),
    false,
  );
  assert.equal((await shell.readiness()).ready, true);
  assert.equal((await shell.page('displays')).state, 'ready');

  const protectedState = await access.read(
    coreGoal1FixtureCatalog.workspace,
    screenId,
  );
  const protectedJson = JSON.stringify(protectedState);
  assert.equal(protectedJson.includes(first.classCode), false);
  assert.equal(protectedJson.includes(admitted.sessionToken), false);
  assert.equal(protectedState.verifier?.algorithm, 'scrypt-v1');
  assert.equal(protectedState.viewerSessions.length, 0);
});

test('display access cannot collide across same-ID self-hosted installations', async () => {
  const access = new InMemoryDisplayAccessRepository();
  const screenId = coreGoal1FixtureCatalog.screens[0]!.screenId;
  const foreignWorkspace = {
    contractVersion,
    kind: 'self-hosted-installation' as const,
    workspaceId: coreGoal1FixtureCatalog.workspace.workspaceId,
    installationId: scopeIdentifier('installation', 'installation-foreign'),
  };
  await access.transact(coreGoal1FixtureCatalog.workspace, screenId, () => ({
    result: undefined,
    state: {
      classCodeState: null,
      verifier: null,
      viewerSessions: [],
      admissionFailures: [],
    },
  }));
  assert.deepEqual(await access.read(foreignWorkspace, screenId), {
    classCodeState: null,
    verifier: null,
    viewerSessions: [],
    admissionFailures: [],
  });
});

test('viewer admission is screen-scoped and revoke atomically clears verifier and sessions', async () => {
  const { access, displays } = harness();
  const [north, south] = coreGoal1FixtureCatalog.screens;
  const rotated = await displays.rotateClassCode(north!.screenId);
  assert.equal(rotated.status, 'rotated');
  if (rotated.status !== 'rotated') return;
  assert.deepEqual(
    await displays.admitViewer(south!.screenId, rotated.classCode),
    { status: 'denied' },
  );
  const admitted = await displays.admitViewer(
    north!.screenId,
    rotated.classCode,
  );
  assert.equal(admitted.status, 'admitted');
  if (admitted.status !== 'admitted') return;
  assert.equal(await displays.revokeClassCode(north!.screenId), 'revoked');
  assert.equal(
    await displays.validateViewerSession(
      north!.screenId,
      admitted.sessionToken,
    ),
    false,
  );
  const state = await access.read(
    coreGoal1FixtureCatalog.workspace,
    north!.screenId,
  );
  assert.equal(state.classCodeState?.status, 'revoked');
  assert.equal(state.verifier, null);
  assert.deepEqual(state.viewerSessions, []);
});

test('viewer admission failures are uniform and bounded per screen', async () => {
  const { access, displays } = harness();
  const screenId = coreGoal1FixtureCatalog.screens[0]!.screenId;
  const rotated = await displays.rotateClassCode(screenId);
  assert.equal(rotated.status, 'rotated');
  for (let attempt = 0; attempt < 8; attempt += 1) {
    assert.deepEqual(await displays.admitViewer(screenId, 'wrong-code-0000'), {
      status: 'denied',
    });
  }
  const state = await access.read(coreGoal1FixtureCatalog.workspace, screenId);
  assert.equal(state.admissionFailures.length, 5);
  assert.equal(JSON.stringify(state).includes('wrong-code-0000'), false);
});

test('display draft controls preserve the active revision until later validation and activation', async () => {
  const { configuration, displays } = harness();
  const before = await configuration.read(coreGoal1FixtureCatalog.workspace);
  assert.equal(before.status, 'ready');
  const activeBefore =
    before.status === 'ready' ? before.state.activePointer?.revisionId : null;
  const result = await displays.saveDisplayDraft({
    timeZone: 'Asia/Ho_Chi_Minh',
    roomLabel: 'Synthetic East Lab',
    screenLabel: 'Synthetic East Wall',
  });
  assert.equal(result.status, 'saved');
  const after = await configuration.read(coreGoal1FixtureCatalog.workspace);
  assert.equal(after.status, 'ready');
  if (after.status !== 'ready') return;
  assert.equal(after.state.activePointer?.revisionId, activeBefore);
  assert.equal(
    after.state.drafts.at(-1)?.content.timePolicy.timeZone,
    'Asia/Ho_Chi_Minh',
  );
  assert.equal(after.state.drafts.at(-1)?.content.rooms.length, 3);
  assert.equal(after.state.drafts.at(-1)?.content.screens.length, 3);
});
