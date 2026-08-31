import assert from 'node:assert/strict';
import test from 'node:test';

import {
  coreGoal1AcceptanceTasks,
  coreGoal1FixtureContractVersion,
  evaluatePortableImport,
  evaluateProtectedRestore,
  isConfigurationStateSnapshot,
  isCoreGoal1FixtureCatalog,
  isPortableConfigurationExport,
  runCoreGoal1ContractSuite,
  scopeIdentifier,
  type CoreGoal1FixtureCatalog,
} from '../../../src/contracts/v1/index.js';
import {
  coreGoal1ExpectedConfigurationChecksum,
  coreGoal1FixtureCatalog,
} from '../../fixtures/core-goal1.js';

function clone<Value>(value: Value): Value {
  return structuredClone(value);
}

test('A08 catalog is versioned, self-hosted, complete, and mapped to every Goal 1 acceptance task', () => {
  assert.equal(isCoreGoal1FixtureCatalog(coreGoal1FixtureCatalog), true);
  assert.equal(
    coreGoal1FixtureCatalog.fixtureContractVersion,
    coreGoal1FixtureContractVersion,
  );
  assert.equal(
    coreGoal1FixtureCatalog.workspace.kind,
    'self-hosted-installation',
  );
  assert.equal(coreGoal1FixtureCatalog.rooms.length, 2);
  assert.equal(coreGoal1FixtureCatalog.screens.length, 2);
  assert.equal(coreGoal1FixtureCatalog.courses.length, 2);
  assert.equal(coreGoal1FixtureCatalog.manualSchedule.meetings.length, 2);
  assert.equal(coreGoal1FixtureCatalog.vocabulary.length, 2);
  assert.equal(coreGoal1FixtureCatalog.media.length, 2);
  assert.equal(coreGoal1FixtureCatalog.plannedFrames.length, 4);
  for (const task of coreGoal1AcceptanceTasks) {
    assert.equal(
      coreGoal1FixtureCatalog.expectedScenarios.some((scenario) =>
        scenario.requiredBy.includes(task),
      ),
      true,
      `${task} lacks an executable expected result`,
    );
  }
});

test('configuration fixtures prove draft, two activations, preview isolation, rollback, export, and recovery', () => {
  const { configurationStates } = coreGoal1FixtureCatalog;
  assert.deepEqual(
    Object.values(configurationStates).map((state) => state.stateVersion),
    [0, 3, 6, 7],
  );
  for (const state of Object.values(configurationStates)) {
    assert.equal(isConfigurationStateSnapshot(state), true);
  }
  assert.equal(
    configurationStates.firstActivated.activePointer?.revisionId,
    'revision-synthetic-core-goal1-001',
  );
  assert.equal(
    configurationStates.secondActivated.activePointer?.revisionId,
    'revision-synthetic-core-goal1-002',
  );
  assert.equal(
    configurationStates.rolledBack.activePointer?.revisionId,
    'revision-synthetic-core-goal1-001',
  );
  assert.equal(coreGoal1FixtureCatalog.preview.status, 'ready');
  assert.equal(
    coreGoal1FixtureCatalog.preview.basis.kind === 'revision' &&
      coreGoal1FixtureCatalog.preview.basis.revisionId,
    'revision-synthetic-core-goal1-002',
  );
  assert.equal(
    isPortableConfigurationExport(coreGoal1FixtureCatalog.portableExport),
    true,
  );
  assert.equal(
    coreGoal1FixtureCatalog.portableExport.manifest.contentChecksum,
    coreGoal1ExpectedConfigurationChecksum,
  );
  assert.deepEqual(
    evaluatePortableImport(
      coreGoal1FixtureCatalog.workspace,
      coreGoal1FixtureCatalog.portableExport,
    ),
    {
      status: 'accepted',
      workspaceId: coreGoal1FixtureCatalog.workspace.workspaceId,
    },
  );
  assert.deepEqual(
    evaluateProtectedRestore(
      coreGoal1FixtureCatalog.workspace,
      coreGoal1FixtureCatalog.recoveryBackup,
      coreGoal1FixtureCatalog.recoveryBackup.artifact.checksum,
    ),
    {
      status: 'accepted',
      workspaceId: coreGoal1FixtureCatalog.workspace.workspaceId,
    },
  );
});

test('class-code and portable fixtures expose references and redacted configuration, never a plaintext code or verifier', () => {
  assert.deepEqual(
    coreGoal1FixtureCatalog.screens.map(
      (screen) => screen.classCodeState.status,
    ),
    ['active', 'revoked'],
  );
  const exportJson = JSON.stringify(coreGoal1FixtureCatalog.portableExport);
  assert.equal(exportJson.includes('classCode'), true);
  assert.equal(exportJson.includes('classCodeStateId'), true);
  assert.equal(exportJson.includes('verifierReference'), false);
  assert.equal(exportJson.includes('secret-reference'), false);
  assert.equal(exportJson.includes('connectionReference'), false);
});

test('contract-suite runner accepts exact normalized outcomes without echoing fixture payloads', async () => {
  const report = await runCoreGoal1ContractSuite(
    coreGoal1FixtureCatalog,
    (scenario) => ({
      scenarioId: scenario.scenarioId,
      actual: scenario.expected,
    }),
  );
  assert.equal(report.status, 'passed');
  assert.equal(
    report.results.length,
    coreGoal1FixtureCatalog.expectedScenarios.length,
  );
  assert.equal(
    report.results.every(
      (result) => result.status === 'passed' && result.diagnostics.length === 0,
    ),
    true,
  );
  assert.equal(
    JSON.stringify(report).includes('Synthetic North Studio'),
    false,
  );
});

test('contract-suite runner reports exact-result, envelope, JSON, executor, and privacy failures finitely', async () => {
  const report = await runCoreGoal1ContractSuite(
    coreGoal1FixtureCatalog,
    (scenario, _catalog) => {
      if (scenario.scenarioId === 'core-goal1-save-draft') {
        return { scenarioId: scenario.scenarioId, actual: { status: 'wrong' } };
      }
      if (scenario.scenarioId === 'core-goal1-create-preview') {
        return {
          scenarioId: 'core-goal1-wrong-id',
          actual: scenario.expected,
        };
      }
      if (scenario.scenarioId === 'core-goal1-activate-revision') {
        return {
          scenarioId: scenario.scenarioId,
          actual: {
            ...(scenario.expected as object),
            accessToken: 'synthetic',
          },
        };
      }
      if (scenario.scenarioId === 'core-goal1-rollback-revision') {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        return {
          scenarioId: scenario.scenarioId,
          actual: circular,
        };
      }
      if (scenario.scenarioId === 'core-goal1-private-operator-shell') {
        throw new Error('sensitive implementation detail');
      }
      return { scenarioId: scenario.scenarioId, actual: scenario.expected };
    },
  );
  assert.equal(report.status, 'failed');
  assert.deepEqual(report.results.slice(0, 5), [
    {
      scenarioId: 'core-goal1-save-draft',
      status: 'failed',
      diagnostics: ['expected-result-mismatch'],
    },
    {
      scenarioId: 'core-goal1-create-preview',
      status: 'failed',
      diagnostics: ['invalid-observation-envelope'],
    },
    {
      scenarioId: 'core-goal1-activate-revision',
      status: 'failed',
      diagnostics: ['expected-result-mismatch', 'privacy-rule-violation'],
    },
    {
      scenarioId: 'core-goal1-rollback-revision',
      status: 'failed',
      diagnostics: ['non-json-observation'],
    },
    {
      scenarioId: 'core-goal1-private-operator-shell',
      status: 'failed',
      diagnostics: ['executor-failed'],
    },
  ]);
  assert.equal(
    JSON.stringify(report).includes('sensitive implementation detail'),
    false,
  );
});

test('catalog guard rejects hosted, connected, non-synthetic, leaking, cross-scope, and incomplete variants', () => {
  const variants: unknown[] = [];

  const hosted = clone(coreGoal1FixtureCatalog) as unknown as Record<
    string,
    unknown
  >;
  hosted.workspace = {
    contractVersion: '1.0.0',
    kind: 'hosted-organization',
    workspaceId: 'workspace-synthetic-hosted',
    organizationId: 'organization-synthetic-hosted',
  };
  variants.push(hosted);

  const connected = clone(coreGoal1FixtureCatalog);
  const mutableSources = connected.configurationStates.rolledBack.revisions[0]!
    .content.sources as unknown as Array<Record<string, unknown>>;
  mutableSources[0] = {
    ...mutableSources[0]!,
    mode: 'connected-account',
    connectionReference: {
      kind: 'protected-secret-reference',
      referenceId: 'secret-reference-synthetic-connected' as never,
    },
  };
  variants.push(connected);

  const realLookingId = clone(coreGoal1FixtureCatalog);
  const mutableRooms = realLookingId.rooms as unknown as Array<
    Record<string, unknown>
  >;
  mutableRooms[0] = {
    ...mutableRooms[0]!,
    roomId: scopeIdentifier('room', 'room-production-north'),
  };
  variants.push(realLookingId);

  const leaking = clone(coreGoal1FixtureCatalog) as unknown as Record<
    string,
    unknown
  >;
  leaking.accessToken = 'not-retained';
  variants.push(leaking);

  const crossScope = clone(coreGoal1FixtureCatalog);
  const mutableScreens = crossScope.screens as unknown as Array<
    Record<string, unknown>
  >;
  mutableScreens[0] = {
    ...mutableScreens[0]!,
    classCodeState: {
      ...crossScope.screens[0]!.classCodeState,
      workspaceId: scopeIdentifier('workspace', 'workspace-synthetic-foreign'),
    },
  };
  variants.push(crossScope);

  const incomplete = clone(coreGoal1FixtureCatalog);
  (
    incomplete as unknown as { expectedScenarios: unknown[] }
  ).expectedScenarios = incomplete.expectedScenarios.filter(
    (scenario) => !scenario.requiredBy.includes('C09'),
  );
  variants.push(incomplete);

  const weakenedPrivacy = clone(coreGoal1FixtureCatalog);
  (
    weakenedPrivacy.privacyRules as unknown as { forbiddenKeys: string[] }
  ).forbiddenKeys = [];
  variants.push(weakenedPrivacy);

  const augmentedRoom = clone(coreGoal1FixtureCatalog);
  (
    augmentedRoom.rooms[0] as unknown as Record<string, unknown>
  ).unversionedField = true;
  variants.push(augmentedRoom);

  for (const variant of variants) {
    assert.equal(isCoreGoal1FixtureCatalog(variant), false);
  }
});

test('runner isolates the authoritative catalog and scenario from executor mutation', async () => {
  const originalRoom = coreGoal1FixtureCatalog.rooms[0]!.label;
  const originalExpected = clone(
    coreGoal1FixtureCatalog.expectedScenarios[0]!.expected,
  );
  const report = await runCoreGoal1ContractSuite(
    coreGoal1FixtureCatalog,
    (scenario, catalog) => {
      const expected = clone(scenario.expected);
      (catalog.rooms as unknown as Array<{ label: string }>)[0]!.label =
        'Changed';
      (scenario as { expected: unknown }).expected = { status: 'Changed' };
      return { scenarioId: scenario.scenarioId, actual: expected };
    },
  );
  assert.equal(report.status, 'passed');
  assert.equal(coreGoal1FixtureCatalog.rooms[0]!.label, originalRoom);
  assert.deepEqual(
    coreGoal1FixtureCatalog.expectedScenarios[0]!.expected,
    originalExpected,
  );
});

test('contract suite and catalog remain Core-only and carry no hosted/commercial workflow operation', () => {
  const operations = coreGoal1FixtureCatalog.expectedScenarios.map(
    (scenario) => scenario.operation,
  );
  assert.equal(
    operations.some((operation) =>
      /account|auth|billing|commercial|oauth|organization|provider-enrollment/iu.test(
        operation,
      ),
    ),
    false,
  );
  assert.deepEqual(coreGoal1FixtureCatalog.privacyRules.workspaceKinds, [
    'self-hosted-installation',
  ]);
  assert.deepEqual(coreGoal1FixtureCatalog.privacyRules.sourceModes, [
    'application-managed',
  ]);
});
