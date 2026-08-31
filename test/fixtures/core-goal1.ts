import {
  configurationDigest,
  contractVersion,
  coreGoal1FixtureContractVersion,
  coreGoal1PrivacyRules,
  createConfigurationPreview,
  createPortableConfigurationExport,
  scopeIdentifier,
  stateIdentifier,
  transitionConfigurationState,
  viewerClassCodePolicy,
  type AuditScope,
  type ClassCodeState,
  type ConfigurationCommand,
  type ConfigurationStateSnapshot,
  type CoreGoal1ExpectedScenario,
  type CoreGoal1FixtureCatalog,
  type EditableConfiguration,
  type ProtectedBackupManifest,
  type SelfHostedWorkspace,
  type Sha256Digest,
} from '../../src/contracts/v1/index.js';

const digest = (character: string): Sha256Digest =>
  `sha256:${character.repeat(64)}` as Sha256Digest;

export const coreGoal1Workspace: SelfHostedWorkspace = {
  contractVersion,
  kind: 'self-hosted-installation',
  workspaceId: scopeIdentifier('workspace', 'workspace-synthetic-core-goal1'),
  installationId: scopeIdentifier(
    'installation',
    'installation-synthetic-core-goal1',
  ),
};

const roomNorth = scopeIdentifier('room', 'room-synthetic-north');
const roomSouth = scopeIdentifier('room', 'room-synthetic-south');
const screenNorth = scopeIdentifier('screen', 'screen-synthetic-north');
const screenSouth = scopeIdentifier('screen', 'screen-synthetic-south');
const courseDesign = scopeIdentifier('resource', 'course-synthetic-design');
const courseRobotics = scopeIdentifier('resource', 'course-synthetic-robotics');
const mediaDesign = scopeIdentifier('resource', 'media-synthetic-design');
const mediaRobotics = scopeIdentifier('resource', 'media-synthetic-robotics');

function auditScope(operation: string): AuditScope {
  return {
    contractVersion,
    workspaceKind: 'self-hosted-installation',
    workspaceId: coreGoal1Workspace.workspaceId,
    installationId: coreGoal1Workspace.installationId,
    actorId: scopeIdentifier('actor', 'actor-synthetic-core-operator'),
    actorKind: 'self-hosted-operator',
    capability: scopeIdentifier('capability', 'configuration.write'),
    authority: 'operator-reachability',
    targets: [
      {
        kind: 'workspace',
        workspaceId: coreGoal1Workspace.workspaceId,
      },
    ],
    operationId: scopeIdentifier(
      'operation',
      `operation-synthetic-${operation}`,
    ),
    correlationId: scopeIdentifier(
      'correlation',
      `correlation-synthetic-${operation}`,
    ),
  };
}

const activeClassCode: ClassCodeState = {
  contractVersion,
  recordKind: 'class-code-state',
  status: 'active',
  workspaceId: coreGoal1Workspace.workspaceId,
  classCodeStateId: stateIdentifier(
    'class-code-state',
    'class-code-state-synthetic-north',
  ),
  screenId: screenNorth,
  policyVersion: viewerClassCodePolicy.version,
  verifierReference: {
    kind: 'protected-secret-reference',
    referenceId: stateIdentifier(
      'secret-reference',
      'secret-reference-synthetic-class-code-north',
    ),
  },
  verifierVersion: 1,
  rotatedAt: '2035-03-18T07:00:00Z',
};

const revokedClassCode: ClassCodeState = {
  contractVersion,
  recordKind: 'class-code-state',
  status: 'revoked',
  workspaceId: coreGoal1Workspace.workspaceId,
  classCodeStateId: stateIdentifier(
    'class-code-state',
    'class-code-state-synthetic-south',
  ),
  screenId: screenSouth,
  policyVersion: viewerClassCodePolicy.version,
  verifierVersion: 2,
  revokedAt: '2035-03-18T07:05:00Z',
};

function configuration(labelSuffix: string): EditableConfiguration {
  return {
    contractVersion,
    configurationSchemaVersion: 1,
    workspace: coreGoal1Workspace,
    timePolicy: {
      timeZone: 'Etc/UTC',
      datePolicyReference: scopeIdentifier(
        'resource',
        'date-policy-synthetic-core-goal1',
      ),
    },
    rooms: [
      {
        workspaceId: coreGoal1Workspace.workspaceId,
        roomId: roomNorth,
        label: 'Synthetic North Studio',
      },
      {
        workspaceId: coreGoal1Workspace.workspaceId,
        roomId: roomSouth,
        label: 'Synthetic South Lab',
      },
    ],
    screens: [
      {
        workspaceId: coreGoal1Workspace.workspaceId,
        screenId: screenNorth,
        roomId: roomNorth,
        label: `Synthetic North Display ${labelSuffix}`,
        enabled: true,
        classCodeStateId: activeClassCode.classCodeStateId,
      },
      {
        workspaceId: coreGoal1Workspace.workspaceId,
        screenId: screenSouth,
        roomId: roomSouth,
        label: 'Synthetic South Display',
        enabled: true,
        classCodeStateId: revokedClassCode.classCodeStateId,
      },
    ],
    sources: [
      {
        workspaceId: coreGoal1Workspace.workspaceId,
        sourceId: scopeIdentifier(
          'resource',
          'source-synthetic-course-catalog',
        ),
        sourceKind: scopeIdentifier('resource-kind', 'course-catalog'),
        enabled: true,
        definitionReference: scopeIdentifier(
          'resource',
          'definition-synthetic-course-catalog',
        ),
        mode: 'application-managed',
      },
      {
        workspaceId: coreGoal1Workspace.workspaceId,
        sourceId: scopeIdentifier('resource', 'source-synthetic-media'),
        sourceKind: scopeIdentifier('resource-kind', 'display-media'),
        enabled: true,
        definitionReference: scopeIdentifier(
          'resource',
          'definition-synthetic-media',
        ),
        mode: 'application-managed',
      },
      {
        workspaceId: coreGoal1Workspace.workspaceId,
        sourceId: scopeIdentifier('resource', 'source-synthetic-schedule'),
        sourceKind: scopeIdentifier('resource-kind', 'schedule'),
        enabled: true,
        definitionReference: scopeIdentifier(
          'resource',
          'definition-synthetic-schedule',
        ),
        mode: 'application-managed',
      },
      {
        workspaceId: coreGoal1Workspace.workspaceId,
        sourceId: scopeIdentifier('resource', 'source-synthetic-vocabulary'),
        sourceKind: scopeIdentifier('resource-kind', 'vocabulary'),
        enabled: true,
        definitionReference: scopeIdentifier(
          'resource',
          'definition-synthetic-vocabulary',
        ),
        mode: 'application-managed',
      },
    ],
  };
}

function apply(
  state: ConfigurationStateSnapshot,
  command: ConfigurationCommand,
): ConfigurationStateSnapshot {
  const result = transitionConfigurationState(state, command);
  if (result.status !== 'applied') {
    throw new Error(`Core Goal 1 fixture transition failed: ${result.status}.`);
  }
  return result.state;
}

const draftId = stateIdentifier(
  'configuration-draft',
  'draft-synthetic-core-goal1',
);
const revisionOne = stateIdentifier(
  'configuration-revision',
  'revision-synthetic-core-goal1-001',
);
const revisionTwo = stateIdentifier(
  'configuration-revision',
  'revision-synthetic-core-goal1-002',
);

const freshState: ConfigurationStateSnapshot = {
  contractVersion,
  stateSchemaVersion: 1,
  workspace: coreGoal1Workspace,
  stateVersion: 0,
  drafts: [],
  revisions: [],
  activePointer: null,
};

const firstSaved = apply(freshState, {
  contractVersion,
  kind: 'save-draft',
  workspace: coreGoal1Workspace,
  workspaceId: coreGoal1Workspace.workspaceId,
  expectedStateVersion: 0,
  auditScope: auditScope('save-first'),
  draftId,
  expectedDraftVersion: null,
  content: configuration('v1'),
  savedAt: '2035-03-18T08:00:00Z',
});
const firstValidated = apply(firstSaved, {
  contractVersion,
  kind: 'validate-draft',
  workspace: coreGoal1Workspace,
  workspaceId: coreGoal1Workspace.workspaceId,
  expectedStateVersion: 1,
  auditScope: auditScope('validate-first'),
  draftId,
  expectedDraftVersion: 1,
  revisionId: revisionOne,
  validatedAt: '2035-03-18T08:01:00Z',
});
const firstActivated = apply(firstValidated, {
  contractVersion,
  kind: 'activate-revision',
  workspace: coreGoal1Workspace,
  workspaceId: coreGoal1Workspace.workspaceId,
  expectedStateVersion: 2,
  auditScope: auditScope('activate-first'),
  expectedActiveRevisionId: null,
  revisionId: revisionOne,
  selectedAt: '2035-03-18T08:02:00Z',
});
const secondSaved = apply(firstActivated, {
  contractVersion,
  kind: 'save-draft',
  workspace: coreGoal1Workspace,
  workspaceId: coreGoal1Workspace.workspaceId,
  expectedStateVersion: 3,
  auditScope: auditScope('save-second'),
  draftId,
  expectedDraftVersion: 1,
  content: configuration('v2'),
  savedAt: '2035-03-18T08:03:00Z',
});
const secondValidated = apply(secondSaved, {
  contractVersion,
  kind: 'validate-draft',
  workspace: coreGoal1Workspace,
  workspaceId: coreGoal1Workspace.workspaceId,
  expectedStateVersion: 4,
  auditScope: auditScope('validate-second'),
  draftId,
  expectedDraftVersion: 2,
  revisionId: revisionTwo,
  validatedAt: '2035-03-18T08:04:00Z',
});
const secondActivated = apply(secondValidated, {
  contractVersion,
  kind: 'activate-revision',
  workspace: coreGoal1Workspace,
  workspaceId: coreGoal1Workspace.workspaceId,
  expectedStateVersion: 5,
  auditScope: auditScope('activate-second'),
  expectedActiveRevisionId: revisionOne,
  revisionId: revisionTwo,
  selectedAt: '2035-03-18T08:05:00Z',
});
const rolledBack = apply(secondActivated, {
  contractVersion,
  kind: 'rollback-revision',
  workspace: coreGoal1Workspace,
  workspaceId: coreGoal1Workspace.workspaceId,
  expectedStateVersion: 6,
  auditScope: auditScope('rollback-first'),
  expectedActiveRevisionId: revisionTwo,
  revisionId: revisionOne,
  selectedAt: '2035-03-18T08:06:00Z',
});

const previewResult = createConfigurationPreview(secondActivated, {
  contractVersion,
  workspace: coreGoal1Workspace,
  workspaceId: coreGoal1Workspace.workspaceId,
  expectedStateVersion: secondActivated.stateVersion,
  previewId: stateIdentifier('preview', 'preview-synthetic-core-goal1'),
  basis: {
    kind: 'revision',
    revisionId: revisionTwo,
    contentChecksum: secondActivated.revisions[1]!.contentChecksum,
  },
  targets: [
    {
      kind: 'screen',
      workspaceId: coreGoal1Workspace.workspaceId,
      roomId: roomNorth,
      screenId: screenNorth,
    },
    {
      kind: 'date',
      workspaceId: coreGoal1Workspace.workspaceId,
      date: '2035-03-18',
    },
  ],
  status: 'ready',
  diagnosticCodes: [],
  generatedAt: '2035-03-18T08:05:10Z',
  expiresAt: '2035-03-18T08:20:10Z',
  auditScope: auditScope('preview-second'),
});
if (previewResult.status !== 'created') {
  throw new Error('Core Goal 1 fixture preview failed.');
}

const portableExport = createPortableConfigurationExport({
  exportId: stateIdentifier('portable-export', 'export-synthetic-core-goal1'),
  revisionId: revisionOne,
  configuration: rolledBack.revisions[0]!.content,
  createdAt: '2035-03-18T08:07:00Z',
});

const recoveryBackup: ProtectedBackupManifest = {
  contractVersion,
  kind: 'protected-full-backup',
  manifestVersion: 1,
  backupId: stateIdentifier('protected-backup', 'backup-synthetic-core-goal1'),
  workspace: coreGoal1Workspace,
  stateSchemaVersion: 1,
  migrationVersion: 0,
  release: {
    shellKind: 'self-hosted',
    coreVersion: '0.1.0',
    shellVersion: '0.1.0',
  },
  artifact: {
    artifactReference: scopeIdentifier(
      'resource',
      'backup-artifact-synthetic-core-goal1',
    ),
    checksum: digest('b'),
    byteLength: 16_384,
  },
  createdAt: '2035-03-18T08:08:00Z',
  restoration: {
    mode: 'exact-workspace-isolated',
    requiresIntegrityVerification: true,
    containsProtectedState: true,
  },
};

const scenario = (
  scenarioId: string,
  operation: string,
  requiredBy: CoreGoal1ExpectedScenario['requiredBy'],
  input: unknown,
  expected: unknown,
): CoreGoal1ExpectedScenario => ({
  contractVersion,
  fixtureContractVersion: coreGoal1FixtureContractVersion,
  scenarioId,
  operation,
  requiredBy,
  input,
  expected,
});

export const coreGoal1FixtureCatalog: CoreGoal1FixtureCatalog = {
  contractVersion,
  fixtureContractVersion: coreGoal1FixtureContractVersion,
  recordKind: 'core-goal1-fixture-catalog',
  workspace: coreGoal1Workspace,
  rooms: [
    { roomId: roomNorth, label: 'Synthetic North Studio' },
    { roomId: roomSouth, label: 'Synthetic South Lab' },
  ],
  screens: [
    {
      screenId: screenNorth,
      roomId: roomNorth,
      label: 'Synthetic North Display',
      classCodeState: activeClassCode,
    },
    {
      screenId: screenSouth,
      roomId: roomSouth,
      label: 'Synthetic South Display',
      classCodeState: revokedClassCode,
    },
  ],
  courses: [
    {
      courseId: courseDesign,
      roomId: roomNorth,
      code: 'SYN-DESIGN',
      label: 'Synthetic Web Design',
    },
    {
      courseId: courseRobotics,
      roomId: roomSouth,
      code: 'SYN-ROBOTICS',
      label: 'Synthetic Robotics',
    },
  ],
  manualSchedule: {
    schoolDate: '2035-03-18',
    timeZone: 'Etc/UTC',
    meetings: [
      {
        meetingId: scopeIdentifier('resource', 'meeting-synthetic-design-001'),
        courseId: courseDesign,
        screenId: screenNorth,
        startsAt: '2035-03-18T08:30:00Z',
        endsAt: '2035-03-18T09:20:00Z',
      },
      {
        meetingId: scopeIdentifier(
          'resource',
          'meeting-synthetic-robotics-001',
        ),
        courseId: courseRobotics,
        screenId: screenSouth,
        startsAt: '2035-03-18T10:00:00Z',
        endsAt: '2035-03-18T10:50:00Z',
      },
    ],
  },
  vocabulary: [
    {
      vocabularyId: scopeIdentifier(
        'resource',
        'vocabulary-synthetic-design-grid',
      ),
      courseId: courseDesign,
      term: 'grid',
      pronunciation: 'grid',
      translations: { es: 'cuadrícula', vi: 'lưới' },
    },
    {
      vocabularyId: scopeIdentifier(
        'resource',
        'vocabulary-synthetic-robotics-sensor',
      ),
      courseId: courseRobotics,
      term: 'sensor',
      pronunciation: 'sen-sor',
      translations: { es: 'sensor', vi: 'cảm biến' },
    },
  ],
  media: [
    {
      mediaId: mediaDesign,
      courseId: courseDesign,
      format: 'raster-png-v1',
      alternateText: 'Synthetic geometric design reference',
      byteLength: 32_768,
      contentDigest: digest('c'),
    },
    {
      mediaId: mediaRobotics,
      courseId: courseRobotics,
      format: 'raster-png-v1',
      alternateText: 'Synthetic robot sensor diagram',
      byteLength: 40_960,
      contentDigest: digest('d'),
    },
  ],
  configurationStates: {
    fresh: freshState,
    firstActivated,
    secondActivated,
    rolledBack,
  },
  preview: previewResult.snapshot,
  portableExport,
  recoveryBackup,
  plannedFrames: [
    {
      frameId: scopeIdentifier('resource', 'frame-synthetic-coming-up'),
      schoolDate: '2035-03-18',
      screenId: screenNorth,
      courseId: courseDesign,
      sequence: 1,
      state: 'coming-up',
      mediaIds: [mediaDesign],
    },
    {
      frameId: scopeIdentifier('resource', 'frame-synthetic-in-class'),
      schoolDate: '2035-03-18',
      screenId: screenNorth,
      courseId: courseDesign,
      sequence: 2,
      state: 'in-class',
      mediaIds: [mediaDesign],
    },
    {
      frameId: scopeIdentifier('resource', 'frame-synthetic-transition'),
      schoolDate: '2035-03-18',
      screenId: screenSouth,
      courseId: courseRobotics,
      sequence: 3,
      state: 'transition',
      mediaIds: [mediaRobotics],
    },
    {
      frameId: scopeIdentifier('resource', 'frame-synthetic-day-complete'),
      schoolDate: '2035-03-18',
      screenId: screenSouth,
      courseId: courseRobotics,
      sequence: 4,
      state: 'day-complete',
      mediaIds: [],
    },
  ],
  expectedScenarios: [
    scenario(
      'core-goal1-save-draft',
      'configuration.save-draft',
      ['C01', 'C10'],
      { baseStateVersion: 0, expectedDraftVersion: null },
      { status: 'applied', stateVersion: 1, draftVersion: 1 },
    ),
    scenario(
      'core-goal1-create-preview',
      'configuration.create-preview',
      ['C01', 'C10'],
      { stateVersion: 6, revisionId: revisionTwo },
      {
        status: 'created',
        effectiveStateVersion: 6,
        mutationFree: true,
        previewStatus: 'ready',
      },
    ),
    scenario(
      'core-goal1-activate-revision',
      'configuration.activate-revision',
      ['C01', 'C10'],
      { expectedActiveRevisionId: null, revisionId: revisionOne },
      { status: 'applied', stateVersion: 3, activeRevisionId: revisionOne },
    ),
    scenario(
      'core-goal1-rollback-revision',
      'configuration.rollback-revision',
      ['C01', 'C10'],
      { expectedActiveRevisionId: revisionTwo, revisionId: revisionOne },
      { status: 'applied', stateVersion: 7, activeRevisionId: revisionOne },
    ),
    scenario(
      'core-goal1-private-operator-shell',
      'operator-shell.render',
      ['C02', 'C10'],
      { workspaceId: coreGoal1Workspace.workspaceId },
      {
        status: 'ready',
        authority: 'private-reachability',
        accountRequired: false,
        javascriptRequired: false,
      },
    ),
    scenario(
      'core-goal1-room-screen-class-code',
      'display-configuration.project',
      ['C03', 'C10'],
      { roomIds: [roomNorth, roomSouth] },
      {
        status: 'ready',
        roomCount: 2,
        screenCount: 2,
        classCodeStates: ['active', 'revoked'],
        plaintextClassCodesPresent: false,
      },
    ),
    scenario(
      'core-goal1-manual-sources',
      'source-registry.project',
      ['C04', 'C10'],
      { sourceMode: 'application-managed' },
      {
        status: 'ready',
        sourceMode: 'application-managed',
        courseCount: 2,
        meetingCount: 2,
        vocabularyCount: 2,
        mediaCount: 2,
        providerEnrollmentRequired: false,
      },
    ),
    scenario(
      'core-goal1-planned-display',
      'planned-display.project',
      ['C09', 'C10'],
      { schoolDate: '2035-03-18', screenId: screenNorth },
      {
        status: 'ready',
        frameCount: 4,
        basisRevisionId: revisionTwo,
        mutationFree: true,
      },
    ),
    scenario(
      'core-goal1-redacted-export',
      'configuration.export-portable',
      ['C01', 'C10'],
      { revisionId: revisionOne },
      {
        status: 'created',
        configurationChecksum: portableExport.manifest.contentChecksum,
        containsProtectedState: false,
      },
    ),
    scenario(
      'core-goal1-recovery-preflight',
      'configuration.recovery-preflight',
      ['C01', 'C10'],
      { backupId: recoveryBackup.backupId },
      {
        status: 'accepted',
        mode: 'exact-workspace-isolated',
        currentStatePreservedUntilSuccess: true,
      },
    ),
    scenario(
      'core-goal1-acceptance-gate',
      'core-goal1.qualify',
      ['C10'],
      {
        acceptanceTasks: ['C01', 'C02', 'C03', 'C04', 'C09', 'C10'],
      },
      {
        status: 'qualified',
        selfHostedOnly: true,
        connectedProviderRequired: false,
        commercialFrameworkRequired: false,
        liveEffects: false,
      },
    ),
  ],
  privacyRules: coreGoal1PrivacyRules,
};

export const coreGoal1ExpectedConfigurationChecksum = configurationDigest(
  rolledBack.revisions[0]!.content,
);
