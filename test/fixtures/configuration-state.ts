import {
  assessForwardMigration,
  configurationDigest,
  contractVersion,
  createPortableConfigurationExport,
  finalizeForwardMigration,
  forwardMigrationBundleChecksum,
  scopeIdentifier,
  stateIdentifier,
  transitionConfigurationState,
  type AuditScope,
  type ConfigurationCommand,
  type ConfigurationStateSnapshot,
  type CoreShellReleasePairing,
  type DurableMigrationState,
  type EditableConfiguration,
  type ForwardMigrationBundle,
  type HostedWorkspace,
  type ProtectedBackupManifest,
  type ReleaseCompatibilityManifest,
  type SelfHostedWorkspace,
  type Sha256Digest,
} from '../../src/contracts/v1/index.js';

const digest = (character: string): Sha256Digest =>
  `sha256:${character.repeat(64)}` as Sha256Digest;

export const selfHostedWorkspace: SelfHostedWorkspace = {
  contractVersion,
  kind: 'self-hosted-installation',
  workspaceId: scopeIdentifier('workspace', 'workspace-synthetic-local'),
  installationId: scopeIdentifier(
    'installation',
    'installation-synthetic-local',
  ),
};

export const hostedWorkspace: HostedWorkspace = {
  contractVersion,
  kind: 'hosted-organization',
  workspaceId: scopeIdentifier('workspace', 'workspace-synthetic-hosted'),
  organizationId: scopeIdentifier(
    'organization',
    'organization-synthetic-school',
  ),
};

export function configurationAuditScope(
  workspace: SelfHostedWorkspace | HostedWorkspace,
  operation: string,
): AuditScope {
  const common = {
    contractVersion,
    workspaceId: workspace.workspaceId,
    actorId: scopeIdentifier('actor', 'actor-synthetic-operator'),
    actorKind:
      workspace.kind === 'self-hosted-installation'
        ? ('self-hosted-operator' as const)
        : ('hosted-account' as const),
    capability: scopeIdentifier('capability', 'configuration.write'),
    targets: [
      {
        kind: 'workspace' as const,
        workspaceId: workspace.workspaceId,
      },
    ] as const,
    operationId: scopeIdentifier('operation', operation),
    correlationId: scopeIdentifier('correlation', `correlation-${operation}`),
  };
  return workspace.kind === 'self-hosted-installation'
    ? {
        ...common,
        workspaceKind: workspace.kind,
        installationId: workspace.installationId,
        authority: 'operator-reachability',
      }
    : {
        ...common,
        workspaceKind: workspace.kind,
        organizationId: workspace.organizationId,
        authority: 'hosted-account',
      };
}

export function configurationFor(
  workspace: SelfHostedWorkspace | HostedWorkspace,
  label = 'Synthetic Screen',
): EditableConfiguration {
  const roomId = scopeIdentifier('room', 'room-synthetic-101');
  const screenId = scopeIdentifier('screen', 'screen-synthetic-primary');
  return {
    contractVersion,
    configurationSchemaVersion: 1,
    workspace,
    timePolicy: {
      timeZone: 'Etc/UTC',
      datePolicyReference: scopeIdentifier(
        'resource',
        'date-policy-synthetic-school-day',
      ),
    },
    rooms: [
      {
        workspaceId: workspace.workspaceId,
        roomId,
        label: 'Synthetic Room 101',
      },
    ],
    screens: [
      {
        workspaceId: workspace.workspaceId,
        screenId,
        roomId,
        label,
        enabled: true,
        classCodeStateId: stateIdentifier(
          'class-code-state',
          'class-code-state-synthetic-primary',
        ),
      },
    ],
    sources: [
      {
        workspaceId: workspace.workspaceId,
        sourceId: scopeIdentifier('resource', 'source-synthetic-calendar'),
        sourceKind: scopeIdentifier('resource-kind', 'schedule'),
        enabled: true,
        definitionReference: scopeIdentifier(
          'resource',
          'definition-synthetic-calendar',
        ),
        mode: 'connected-account',
        connectionReference: {
          kind: 'protected-secret-reference',
          referenceId: stateIdentifier(
            'secret-reference',
            'secret-ref-synthetic-calendar',
          ),
        },
      },
    ],
  };
}

export function freshState(
  workspace: SelfHostedWorkspace | HostedWorkspace,
): ConfigurationStateSnapshot {
  return {
    contractVersion,
    stateSchemaVersion: 1,
    workspace,
    stateVersion: 0,
    drafts: [],
    revisions: [],
    activePointer: null,
  };
}

function requireApplied(
  state: ConfigurationStateSnapshot,
  command: ConfigurationCommand,
): ConfigurationStateSnapshot {
  const result = transitionConfigurationState(state, command);
  if (result.status !== 'applied') {
    throw new Error(`Synthetic transition failed: ${result.status}`);
  }
  return result.state;
}

export function activatedState(
  workspace: SelfHostedWorkspace | HostedWorkspace,
): ConfigurationStateSnapshot {
  const draftId = stateIdentifier(
    'configuration-draft',
    'draft-synthetic-configuration',
  );
  const revisionId = stateIdentifier(
    'configuration-revision',
    'revision-synthetic-001',
  );
  const saved = requireApplied(freshState(workspace), {
    contractVersion,
    kind: 'save-draft',
    workspaceId: workspace.workspaceId,
    expectedStateVersion: 0,
    auditScope: configurationAuditScope(workspace, 'save-synthetic-draft'),
    draftId,
    expectedDraftVersion: null,
    content: configurationFor(workspace),
    savedAt: '2035-02-12T08:00:00Z',
  });
  const validated = requireApplied(saved, {
    contractVersion,
    kind: 'validate-draft',
    workspaceId: workspace.workspaceId,
    expectedStateVersion: 1,
    auditScope: configurationAuditScope(workspace, 'validate-synthetic-draft'),
    draftId,
    expectedDraftVersion: 1,
    revisionId,
    validatedAt: '2035-02-12T08:01:00Z',
  });
  return requireApplied(validated, {
    contractVersion,
    kind: 'activate-revision',
    workspaceId: workspace.workspaceId,
    expectedStateVersion: 2,
    auditScope: configurationAuditScope(
      workspace,
      'activate-synthetic-revision',
    ),
    expectedActiveRevisionId: null,
    revisionId,
    selectedAt: '2035-02-12T08:02:00Z',
  });
}

export const freshSelfHostedState = freshState(selfHostedWorkspace);
export const hostedOrganizationState = activatedState(hostedWorkspace);
export const activeSelfHostedState = activatedState(selfHostedWorkspace);

export const portableConfigurationExport = createPortableConfigurationExport({
  exportId: stateIdentifier('portable-export', 'portable-export-synthetic-001'),
  revisionId: activeSelfHostedState.activePointer!.revisionId,
  configuration: activeSelfHostedState.revisions[0]!.content,
  createdAt: '2035-02-12T09:00:00Z',
});

export const previousSelfHostedRelease: CoreShellReleasePairing = {
  shellKind: 'self-hosted',
  coreVersion: '0.1.0',
  shellVersion: '0.1.0',
};

export const nextSelfHostedRelease: CoreShellReleasePairing = {
  shellKind: 'self-hosted',
  coreVersion: '0.2.0',
  shellVersion: '0.2.0',
};

const migrationOne = {
  version: 1,
  name: 'initial-state',
  checksum: digest('1'),
} as const;
const migrationTwo = {
  version: 2,
  name: 'configuration-records',
  checksum: digest('2'),
} as const;

export const migrationStateV1: DurableMigrationState = {
  contractVersion,
  workspace: selfHostedWorkspace,
  stateSchemaVersion: 1,
  release: previousSelfHostedRelease,
  history: [{ ...migrationOne, appliedAt: '2035-02-12T07:00:00Z' }],
};

export const previousReleaseCompatibility: ReleaseCompatibilityManifest = {
  contractVersion,
  kind: 'release-compatibility',
  release: previousSelfHostedRelease,
  artifactChecksum: digest('a'),
  stateSchema: { minimumReadableVersion: 1, maximumReadableVersion: 1 },
};

export const compatiblePredecessorManifest: ReleaseCompatibilityManifest = {
  ...previousReleaseCompatibility,
  stateSchema: { minimumReadableVersion: 1, maximumReadableVersion: 2 },
};

export const nextReleaseCompatibility: ReleaseCompatibilityManifest = {
  contractVersion,
  kind: 'release-compatibility',
  release: nextSelfHostedRelease,
  artifactChecksum: digest('b'),
  stateSchema: { minimumReadableVersion: 1, maximumReadableVersion: 2 },
};

const validForwardMigrationBundleBody: Omit<
  ForwardMigrationBundle,
  'bundleChecksum'
> = {
  contractVersion,
  kind: 'forward-migration-bundle',
  workspaceId: selfHostedWorkspace.workspaceId,
  fromRelease: previousReleaseCompatibility,
  toRelease: nextReleaseCompatibility,
  expectedHistory: [migrationOne],
  steps: [migrationTwo],
};

export const validForwardMigrationBundle: ForwardMigrationBundle = {
  ...validForwardMigrationBundleBody,
  bundleChecksum: forwardMigrationBundleChecksum(
    validForwardMigrationBundleBody,
  ),
};

const validAssessment = assessForwardMigration(
  migrationStateV1,
  validForwardMigrationBundle,
);
if (validAssessment.status !== 'ready') {
  throw new Error('Synthetic forward migration assessment failed.');
}

export const migratedStateV2 = finalizeForwardMigration(
  migrationStateV1,
  validAssessment,
  '2035-02-12T10:00:00Z',
  'commit',
).state;

export const preMigrationProtectedBackup: ProtectedBackupManifest = {
  contractVersion,
  kind: 'protected-full-backup',
  manifestVersion: 1,
  backupId: stateIdentifier(
    'protected-backup',
    'protected-backup-synthetic-001',
  ),
  workspace: selfHostedWorkspace,
  stateSchemaVersion: 1,
  migrationVersion: 1,
  release: previousSelfHostedRelease,
  artifact: {
    artifactReference: scopeIdentifier(
      'resource',
      'backup-artifact-synthetic-001',
    ),
    checksum: digest('c'),
    byteLength: 4096,
  },
  createdAt: '2035-02-12T09:55:00Z',
  restoration: {
    mode: 'exact-workspace-isolated',
    requiresIntegrityVerification: true,
    containsProtectedState: true,
  },
};

export const configurationStateFixtureCatalog = {
  freshSelfHostedState,
  hostedOrganizationState,
  activeSelfHostedState,
  portableConfigurationExport,
  migrationStateV1,
  validForwardMigrationBundle,
  migratedStateV2,
  preMigrationProtectedBackup,
  activeConfigurationChecksum: configurationDigest(
    activeSelfHostedState.revisions[0]!.content,
  ),
} as const;
