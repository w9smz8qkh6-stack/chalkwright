import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assessForwardMigration,
  canonicalPortableExportJson,
  configurationDigest,
  configurationStateRecordLimits,
  contractVersion,
  createConfigurationPreview,
  createPortableConfigurationExport,
  evaluatePortableImport,
  evaluateProtectedRestore,
  finalizeForwardMigration,
  forwardMigrationBundleChecksum,
  isClassCodeState,
  isConfigurationAuditEvent,
  isConfigurationStateSnapshot,
  isConfigurationPreviewSnapshot,
  isDurableMigrationState,
  isEditableConfiguration,
  isForwardMigrationBundle,
  isPortableConfigurationExport,
  isProtectedBackupManifest,
  migrationRecordLimits,
  planReleaseRollback,
  scopeIdentifier,
  stateIdentifier,
  transitionConfigurationState,
  viewerClassCodePolicy,
  type ConfigurationDraftRecord,
  type ConfigurationRevisionRecord,
  type ConfigurationRevisionId,
  type ConfigurationStateSnapshot,
  type CoreShellReleasePairing,
  type DurableMigrationState,
  type ForwardMigrationBundle,
  type PortableConfigurationExport,
  type ProtectedBackupManifest,
  type ProtectedSecretReference,
  type ReleaseCompatibilityManifest,
  type ResourceId,
  type RoomConfigurationRecord,
  type SaveConfigurationDraftRequest,
  type ScreenConfigurationRecord,
  type SelfHostedWorkspace,
  type HostedWorkspace,
  type Workspace,
} from '../../../src/contracts/v1/index.js';
import {
  activeSelfHostedState,
  compatiblePredecessorManifest,
  configurationAuditScope,
  configurationFor,
  configurationStateFixtureCatalog,
  hostedOrganizationState,
  hostedWorkspace,
  migratedStateV2,
  migrationStateV1,
  nextReleaseCompatibility,
  portableConfigurationExport,
  preMigrationProtectedBackup,
  previousReleaseCompatibility,
  selfHostedWorkspace,
  validForwardMigrationBundle,
} from '../../fixtures/configuration-state.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Value extends true> = Value;

const secretReferenceIsNotAResourceId: Assert<
  Equal<Equal<ProtectedSecretReference, ResourceId>, false>
> = true;
const exportIsNotProtectedBackup: Assert<
  Equal<Equal<PortableConfigurationExport, ProtectedBackupManifest>, false>
> = true;
const roomRecordRequiresWorkspace: Assert<
  Equal<
    'workspaceId' extends keyof RoomConfigurationRecord ? true : false,
    true
  >
> = true;
const screenRecordRequiresWorkspaceAndRoom: Assert<
  Equal<
    'workspaceId' | 'roomId' extends keyof ScreenConfigurationRecord
      ? true
      : false,
    true
  >
> = true;
const revisionIsNotDraftRequest: Assert<
  Equal<
    Equal<ConfigurationRevisionRecord, SaveConfigurationDraftRequest>,
    false
  >
> = true;
const revisionContentIsReadonly: Assert<
  Equal<
    Pick<ConfigurationRevisionRecord, 'content'>,
    Readonly<Pick<ConfigurationRevisionRecord, 'content'>>
  >
> = true;
const migrationBundleHasNoDownTarget: Assert<
  Equal<
    'downMigration' extends keyof ForwardMigrationBundle ? true : false,
    false
  >
> = true;

function clone<Value>(value: Value): Value {
  return structuredClone(value);
}

const sameIdDifferentInstallation: SelfHostedWorkspace = {
  ...selfHostedWorkspace,
  installationId: scopeIdentifier(
    'installation',
    'installation-synthetic-secondary',
  ),
};

const sameIdDifferentOrganization: HostedWorkspace = {
  ...hostedWorkspace,
  organizationId: scopeIdentifier(
    'organization',
    'organization-synthetic-secondary',
  ),
};

const sameIdCrossKind: HostedWorkspace = {
  contractVersion,
  kind: 'hosted-organization',
  workspaceId: selfHostedWorkspace.workspaceId,
  organizationId: scopeIdentifier(
    'organization',
    'organization-synthetic-cross-kind',
  ),
};

function releasePairFor(
  workspace: Workspace,
  version: string,
): CoreShellReleasePairing {
  return workspace.kind === 'self-hosted-installation'
    ? { shellKind: 'self-hosted', coreVersion: version, shellVersion: version }
    : { shellKind: 'hosted', coreVersion: version, shellVersion: version };
}

function compatibilityFor(
  workspace: Workspace,
  version: string,
  maximumReadableVersion: number,
): ReleaseCompatibilityManifest {
  return {
    contractVersion,
    kind: 'release-compatibility',
    release: releasePairFor(workspace, version),
    artifactChecksum: configurationDigest({ workspace, version }),
    stateSchema: { minimumReadableVersion: 1, maximumReadableVersion },
  };
}

function migrationStateFor(
  workspace: Workspace,
  schemaVersion: 1 | 2 = 1,
): DurableMigrationState {
  const source = schemaVersion === 1 ? migrationStateV1 : migratedStateV2;
  return {
    ...source,
    workspace,
    release: releasePairFor(workspace, `0.${schemaVersion}.0`),
  };
}

function migrationBundleFor(workspace: Workspace): ForwardMigrationBundle {
  const body: Omit<ForwardMigrationBundle, 'bundleChecksum'> = {
    contractVersion,
    kind: 'forward-migration-bundle',
    workspace,
    fromRelease: compatibilityFor(workspace, '0.1.0', 1),
    toRelease: compatibilityFor(workspace, '0.2.0', 2),
    expectedHistory: migrationStateV1.history.map(
      ({ version, name, checksum }) => ({ version, name, checksum }),
    ),
    steps: validForwardMigrationBundle.steps.map((step) => ({ ...step })),
  };
  return { ...body, bundleChecksum: forwardMigrationBundleChecksum(body) };
}

function backupFor(
  workspace: Workspace,
  version = '0.1.0',
): ProtectedBackupManifest {
  return {
    ...preMigrationProtectedBackup,
    workspace,
    release: releasePairFor(workspace, version),
  };
}

function stateWithConfigurationWorkspace(
  state: ConfigurationStateSnapshot,
  workspace: Workspace,
): ConfigurationStateSnapshot {
  return {
    ...state,
    drafts: state.drafts.map((draft) => ({
      ...draft,
      content: { ...draft.content, workspace },
    })),
    revisions: state.revisions.map((revision) => {
      const content = { ...revision.content, workspace };
      return {
        ...revision,
        content,
        contentChecksum: configurationDigest(content),
      };
    }),
  };
}

test('keeps compile-time configuration, secret, export, and migration boundaries distinct', () => {
  assert.equal(secretReferenceIsNotAResourceId, true);
  assert.equal(exportIsNotProtectedBackup, true);
  assert.equal(roomRecordRequiresWorkspace, true);
  assert.equal(screenRecordRequiresWorkspaceAndRoom, true);
  assert.equal(revisionIsNotDraftRequest, true);
  assert.equal(revisionContentIsReadonly, true);
  assert.equal(migrationBundleHasNoDownTarget, true);
});

test('provides valid fresh self-hosted and hosted organization fixtures', () => {
  assert.equal(
    isConfigurationStateSnapshot(
      configurationStateFixtureCatalog.freshSelfHostedState,
    ),
    true,
  );
  assert.equal(isConfigurationStateSnapshot(hostedOrganizationState), true);
  assert.equal(hostedOrganizationState.workspace.kind, 'hosted-organization');
  assert.equal(
    hostedOrganizationState.workspace.organizationId,
    'organization-synthetic-school',
  );
  assert.equal(
    hostedOrganizationState.revisions.filter(
      (revision) => revision.lifecycle === 'active',
    ).length,
    1,
  );
});

test('uses optimistic concurrency and preserves the active last-known-good revision', () => {
  const currentRevisionId = activeSelfHostedState.activePointer!.revisionId;
  const stale = transitionConfigurationState(activeSelfHostedState, {
    contractVersion,
    kind: 'save-draft',
    workspace: selfHostedWorkspace,
    workspaceId: selfHostedWorkspace.workspaceId,
    expectedStateVersion: activeSelfHostedState.stateVersion - 1,
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'stale-save-synthetic-draft',
    ),
    draftId: activeSelfHostedState.drafts[0]!.draftId,
    expectedDraftVersion: activeSelfHostedState.drafts[0]!.draftVersion,
    content: configurationFor(selfHostedWorkspace, 'Stale Screen'),
    savedAt: '2035-02-12T08:03:00Z',
  });
  assert.equal(stale.status, 'conflict');
  assert.equal(stale.state, activeSelfHostedState);
  assert.equal(stale.state.activePointer!.revisionId, currentRevisionId);

  const invalidActivation = transitionConfigurationState(
    activeSelfHostedState,
    {
      contractVersion,
      kind: 'activate-revision',
      workspace: selfHostedWorkspace,
      workspaceId: selfHostedWorkspace.workspaceId,
      expectedStateVersion: activeSelfHostedState.stateVersion,
      auditScope: configurationAuditScope(
        selfHostedWorkspace,
        'repeat-activate-synthetic-revision',
      ),
      expectedActiveRevisionId: currentRevisionId,
      revisionId: currentRevisionId,
      selectedAt: '2035-02-12T08:04:00Z',
    },
  );
  assert.equal(invalidActivation.status, 'rejected');
  assert.equal(invalidActivation.state, activeSelfHostedState);
  assert.equal(
    invalidActivation.state.activePointer!.revisionId,
    currentRevisionId,
  );
});

test('activates a second immutable revision and rolls back only with exact evidence', () => {
  const draft = activeSelfHostedState.drafts[0]!;
  const saved = transitionConfigurationState(activeSelfHostedState, {
    contractVersion,
    kind: 'save-draft',
    workspace: selfHostedWorkspace,
    workspaceId: selfHostedWorkspace.workspaceId,
    expectedStateVersion: activeSelfHostedState.stateVersion,
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'save-second-synthetic-draft',
    ),
    draftId: draft.draftId,
    expectedDraftVersion: draft.draftVersion,
    content: configurationFor(selfHostedWorkspace, 'Updated Synthetic Screen'),
    savedAt: '2035-02-12T08:05:00Z',
  });
  assert.equal(saved.status, 'applied');
  if (saved.status !== 'applied') return;

  const revisionTwo = stateIdentifier(
    'configuration-revision',
    'revision-synthetic-002',
  );
  const validated = transitionConfigurationState(saved.state, {
    contractVersion,
    kind: 'validate-draft',
    workspace: selfHostedWorkspace,
    workspaceId: selfHostedWorkspace.workspaceId,
    expectedStateVersion: saved.state.stateVersion,
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'validate-second-synthetic-draft',
    ),
    draftId: draft.draftId,
    expectedDraftVersion: 2,
    revisionId: revisionTwo,
    validatedAt: '2035-02-12T08:06:00Z',
  });
  assert.equal(validated.status, 'applied');
  if (validated.status !== 'applied') return;

  const revisionOne = activeSelfHostedState.activePointer!.revisionId;
  const activated = transitionConfigurationState(validated.state, {
    contractVersion,
    kind: 'activate-revision',
    workspace: selfHostedWorkspace,
    workspaceId: selfHostedWorkspace.workspaceId,
    expectedStateVersion: validated.state.stateVersion,
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'activate-second-synthetic-revision',
    ),
    expectedActiveRevisionId: revisionOne,
    revisionId: revisionTwo,
    selectedAt: '2035-02-12T08:07:00Z',
  });
  assert.equal(activated.status, 'applied');
  if (activated.status !== 'applied') return;
  assert.equal(activated.state.activePointer!.revisionId, revisionTwo);
  assert.equal(
    activated.state.revisions[0]!.contentChecksum,
    activeSelfHostedState.revisions[0]!.contentChecksum,
  );

  const rollback = transitionConfigurationState(activated.state, {
    contractVersion,
    kind: 'rollback-revision',
    workspace: selfHostedWorkspace,
    workspaceId: selfHostedWorkspace.workspaceId,
    expectedStateVersion: activated.state.stateVersion,
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'rollback-synthetic-revision',
    ),
    expectedActiveRevisionId: revisionTwo,
    revisionId: revisionOne,
    selectedAt: '2035-02-12T08:08:00Z',
  });
  assert.equal(rollback.status, 'applied');
  if (rollback.status !== 'applied') return;
  assert.equal(rollback.state.activePointer!.revisionId, revisionOne);
  assert.equal(
    rollback.state.revisions.find(
      (revision) => revision.revisionId === revisionTwo,
    )!.lifecycle,
    'rolled-back',
  );
});

test('creates an exact preview without mutating configuration state', () => {
  const revision = activeSelfHostedState.revisions[0]!;
  const result = createConfigurationPreview(activeSelfHostedState, {
    contractVersion,
    workspace: selfHostedWorkspace,
    workspaceId: selfHostedWorkspace.workspaceId,
    expectedStateVersion: activeSelfHostedState.stateVersion,
    previewId: stateIdentifier('preview', 'preview-synthetic-001'),
    basis: {
      kind: 'revision',
      revisionId: revision.revisionId,
      contentChecksum: revision.contentChecksum,
    },
    targets: [
      {
        kind: 'screen',
        workspaceId: selfHostedWorkspace.workspaceId,
        roomId: revision.content.rooms[0]!.roomId,
        screenId: revision.content.screens[0]!.screenId,
      },
    ],
    status: 'ready',
    diagnosticCodes: [],
    generatedAt: '2035-02-12T08:10:00Z',
    expiresAt: '2035-02-12T08:20:00Z',
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'preview-synthetic-revision',
    ),
  });
  assert.equal(result.status, 'created');
  if (result.status !== 'created') return;
  assert.equal(result.state, activeSelfHostedState);
  assert.equal(result.snapshot.basis.contentChecksum, revision.contentChecksum);
  assert.equal('configuration' in result.snapshot, false);
});

test('detaches admitted state, preview, export, migration, and rollback outputs from caller aliases', () => {
  const sourceConfiguration = clone(configurationFor(selfHostedWorkspace));
  const saveCommand: SaveConfigurationDraftRequest = {
    contractVersion,
    kind: 'save-draft',
    workspace: selfHostedWorkspace,
    workspaceId: selfHostedWorkspace.workspaceId,
    expectedStateVersion: 0,
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'detached-save-synthetic-draft',
    ),
    draftId: stateIdentifier('configuration-draft', 'draft-detached-synthetic'),
    expectedDraftVersion: null,
    content: sourceConfiguration,
    savedAt: '2035-02-12T08:30:00Z',
  };
  const saved = transitionConfigurationState(
    configurationStateFixtureCatalog.freshSelfHostedState,
    saveCommand,
  );
  assert.equal(saved.status, 'applied');
  if (saved.status !== 'applied') return;
  const savedLabel = saved.state.drafts[0]!.content.rooms[0]!.label;
  (sourceConfiguration.rooms[0] as { label: string }).label =
    'Caller-mutated label';
  assert.equal(saved.state.drafts[0]!.content.rooms[0]!.label, savedLabel);

  const validated = transitionConfigurationState(saved.state, {
    contractVersion,
    kind: 'validate-draft',
    workspace: selfHostedWorkspace,
    workspaceId: selfHostedWorkspace.workspaceId,
    expectedStateVersion: saved.state.stateVersion,
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'detached-validate-synthetic-draft',
    ),
    draftId: saved.state.drafts[0]!.draftId,
    expectedDraftVersion: saved.state.drafts[0]!.draftVersion,
    revisionId: stateIdentifier(
      'configuration-revision',
      'revision-detached-synthetic',
    ),
    validatedAt: '2035-02-12T08:31:00Z',
  });
  assert.equal(validated.status, 'applied');
  if (validated.status !== 'applied') return;
  (saved.state.drafts[0]!.content.rooms[0] as { label: string }).label =
    'Prior-state mutation';
  const detachedRevision = validated.state.revisions[0]!;
  assert.equal(detachedRevision.content.rooms[0]!.label, savedLabel);
  assert.equal(
    detachedRevision.contentChecksum,
    configurationDigest(detachedRevision.content),
  );
  assert.equal(isConfigurationStateSnapshot(validated.state), true);

  const previewRequest = {
    contractVersion,
    workspace: clone(selfHostedWorkspace),
    workspaceId: selfHostedWorkspace.workspaceId,
    expectedStateVersion: activeSelfHostedState.stateVersion,
    previewId: stateIdentifier('preview', 'preview-detached-synthetic'),
    basis: {
      kind: 'revision' as const,
      revisionId: activeSelfHostedState.revisions[0]!.revisionId,
      contentChecksum: activeSelfHostedState.revisions[0]!.contentChecksum,
    },
    targets: [
      {
        kind: 'workspace' as const,
        workspaceId: selfHostedWorkspace.workspaceId,
      },
    ] as [
      {
        kind: 'workspace';
        workspaceId: typeof selfHostedWorkspace.workspaceId;
      },
    ],
    status: 'ready' as const,
    diagnosticCodes: [] as string[],
    generatedAt: '2035-02-12T08:32:00Z' as const,
    expiresAt: '2035-02-12T08:42:00Z' as const,
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'detached-preview-synthetic',
    ),
  };
  const preview = createConfigurationPreview(
    activeSelfHostedState,
    previewRequest,
  );
  assert.equal(preview.status, 'created');
  if (preview.status !== 'created') return;
  previewRequest.targets[0]!.workspaceId = hostedWorkspace.workspaceId;
  (
    previewRequest.workspace as {
      installationId: typeof selfHostedWorkspace.installationId;
    }
  ).installationId = sameIdDifferentInstallation.installationId!;
  assert.equal(
    preview.snapshot.targets[0]!.workspaceId,
    selfHostedWorkspace.workspaceId,
  );
  assert.equal(isConfigurationPreviewSnapshot(preview.snapshot), true);

  const exportSource = clone(configurationFor(selfHostedWorkspace));
  const detachedExport = createPortableConfigurationExport({
    exportId: stateIdentifier(
      'portable-export',
      'portable-export-detached-synthetic',
    ),
    revisionId: activeSelfHostedState.revisions[0]!.revisionId,
    configuration: exportSource,
    createdAt: '2035-02-12T08:33:00Z',
  });
  const exportBytes = canonicalPortableExportJson(detachedExport);
  (exportSource.rooms[0] as { label: string }).label =
    'Caller-mutated export label';
  assert.equal(canonicalPortableExportJson(detachedExport), exportBytes);
  assert.equal(isPortableConfigurationExport(detachedExport), true);

  const bundle = migrationBundleFor(selfHostedWorkspace);
  const assessment = assessForwardMigration(migrationStateV1, bundle);
  assert.equal(assessment.status, 'ready');
  if (assessment.status !== 'ready') return;
  const plannedStepName = assessment.plan.steps[0]!.name;
  (bundle.steps[0] as { name: string }).name = 'caller-mutated-step';
  assert.equal(assessment.plan.steps[0]!.name, plannedStepName);
  const migrated = finalizeForwardMigration(
    migrationStateV1,
    assessment,
    '2035-02-12T08:34:00Z',
    'commit',
  );
  assert.equal(migrated.status, 'applied');
  if (migrated.status !== 'applied') return;
  (assessment.plan.steps[0] as { name: string }).name =
    'post-finalize mutation';
  assert.equal(migrated.state.history[1]!.name, plannedStepName);
  assert.equal(isDurableMigrationState(migrated.state), true);

  const backup = clone(preMigrationProtectedBackup);
  const rollback = planReleaseRollback({
    currentState: migratedStateV2,
    predecessor: previousReleaseCompatibility,
    preMigrationBackup: backup,
  });
  assert.equal(rollback.status, 'ready');
  if (
    rollback.status !== 'ready' ||
    rollback.strategy !== 'restore-protected-backup-then-code-rollback'
  ) {
    return;
  }
  const plannedByteLength = rollback.backup.artifact.byteLength;
  (backup.artifact as { byteLength: number }).byteLength += 1;
  assert.equal(rollback.backup.artifact.byteLength, plannedByteLength);
});

test('stores only verifier references and bounded audit metadata', () => {
  const classCode = {
    contractVersion,
    recordKind: 'class-code-state',
    status: 'active',
    workspaceId: selfHostedWorkspace.workspaceId,
    classCodeStateId: stateIdentifier(
      'class-code-state',
      'class-code-state-synthetic-primary',
    ),
    screenId: scopeIdentifier('screen', 'screen-synthetic-primary'),
    policyVersion: viewerClassCodePolicy.version,
    verifierReference: {
      kind: 'protected-secret-reference',
      referenceId: stateIdentifier(
        'secret-reference',
        'verifier-ref-synthetic-primary',
      ),
    },
    verifierVersion: 1,
    rotatedAt: '2035-02-12T07:30:00Z',
  };
  assert.equal(isClassCodeState(classCode), true);
  assert.equal(
    isClassCodeState({ ...classCode, classCode: 'SYNTHETIC-CODE' }),
    false,
  );
  assert.equal(
    isClassCodeState({
      contractVersion,
      recordKind: 'class-code-state',
      status: 'revoked',
      workspaceId: selfHostedWorkspace.workspaceId,
      classCodeStateId: classCode.classCodeStateId,
      screenId: classCode.screenId,
      policyVersion: viewerClassCodePolicy.version,
      verifierVersion: 2,
      revokedAt: '2035-02-12T07:45:00Z',
    }),
    true,
  );

  const event = {
    contractVersion,
    recordKind: 'configuration-audit-event',
    eventId: stateIdentifier('audit-event', 'audit-event-synthetic-001'),
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'audit-synthetic-revision',
    ),
    action: 'revision-activated',
    outcome: 'succeeded',
    subjectKind: 'revision',
    subjectReference: scopeIdentifier(
      'resource',
      'revision-subject-synthetic-001',
    ),
    stateVersionBefore: 2,
    stateVersionAfter: 3,
    configurationRevisionId: activeSelfHostedState.activePointer!.revisionId,
    occurredAt: '2035-02-12T08:02:00Z',
  };
  assert.equal(isConfigurationAuditEvent(event), true);
  assert.equal(
    isConfigurationAuditEvent({ ...event, details: { token: 'secret' } }),
    false,
  );
});

test('creates deterministic redacted portable exports distinct from protected backups', () => {
  assert.equal(
    isPortableConfigurationExport(portableConfigurationExport),
    true,
  );
  assert.equal(isProtectedBackupManifest(preMigrationProtectedBackup), true);
  const serialized = JSON.stringify(portableConfigurationExport);
  assert.doesNotMatch(serialized, /secret-ref|verifier|token|browser|profile/u);
  assert.match(serialized, /"connectionRequired":true/u);
  assert.equal('artifact' in portableConfigurationExport, false);
  assert.equal('configuration' in preMigrationProtectedBackup, false);

  const repeated = clone(portableConfigurationExport);
  assert.deepEqual(repeated, portableConfigurationExport);
  assert.equal(
    isPortableConfigurationExport({
      ...repeated,
      integrity: {
        ...repeated.integrity,
        manifestAndContentChecksum:
          'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      },
    }),
    false,
  );
});

test('denies portable imports and protected restores across workspaces', () => {
  assert.deepEqual(
    evaluatePortableImport(selfHostedWorkspace, portableConfigurationExport),
    {
      status: 'accepted',
      workspaceId: selfHostedWorkspace.workspaceId,
    },
  );
  assert.deepEqual(
    evaluatePortableImport(hostedWorkspace, portableConfigurationExport),
    { status: 'rejected', reason: 'workspace-mismatch' },
  );
  assert.deepEqual(
    evaluateProtectedRestore(
      selfHostedWorkspace,
      preMigrationProtectedBackup,
      preMigrationProtectedBackup.artifact.checksum,
    ),
    {
      status: 'accepted',
      workspaceId: selfHostedWorkspace.workspaceId,
    },
  );
  assert.deepEqual(
    evaluateProtectedRestore(
      hostedWorkspace,
      preMigrationProtectedBackup,
      preMigrationProtectedBackup.artifact.checksum,
    ),
    { status: 'rejected', reason: 'workspace-mismatch' },
  );
});

test('binds every A05 artifact, state, migration, rollback, and audit path to the full workspace', () => {
  const hostedExport = createPortableConfigurationExport({
    exportId: stateIdentifier(
      'portable-export',
      'portable-export-hosted-synthetic-001',
    ),
    revisionId: hostedOrganizationState.activePointer!.revisionId,
    configuration: hostedOrganizationState.revisions[0]!.content,
    createdAt: '2035-02-12T09:05:00Z',
  });

  assert.deepEqual(
    evaluatePortableImport(
      sameIdDifferentInstallation,
      portableConfigurationExport,
    ),
    { status: 'rejected', reason: 'workspace-mismatch' },
  );
  assert.deepEqual(
    evaluatePortableImport(sameIdCrossKind, portableConfigurationExport),
    { status: 'rejected', reason: 'workspace-mismatch' },
  );
  assert.deepEqual(
    evaluatePortableImport(sameIdDifferentOrganization, hostedExport),
    { status: 'rejected', reason: 'workspace-mismatch' },
  );

  for (const workspace of [sameIdDifferentInstallation, sameIdCrossKind]) {
    assert.deepEqual(
      evaluateProtectedRestore(
        workspace,
        preMigrationProtectedBackup,
        preMigrationProtectedBackup.artifact.checksum,
      ),
      { status: 'rejected', reason: 'workspace-mismatch' },
    );
  }
  const hostedBackup = backupFor(hostedWorkspace);
  assert.deepEqual(
    evaluateProtectedRestore(
      sameIdDifferentOrganization,
      hostedBackup,
      hostedBackup.artifact.checksum,
    ),
    { status: 'rejected', reason: 'workspace-mismatch' },
  );

  for (const workspace of [sameIdDifferentInstallation, sameIdCrossKind]) {
    const migration = assessForwardMigration(
      migrationStateV1,
      migrationBundleFor(workspace),
    );
    assert.deepEqual(migration, {
      status: 'rejected',
      reason: 'workspace-mismatch',
    });
  }
  assert.equal(
    isForwardMigrationBundle({
      ...validForwardMigrationBundle,
      workspace: sameIdDifferentInstallation,
    }),
    false,
  );
  assert.deepEqual(
    assessForwardMigration(
      migrationStateFor(hostedWorkspace),
      migrationBundleFor(sameIdDifferentOrganization),
    ),
    { status: 'rejected', reason: 'workspace-mismatch' },
  );
  const hostedAssessment = assessForwardMigration(
    migrationStateFor(hostedWorkspace),
    migrationBundleFor(hostedWorkspace),
  );
  assert.equal(hostedAssessment.status, 'ready');
  const crossWorkspaceFinalize = finalizeForwardMigration(
    migrationStateV1,
    hostedAssessment,
    '2035-02-12T09:06:00Z',
    'commit',
  );
  assert.equal(crossWorkspaceFinalize.status, 'failed');
  assert.equal(crossWorkspaceFinalize.state, migrationStateV1);

  for (const workspace of [sameIdDifferentInstallation, sameIdCrossKind]) {
    assert.deepEqual(
      planReleaseRollback({
        currentState: migratedStateV2,
        predecessor: previousReleaseCompatibility,
        preMigrationBackup: backupFor(workspace),
      }),
      { status: 'rejected', reason: 'backup-workspace-mismatch' },
    );
  }
  assert.deepEqual(
    planReleaseRollback({
      currentState: migrationStateFor(hostedWorkspace, 2),
      predecessor: compatibilityFor(hostedWorkspace, '0.1.0', 1),
      preMigrationBackup: backupFor(sameIdDifferentOrganization),
    }),
    { status: 'rejected', reason: 'backup-workspace-mismatch' },
  );

  assert.equal(
    isConfigurationStateSnapshot(
      stateWithConfigurationWorkspace(
        activeSelfHostedState,
        sameIdDifferentInstallation,
      ),
    ),
    false,
  );
  assert.equal(
    isConfigurationStateSnapshot(
      stateWithConfigurationWorkspace(activeSelfHostedState, sameIdCrossKind),
    ),
    false,
  );
  assert.equal(
    isConfigurationStateSnapshot(
      stateWithConfigurationWorkspace(
        hostedOrganizationState,
        sameIdDifferentOrganization,
      ),
    ),
    false,
  );

  for (const [state, workspace] of [
    [activeSelfHostedState, sameIdDifferentInstallation],
    [activeSelfHostedState, sameIdCrossKind],
    [hostedOrganizationState, sameIdDifferentOrganization],
  ] as const) {
    const revision = state.revisions[0]!;
    const transition = transitionConfigurationState(state, {
      contractVersion,
      kind: 'activate-revision',
      workspace,
      workspaceId: workspace.workspaceId,
      expectedStateVersion: state.stateVersion,
      auditScope: configurationAuditScope(
        workspace,
        'same-id-wrong-tenant-activation',
      ),
      expectedActiveRevisionId: state.activePointer!.revisionId,
      revisionId: revision.revisionId,
      selectedAt: '2035-02-12T09:10:00Z',
    });
    assert.equal(transition.status, 'rejected');
    if (transition.status === 'rejected') {
      assert.equal(transition.reason, 'workspace-mismatch');
    }
    const wrongAuditTransition = transitionConfigurationState(state, {
      contractVersion,
      kind: 'activate-revision',
      workspace: state.workspace,
      workspaceId: state.workspace.workspaceId,
      expectedStateVersion: state.stateVersion,
      auditScope: configurationAuditScope(
        workspace,
        'same-id-wrong-tenant-audit',
      ),
      expectedActiveRevisionId: state.activePointer!.revisionId,
      revisionId: revision.revisionId,
      selectedAt: '2035-02-12T09:10:00Z',
    });
    assert.equal(wrongAuditTransition.status, 'rejected');
    if (wrongAuditTransition.status === 'rejected') {
      assert.equal(wrongAuditTransition.reason, 'invalid-command');
    }

    const preview = createConfigurationPreview(state, {
      contractVersion,
      workspace,
      workspaceId: workspace.workspaceId,
      expectedStateVersion: state.stateVersion,
      previewId: stateIdentifier('preview', 'preview-wrong-tenant'),
      basis: {
        kind: 'revision',
        revisionId: revision.revisionId,
        contentChecksum: revision.contentChecksum,
      },
      targets: [{ kind: 'workspace', workspaceId: workspace.workspaceId }],
      status: 'ready',
      diagnosticCodes: [],
      generatedAt: '2035-02-12T09:10:00Z',
      expiresAt: '2035-02-12T09:20:00Z',
      auditScope: configurationAuditScope(
        workspace,
        'same-id-wrong-tenant-preview',
      ),
    });
    assert.equal(preview.status, 'rejected');
    if (preview.status === 'rejected') {
      assert.equal(preview.reason, 'workspace-mismatch');
    }
    const wrongAuditPreview = createConfigurationPreview(state, {
      contractVersion,
      workspace: state.workspace,
      workspaceId: state.workspace.workspaceId,
      expectedStateVersion: state.stateVersion,
      previewId: stateIdentifier('preview', 'preview-wrong-audit'),
      basis: {
        kind: 'revision',
        revisionId: revision.revisionId,
        contentChecksum: revision.contentChecksum,
      },
      targets: [
        { kind: 'workspace', workspaceId: state.workspace.workspaceId },
      ],
      status: 'ready',
      diagnosticCodes: [],
      generatedAt: '2035-02-12T09:10:00Z',
      expiresAt: '2035-02-12T09:20:00Z',
      auditScope: configurationAuditScope(
        workspace,
        'same-id-wrong-tenant-preview-audit',
      ),
    });
    assert.equal(wrongAuditPreview.status, 'rejected');
    if (wrongAuditPreview.status === 'rejected') {
      assert.equal(wrongAuditPreview.reason, 'invalid-request');
    }
  }
});

test('applies ordered migrations atomically and preserves state on failure or tampering', () => {
  assert.equal(isDurableMigrationState(migrationStateV1), true);
  assert.equal(isForwardMigrationBundle(validForwardMigrationBundle), true);
  const assessment = assessForwardMigration(
    migrationStateV1,
    validForwardMigrationBundle,
  );
  assert.equal(assessment.status, 'ready');
  assert.equal(isDurableMigrationState(migratedStateV2), true);
  assert.equal(migratedStateV2.stateSchemaVersion, 2);
  assert.equal(migratedStateV2.history.length, 2);

  const failed = finalizeForwardMigration(
    migrationStateV1,
    assessment,
    '2035-02-12T10:00:00Z',
    'fail',
  );
  assert.equal(failed.status, 'failed');
  assert.equal(failed.state, migrationStateV1);

  const tampered = {
    ...validForwardMigrationBundle,
    expectedHistory: [
      {
        ...validForwardMigrationBundle.expectedHistory[0]!,
        checksum:
          'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      },
    ],
  } as unknown as ForwardMigrationBundle;
  assert.deepEqual(assessForwardMigration(migrationStateV1, tampered), {
    status: 'rejected',
    reason: 'invalid-bundle',
  });

  const tamperedState = {
    ...migrationStateV1,
    history: [
      {
        ...migrationStateV1.history[0]!,
        checksum:
          'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as const,
      },
    ],
  } as unknown as typeof migrationStateV1;
  assert.deepEqual(
    assessForwardMigration(tamperedState, validForwardMigrationBundle),
    {
      status: 'rejected',
      reason: 'history-gap-or-tampering',
    },
  );

  const gap = {
    ...validForwardMigrationBundle,
    steps: [{ ...validForwardMigrationBundle.steps[0]!, version: 3 }],
  };
  const checksummedGap = {
    ...gap,
    bundleChecksum: forwardMigrationBundleChecksum(gap),
  };
  assert.deepEqual(assessForwardMigration(migrationStateV1, checksummedGap), {
    status: 'rejected',
    reason: 'history-gap-or-tampering',
  });
});

test('selects compatible code rollback or isolated verified backup restore', () => {
  assert.deepEqual(
    planReleaseRollback({
      currentState: migratedStateV2,
      predecessor: compatiblePredecessorManifest,
      preMigrationBackup: null,
    }),
    {
      status: 'ready',
      strategy: 'code-rollback',
      predecessor: compatiblePredecessorManifest.release,
      stateSchemaVersion: 2,
    },
  );
  assert.deepEqual(
    planReleaseRollback({
      currentState: migratedStateV2,
      predecessor: previousReleaseCompatibility,
      preMigrationBackup: preMigrationProtectedBackup,
    }),
    {
      status: 'ready',
      strategy: 'restore-protected-backup-then-code-rollback',
      predecessor: previousReleaseCompatibility.release,
      backup: preMigrationProtectedBackup,
      requiresIsolatedRestore: true,
    },
  );
  assert.deepEqual(
    planReleaseRollback({
      currentState: migratedStateV2,
      predecessor: previousReleaseCompatibility,
      preMigrationBackup: null,
    }),
    { status: 'rejected', reason: 'backup-required' },
  );
});

test('rejects malformed, unsafe, oversized, sparse, and cross-scope state shapes', () => {
  const configuration = configurationFor(selfHostedWorkspace);
  const malformed = {
    ...configuration,
    rooms: [{ ...configuration.rooms[0]!, label: 'x'.repeat(257) }],
  };
  assert.equal(isEditableConfiguration(malformed), false);

  const crossScope = {
    ...configuration,
    screens: [
      {
        ...configuration.screens[0]!,
        workspaceId: hostedWorkspace.workspaceId,
      },
    ],
  };
  assert.equal(isEditableConfiguration(crossScope), false);

  const sparse = clone(configuration) as unknown as Record<string, unknown>;
  const sparseScreens = new Array(2);
  sparseScreens[0] = configuration.screens[0]!;
  sparse.screens = sparseScreens;
  assert.equal(isEditableConfiguration(sparse), false);

  const accessor = clone(configuration);
  Object.defineProperty(accessor, 'sources', {
    enumerable: true,
    get: () => [],
  });
  assert.equal(isEditableConfiguration(accessor), false);

  const symbol = clone(configuration);
  Object.defineProperty(symbol, Symbol('unsafe'), {
    enumerable: true,
    value: true,
  });
  assert.equal(isEditableConfiguration(symbol), false);

  const nonFinite = clone(activeSelfHostedState) as unknown as Record<
    string,
    unknown
  >;
  nonFinite.stateVersion = Number.POSITIVE_INFINITY;
  assert.equal(isConfigurationStateSnapshot(nonFinite), false);

  const baseDraft = activeSelfHostedState.drafts[0]!;
  const boundedDrafts = Array.from(
    { length: configurationStateRecordLimits.maximumDrafts },
    (_, index): ConfigurationDraftRecord => ({
      ...baseDraft,
      draftId: stateIdentifier(
        'configuration-draft',
        `draft-capacity-${index.toString().padStart(3, '0')}`,
      ),
    }),
  );
  const atDraftCapacity = {
    ...configurationStateFixtureCatalog.freshSelfHostedState,
    stateVersion: configurationStateRecordLimits.maximumDrafts,
    drafts: boundedDrafts,
  };
  assert.equal(isConfigurationStateSnapshot(atDraftCapacity), true);
  const capacityResult = transitionConfigurationState(atDraftCapacity, {
    contractVersion,
    kind: 'save-draft',
    workspace: selfHostedWorkspace,
    workspaceId: selfHostedWorkspace.workspaceId,
    expectedStateVersion: atDraftCapacity.stateVersion,
    auditScope: configurationAuditScope(
      selfHostedWorkspace,
      'capacity-save-synthetic-draft',
    ),
    draftId: stateIdentifier('configuration-draft', 'draft-capacity-overflow'),
    expectedDraftVersion: null,
    content: configuration,
    savedAt: '2035-02-12T10:00:00Z',
  });
  assert.equal(capacityResult.status, 'rejected');
  if (capacityResult.status === 'rejected') {
    assert.equal(capacityResult.reason, 'state-capacity-exceeded');
  }
  assert.equal(capacityResult.state, atDraftCapacity);
  assert.equal(
    isConfigurationStateSnapshot({
      ...atDraftCapacity,
      drafts: [
        ...boundedDrafts,
        { ...baseDraft, draftId: 'draft-capacity-999' },
      ],
    }),
    false,
  );

  assert.equal(
    isConfigurationStateSnapshot({
      ...activeSelfHostedState,
      drafts: [
        {
          ...baseDraft,
          baseActiveRevisionId: stateIdentifier(
            'configuration-revision',
            'revision-does-not-exist',
          ),
        },
      ],
    }),
    false,
  );

  const oversizedMigrationHistory = Array.from(
    { length: migrationRecordLimits.maximumSchemaVersion + 1 },
    (_, index) => ({
      version: index + 1,
      name: `bounded-migration-${index + 1}`,
      checksum: configurationDigest({ migration: index + 1 }),
      appliedAt: '2035-02-12T10:00:00Z' as const,
    }),
  );
  assert.equal(
    isDurableMigrationState({
      ...migrationStateV1,
      stateSchemaVersion: oversizedMigrationHistory.length,
      history: oversizedMigrationHistory,
    }),
    false,
  );
});

test('has no ambient tenant, plaintext secret, generic payload, or down-migration escape hatch', () => {
  const source = [
    'src/contracts/v1/configuration-state.ts',
    'src/contracts/v1/configuration-persistence.ts',
    'src/contracts/v1/configuration-migration.ts',
  ]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  assert.doesNotMatch(source, /workspaceId\s*\?:|organizationId\s*\?:/u);
  assert.doesNotMatch(
    source,
    /defaultWorkspace|ambientWorkspace|tenantSelector/u,
  );
  assert.doesNotMatch(
    source,
    /readonly\s+(?:secretValue|tokenValue|plaintextCode|classCode)\s*:/u,
  );
  assert.doesNotMatch(source, /readonly\s+(?:payload|details)\s*:/u);
  assert.doesNotMatch(source, /downMigration|down-migration|applyDowngrade/u);
  assert.doesNotMatch(source, /async\s+function/u);
});

test('fixture catalog remains exact JSON-safe synthetic data', () => {
  const json = JSON.stringify(configurationStateFixtureCatalog);
  assert.deepEqual(JSON.parse(json), configurationStateFixtureCatalog);
  assert.doesNotMatch(json, /@|https?:\/\/|Bearer|PRIVATE KEY/u);
  assert.equal(
    configurationStateFixtureCatalog.activeConfigurationChecksum,
    configurationDigest(activeSelfHostedState.revisions[0]!.content),
  );
});
