import assert from 'node:assert/strict';
import test from 'node:test';

import {
  contractVersion,
  configurationDigest,
  runCoreGoal1ContractSuite,
  scopeIdentifier,
  stateIdentifier,
  type AuditScope,
  type SaveConfigurationDraftRequest,
  type ConfigurationStateSnapshot,
  type EditableConfiguration,
} from '../../../src/contracts/v1/index.js';
import { createCoreGoal1ConfigurationScenarioExecutor } from '../../../src/application/configuration/core-goal1-configuration-adapter.js';
import { VersionedConfigurationService } from '../../../src/application/configuration/versioned-configuration-service.js';
import { InMemoryConfigurationStateRepository } from '../../../src/infrastructure/memory/configuration-state.js';
import { configurationAuditEventRetentionLimit } from '../../../src/ports/configuration-state.js';
import { coreGoal1FixtureCatalog } from '../../fixtures/core-goal1.js';

const catalog = coreGoal1FixtureCatalog;

function createService(state: ConfigurationStateSnapshot) {
  return new VersionedConfigurationService(
    new InMemoryConfigurationStateRepository([state]),
  );
}

function auditScope(suffix: string): AuditScope {
  return {
    contractVersion,
    workspaceKind: 'self-hosted-installation',
    workspaceId: catalog.workspace.workspaceId,
    installationId: catalog.workspace.installationId,
    actorId: scopeIdentifier('actor', 'actor-synthetic-c01-test'),
    actorKind: 'self-hosted-operator',
    capability: scopeIdentifier('capability', 'configuration.write'),
    authority: 'operator-reachability',
    targets: [
      { kind: 'workspace', workspaceId: catalog.workspace.workspaceId },
    ],
    operationId: scopeIdentifier(
      'operation',
      `operation-synthetic-c01-${suffix}`,
    ),
    correlationId: scopeIdentifier(
      'correlation',
      `correlation-synthetic-c01-${suffix}`,
    ),
  };
}

function saveCommand(
  suffix: string,
  content: EditableConfiguration,
): SaveConfigurationDraftRequest {
  const state = catalog.configurationStates.firstActivated;
  const draft = state.drafts[0]!;
  return {
    contractVersion,
    kind: 'save-draft',
    workspace: catalog.workspace,
    workspaceId: catalog.workspace.workspaceId,
    expectedStateVersion: state.stateVersion,
    auditScope: auditScope(suffix),
    draftId: draft.draftId,
    expectedDraftVersion: draft.draftVersion,
    content,
    savedAt: '2035-03-18T09:00:00Z',
  };
}

test('real C01 use-case adapter satisfies every exact A08 C01 scenario', async () => {
  const executed: string[] = [];
  const executor = createCoreGoal1ConfigurationScenarioExecutor((state) =>
    createService(state),
  );
  const report = await runCoreGoal1ContractSuite(catalog, async (scenario) => {
    if (scenario.requiredBy.includes('C01')) {
      executed.push(scenario.scenarioId);
      return executor(scenario, catalog);
    }
    return { scenarioId: scenario.scenarioId, actual: scenario.expected };
  });
  assert.equal(report.status, 'passed');
  assert.deepEqual(executed, [
    'core-goal1-save-draft',
    'core-goal1-create-preview',
    'core-goal1-activate-revision',
    'core-goal1-rollback-revision',
    'core-goal1-redacted-export',
    'core-goal1-recovery-preflight',
  ]);
});

test('stale and invalid edits preserve the exact last-known-good active configuration', async () => {
  const initial = catalog.configurationStates.rolledBack;
  const service = createService(initial);
  const stale = await service.execute({
    eventId: stateIdentifier('audit-event', 'audit-event-synthetic-stale'),
    command: {
      ...saveCommand('stale', structuredClone(initial.revisions[0]!.content)),
      expectedStateVersion: 0,
    },
  });
  assert.deepEqual(
    { status: stale.status, reason: 'reason' in stale ? stale.reason : null },
    { status: 'conflict', reason: 'state-version-changed' },
  );

  const originalContent = initial.revisions[0]!.content;
  const invalidContent: EditableConfiguration = {
    ...originalContent,
    screens: originalContent.screens.map((screen, index) =>
      index === 0
        ? {
            ...screen,
            roomId: scopeIdentifier('room', 'room-synthetic-missing'),
          }
        : screen,
    ),
  };
  const invalid = await service.execute({
    eventId: stateIdentifier('audit-event', 'audit-event-synthetic-invalid'),
    command: {
      ...saveCommand('invalid', invalidContent),
      expectedStateVersion: initial.stateVersion,
      expectedDraftVersion: initial.drafts[0]!.draftVersion,
    },
  });
  assert.deepEqual(
    {
      status: invalid.status,
      reason: 'reason' in invalid ? invalid.reason : null,
    },
    { status: 'rejected', reason: 'invalid-command' },
  );

  const current = await service.read(catalog.workspace);
  assert.equal(current.status, 'ready');
  if (current.status === 'ready') {
    assert.equal(
      configurationDigest(current.state),
      configurationDigest(initial),
    );
    assert.equal(
      current.state.activePointer?.revisionId,
      initial.activePointer?.revisionId,
    );
  }
});

test('simultaneous exact-version edits yield one commit and one conflict', async () => {
  const initial = catalog.configurationStates.firstActivated;
  const repository = new InMemoryConfigurationStateRepository([initial]);
  const service = new VersionedConfigurationService(repository);
  const source = initial.revisions[0]!.content;
  const left: EditableConfiguration = {
    ...source,
    screens: source.screens.map((screen, index) =>
      index === 0 ? { ...screen, label: 'Synthetic Concurrent Left' } : screen,
    ),
  };
  const right: EditableConfiguration = {
    ...source,
    screens: source.screens.map((screen, index) =>
      index === 0 ? { ...screen, label: 'Synthetic Concurrent Right' } : screen,
    ),
  };

  const results = await Promise.all([
    service.execute({
      eventId: stateIdentifier('audit-event', 'audit-event-synthetic-left'),
      command: saveCommand('left', left),
    }),
    service.execute({
      eventId: stateIdentifier('audit-event', 'audit-event-synthetic-right'),
      command: saveCommand('right', right),
    }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [
    'applied',
    'conflict',
  ]);
  const current = await repository.read(catalog.workspace);
  assert.equal(current?.stateVersion, initial.stateVersion + 1);
  assert.equal(
    current?.activePointer?.revisionId,
    initial.activePointer?.revisionId,
  );
});

test('preview and failed recovery preflight are mutation-free', async () => {
  const initial = catalog.configurationStates.secondActivated;
  const repository = new InMemoryConfigurationStateRepository([initial]);
  const service = new VersionedConfigurationService(repository);
  const preview = await service.createPreview({
    eventId: stateIdentifier('audit-event', 'audit-event-synthetic-preview'),
    request: {
      contractVersion,
      workspace: catalog.workspace,
      workspaceId: catalog.workspace.workspaceId,
      expectedStateVersion: initial.stateVersion,
      previewId: catalog.preview.previewId,
      basis: catalog.preview.basis,
      targets: catalog.preview.targets,
      status: 'ready',
      diagnosticCodes: [],
      generatedAt: catalog.preview.generatedAt,
      expiresAt: catalog.preview.expiresAt,
      auditScope: auditScope('preview'),
    },
  });
  assert.equal(preview.status, 'created');

  const recovery = await service.preflightRecovery({
    workspace: catalog.workspace,
    expectedStateVersion: initial.stateVersion,
    manifest: catalog.recoveryBackup,
    observedChecksum: `sha256:${'f'.repeat(64)}` as never,
    occurredAt: '2035-03-18T09:01:00Z',
    auditScope: auditScope('recovery'),
    eventId: stateIdentifier('audit-event', 'audit-event-synthetic-recovery'),
  });
  assert.deepEqual(
    {
      status: recovery.status,
      reason: 'reason' in recovery ? recovery.reason : null,
    },
    { status: 'rejected', reason: 'checksum-mismatch' },
  );
  const current = await repository.read(catalog.workspace);
  assert.equal(configurationDigest(current), configurationDigest(initial));
});

test('effective reads redact connected protected references and detach results', async () => {
  const originalState = catalog.configurationStates.rolledBack;
  const activeIndex = originalState.revisions.findIndex(
    (revision) =>
      revision.revisionId === originalState.activePointer?.revisionId,
  );
  const active = originalState.revisions[activeIndex]!;
  const content: EditableConfiguration = {
    ...active.content,
    sources: active.content.sources.map((source, index) =>
      index === 0
        ? {
            workspaceId: source.workspaceId,
            sourceId: source.sourceId,
            sourceKind: source.sourceKind,
            enabled: source.enabled,
            definitionReference: source.definitionReference,
            mode: 'connected-account',
            connectionReference: {
              kind: 'protected-secret-reference',
              referenceId: stateIdentifier(
                'secret-reference',
                'secret-reference-synthetic-effective-read',
              ),
            },
          }
        : source,
    ),
  };
  const state: ConfigurationStateSnapshot = {
    ...originalState,
    revisions: originalState.revisions.map((revision, index) =>
      index === activeIndex
        ? {
            ...active,
            content,
            contentChecksum: configurationDigest(content),
          }
        : revision,
    ),
  };
  const repository = new InMemoryConfigurationStateRepository([state]);
  const service = new VersionedConfigurationService(repository);
  const result = await service.readEffectiveConfiguration(catalog.workspace);
  assert.equal(result.status, 'ready');
  if (result.status === 'ready') {
    const json = JSON.stringify(result.configuration);
    assert.equal(json.includes('connectionReference'), false);
    assert.equal(json.includes('secret-reference'), false);
    assert.equal(json.includes('connectionRequired'), true);
    (result.configuration.rooms as unknown as { label: string }[])[0]!.label =
      'mutated';
  }
  const reread = await service.readEffectiveConfiguration(catalog.workspace);
  assert.equal(
    reread.status === 'ready' && reread.configuration.rooms[0]?.label,
    'Synthetic North Studio',
  );
});

test('audit events stay finite, bounded, redacted, and include conflicts', async () => {
  const initial = catalog.configurationStates.firstActivated;
  const repository = new InMemoryConfigurationStateRepository([initial]);
  const service = new VersionedConfigurationService(repository);
  for (
    let index = 0;
    index < configurationAuditEventRetentionLimit + 4;
    index += 1
  ) {
    const result = await service.execute({
      eventId: stateIdentifier(
        'audit-event',
        `audit-event-synthetic-bounded-${index}`,
      ),
      command: {
        ...saveCommand(
          `bounded-${index}`,
          structuredClone(initial.revisions[0]!.content),
        ),
        expectedStateVersion: 0,
      },
    });
    assert.equal(result.status, 'conflict');
  }
  const events = await repository.readAuditEvents(catalog.workspace);
  assert.equal(events.length, configurationAuditEventRetentionLimit);
  assert.equal(events[0]?.eventId, 'audit-event-synthetic-bounded-4');
  assert.equal(
    events.every((event) => event.outcome === 'conflict'),
    true,
  );
  assert.equal(
    /(?:token|password|cookie|classCode|connectionReference)/u.test(
      JSON.stringify(events),
    ),
    false,
  );
});
