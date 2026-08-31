import {
  type ProtectedBackupManifest,
  isCoreShellReleasePairing,
  isProtectedBackupManifest,
  type CoreShellReleasePairing,
} from './configuration-persistence.js';
import { isExactWorkspace, type Sha256Digest } from './configuration-state.js';
import {
  contractVersion,
  type ContractEnvelope,
  type IsoInstant,
} from './common.js';
import {
  hasExactKeys,
  cloneJsonValue,
  isBoundedString,
  isDenseArray,
  isIsoInstant,
  isNonNegativeInteger,
  isPlainObject,
  isPositiveInteger,
  isScopeIdentifier,
  isSha256Digest,
  safelyValidate,
  sha256Digest,
} from './state-contract-validation.js';
import { type Workspace } from './workspace.js';

export interface StateSchemaCompatibility {
  readonly minimumReadableVersion: number;
  readonly maximumReadableVersion: number;
}

export interface ReleaseCompatibilityManifest extends ContractEnvelope {
  readonly kind: 'release-compatibility';
  readonly release: CoreShellReleasePairing;
  readonly artifactChecksum: Sha256Digest;
  readonly stateSchema: StateSchemaCompatibility;
}

export interface MigrationDescriptor {
  readonly version: number;
  readonly name: string;
  readonly checksum: Sha256Digest;
}

export const migrationRecordLimits = {
  maximumSchemaVersion: 256,
  maximumBundleSteps: 256,
} as const;

export interface AppliedMigrationRecord extends MigrationDescriptor {
  readonly appliedAt: IsoInstant;
}

export interface DurableMigrationState extends ContractEnvelope {
  readonly workspace: Workspace;
  readonly stateSchemaVersion: number;
  readonly release: CoreShellReleasePairing;
  readonly history: readonly AppliedMigrationRecord[];
}

export interface ForwardMigrationBundle extends ContractEnvelope {
  readonly kind: 'forward-migration-bundle';
  readonly workspace: Workspace;
  readonly fromRelease: ReleaseCompatibilityManifest;
  readonly toRelease: ReleaseCompatibilityManifest;
  readonly expectedHistory: readonly MigrationDescriptor[];
  readonly steps: readonly MigrationDescriptor[];
  readonly bundleChecksum: Sha256Digest;
}

export interface ForwardMigrationPlan {
  readonly workspace: Workspace;
  readonly fromSchemaVersion: number;
  readonly toSchemaVersion: number;
  readonly fromRelease: CoreShellReleasePairing;
  readonly toRelease: CoreShellReleasePairing;
  readonly steps: readonly MigrationDescriptor[];
}

export type ForwardMigrationAssessment =
  | { readonly status: 'ready'; readonly plan: ForwardMigrationPlan }
  | {
      readonly status: 'rejected';
      readonly reason:
        | 'invalid-state'
        | 'invalid-bundle'
        | 'workspace-mismatch'
        | 'release-mismatch'
        | 'history-gap-or-tampering'
        | 'downgrade-not-supported'
        | 'future-schema-not-readable';
    };

export type MigrationExecutionResult =
  | {
      readonly status: 'applied';
      readonly state: DurableMigrationState;
    }
  | {
      readonly status: 'failed';
      readonly reason: 'migration-step-failed';
      readonly state: DurableMigrationState;
    };

export type ReleaseRollbackPlan =
  | {
      readonly status: 'ready';
      readonly strategy: 'code-rollback';
      readonly predecessor: CoreShellReleasePairing;
      readonly stateSchemaVersion: number;
    }
  | {
      readonly status: 'ready';
      readonly strategy: 'restore-protected-backup-then-code-rollback';
      readonly predecessor: CoreShellReleasePairing;
      readonly backup: ProtectedBackupManifest;
      readonly requiresIsolatedRestore: true;
    }
  | {
      readonly status: 'rejected';
      readonly reason:
        | 'invalid-current-state'
        | 'invalid-predecessor'
        | 'shell-kind-mismatch'
        | 'backup-required'
        | 'backup-workspace-mismatch'
        | 'backup-release-mismatch'
        | 'backup-schema-incompatible';
    };

function isReleasePairForWorkspace(
  release: CoreShellReleasePairing,
  workspace: Workspace,
): boolean {
  return (
    (workspace.kind === 'self-hosted-installation' &&
      release.shellKind === 'self-hosted') ||
    (workspace.kind === 'hosted-organization' && release.shellKind === 'hosted')
  );
}

function sameRelease(
  left: CoreShellReleasePairing,
  right: CoreShellReleasePairing,
): boolean {
  return (
    left.shellKind === right.shellKind &&
    left.coreVersion === right.coreVersion &&
    left.shellVersion === right.shellVersion
  );
}

function isCompatibilityRange(
  value: unknown,
): value is StateSchemaCompatibility {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['minimumReadableVersion', 'maximumReadableVersion']) &&
    isPositiveInteger(value.minimumReadableVersion) &&
    isPositiveInteger(value.maximumReadableVersion) &&
    value.minimumReadableVersion <= value.maximumReadableVersion
  );
}

export function isReleaseCompatibilityManifest(
  value: unknown,
): value is ReleaseCompatibilityManifest {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'contractVersion',
      'kind',
      'release',
      'artifactChecksum',
      'stateSchema',
    ]) &&
    value.contractVersion === contractVersion &&
    value.kind === 'release-compatibility' &&
    isCoreShellReleasePairing(value.release) &&
    isSha256Digest(value.artifactChecksum) &&
    isCompatibilityRange(value.stateSchema)
  );
}

function isMigrationDescriptor(value: unknown): value is MigrationDescriptor {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['version', 'name', 'checksum']) &&
    isPositiveInteger(value.version) &&
    isBoundedString(value.name, 128) &&
    /^[a-z][a-z0-9-]*$/u.test(value.name) &&
    isSha256Digest(value.checksum)
  );
}

function isAppliedMigrationRecord(
  value: unknown,
): value is AppliedMigrationRecord {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['version', 'name', 'checksum', 'appliedAt']) &&
    isPositiveInteger(value.version) &&
    isBoundedString(value.name, 128) &&
    /^[a-z][a-z0-9-]*$/u.test(value.name) &&
    isSha256Digest(value.checksum) &&
    isIsoInstant(value.appliedAt)
  );
}

function isOrderedHistory(
  value: readonly { readonly version: number }[],
): boolean {
  return value.every((entry, index) => entry.version === index + 1);
}

export function isDurableMigrationState(
  value: unknown,
): value is DurableMigrationState {
  return safelyValidate(
    () =>
      isPlainObject(value) &&
      hasExactKeys(value, [
        'contractVersion',
        'workspace',
        'stateSchemaVersion',
        'release',
        'history',
      ]) &&
      value.contractVersion === contractVersion &&
      isWorkspaceLike(value.workspace) &&
      isPositiveInteger(value.stateSchemaVersion) &&
      value.stateSchemaVersion <= migrationRecordLimits.maximumSchemaVersion &&
      isCoreShellReleasePairing(value.release) &&
      isReleasePairForWorkspace(value.release, value.workspace) &&
      isDenseArray(value.history) &&
      value.history.every(isAppliedMigrationRecord) &&
      value.history.length === value.stateSchemaVersion &&
      isOrderedHistory(value.history),
  );
}

function isWorkspaceLike(value: unknown): value is Workspace {
  if (!isPlainObject(value) || value.contractVersion !== contractVersion) {
    return false;
  }
  if (value.kind === 'self-hosted-installation') {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'kind',
        'workspaceId',
        'installationId',
      ]) &&
      isScopeIdentifier('workspace', value.workspaceId) &&
      isScopeIdentifier('installation', value.installationId)
    );
  }
  return (
    value.kind === 'hosted-organization' &&
    hasExactKeys(value, [
      'contractVersion',
      'kind',
      'workspaceId',
      'organizationId',
    ]) &&
    isScopeIdentifier('workspace', value.workspaceId) &&
    isScopeIdentifier('organization', value.organizationId)
  );
}

function isMigrationDescriptorArray(
  value: unknown,
): value is readonly MigrationDescriptor[] {
  return (
    isDenseArray(value) &&
    value.length <= migrationRecordLimits.maximumBundleSteps &&
    value.every(isMigrationDescriptor)
  );
}

export function isForwardMigrationBundle(
  value: unknown,
): value is ForwardMigrationBundle {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'contractVersion',
      'kind',
      'workspace',
      'fromRelease',
      'toRelease',
      'expectedHistory',
      'steps',
      'bundleChecksum',
    ]) &&
    value.contractVersion === contractVersion &&
    value.kind === 'forward-migration-bundle' &&
    isWorkspaceLike(value.workspace) &&
    isReleaseCompatibilityManifest(value.fromRelease) &&
    isReleaseCompatibilityManifest(value.toRelease) &&
    isMigrationDescriptorArray(value.expectedHistory) &&
    isMigrationDescriptorArray(value.steps) &&
    isSha256Digest(value.bundleChecksum) &&
    value.bundleChecksum ===
      forwardMigrationBundleChecksum({
        contractVersion: value.contractVersion,
        kind: value.kind,
        workspace: value.workspace,
        fromRelease: value.fromRelease,
        toRelease: value.toRelease,
        expectedHistory: value.expectedHistory,
        steps: value.steps,
      })
  );
}

export function forwardMigrationBundleChecksum(
  value: Omit<ForwardMigrationBundle, 'bundleChecksum'>,
): Sha256Digest {
  return sha256Digest({
    contractVersion: value.contractVersion,
    kind: value.kind,
    workspace: value.workspace,
    fromRelease: value.fromRelease,
    toRelease: value.toRelease,
    expectedHistory: value.expectedHistory,
    steps: value.steps,
  }) as Sha256Digest;
}

function isForwardMigrationPlan(value: unknown): value is ForwardMigrationPlan {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      'workspace',
      'fromSchemaVersion',
      'toSchemaVersion',
      'fromRelease',
      'toRelease',
      'steps',
    ]) ||
    !isWorkspaceLike(value.workspace) ||
    !isPositiveInteger(value.fromSchemaVersion) ||
    !isPositiveInteger(value.toSchemaVersion) ||
    value.toSchemaVersion <= value.fromSchemaVersion ||
    !isCoreShellReleasePairing(value.fromRelease) ||
    !isCoreShellReleasePairing(value.toRelease) ||
    !isReleasePairForWorkspace(value.fromRelease, value.workspace) ||
    !isReleasePairForWorkspace(value.toRelease, value.workspace) ||
    !isMigrationDescriptorArray(value.steps) ||
    value.steps.length === 0
  ) {
    return false;
  }
  const fromSchemaVersion = value.fromSchemaVersion as number;
  const toSchemaVersion = value.toSchemaVersion as number;
  const steps = value.steps as readonly MigrationDescriptor[];
  return (
    steps.every(
      (step, index) => step.version === fromSchemaVersion + index + 1,
    ) && steps.at(-1)?.version === toSchemaVersion
  );
}

function historyMatches(
  history: readonly AppliedMigrationRecord[],
  expected: readonly MigrationDescriptor[],
): boolean {
  return (
    history.length === expected.length &&
    history.every((record, index) => {
      const descriptor = expected[index];
      return (
        descriptor !== undefined &&
        record.version === descriptor.version &&
        record.name === descriptor.name &&
        record.checksum === descriptor.checksum
      );
    })
  );
}

function readsSchema(
  manifest: ReleaseCompatibilityManifest,
  version: number,
): boolean {
  return (
    version >= manifest.stateSchema.minimumReadableVersion &&
    version <= manifest.stateSchema.maximumReadableVersion
  );
}

export function assessForwardMigration(
  state: DurableMigrationState,
  bundle: ForwardMigrationBundle,
): ForwardMigrationAssessment {
  if (!isDurableMigrationState(state)) {
    return { status: 'rejected', reason: 'invalid-state' };
  }
  if (!isForwardMigrationBundle(bundle)) {
    return { status: 'rejected', reason: 'invalid-bundle' };
  }
  if (!isExactWorkspace(state.workspace, bundle.workspace)) {
    return { status: 'rejected', reason: 'workspace-mismatch' };
  }
  if (
    !sameRelease(state.release, bundle.fromRelease.release) ||
    !isReleasePairForWorkspace(bundle.toRelease.release, state.workspace)
  ) {
    return { status: 'rejected', reason: 'release-mismatch' };
  }
  if (
    !isOrderedHistory(bundle.expectedHistory) ||
    !historyMatches(state.history, bundle.expectedHistory)
  ) {
    return { status: 'rejected', reason: 'history-gap-or-tampering' };
  }
  if (!readsSchema(bundle.fromRelease, state.stateSchemaVersion)) {
    return { status: 'rejected', reason: 'future-schema-not-readable' };
  }
  if (bundle.steps.length === 0) {
    return { status: 'rejected', reason: 'downgrade-not-supported' };
  }
  const expectedFirst = state.stateSchemaVersion + 1;
  if (
    bundle.steps.some((step, index) => step.version !== expectedFirst + index)
  ) {
    return { status: 'rejected', reason: 'history-gap-or-tampering' };
  }
  const toSchemaVersion = bundle.steps.at(-1)?.version ?? 0;
  if (toSchemaVersion <= state.stateSchemaVersion) {
    return { status: 'rejected', reason: 'downgrade-not-supported' };
  }
  if (toSchemaVersion > migrationRecordLimits.maximumSchemaVersion) {
    return { status: 'rejected', reason: 'future-schema-not-readable' };
  }
  if (!readsSchema(bundle.toRelease, toSchemaVersion)) {
    return { status: 'rejected', reason: 'future-schema-not-readable' };
  }
  return cloneJsonValue({
    status: 'ready',
    plan: {
      workspace: state.workspace,
      fromSchemaVersion: state.stateSchemaVersion,
      toSchemaVersion,
      fromRelease: state.release,
      toRelease: bundle.toRelease.release,
      steps: bundle.steps,
    },
  });
}

/**
 * Records the atomic boundary: failure returns the exact prior state, while a
 * commit appends every ordered step together. There is no partial result.
 */
export function finalizeForwardMigration(
  state: DurableMigrationState,
  assessment: ForwardMigrationAssessment,
  appliedAt: IsoInstant,
  outcome: 'commit' | 'fail',
): MigrationExecutionResult {
  if (
    outcome === 'fail' ||
    assessment.status !== 'ready' ||
    !isForwardMigrationPlan(assessment.plan) ||
    !isIsoInstant(appliedAt) ||
    !isDurableMigrationState(state) ||
    !isExactWorkspace(state.workspace, assessment.plan.workspace) ||
    assessment.plan.fromSchemaVersion !== state.stateSchemaVersion ||
    !sameRelease(state.release, assessment.plan.fromRelease)
  ) {
    return { status: 'failed', reason: 'migration-step-failed', state };
  }
  return {
    status: 'applied',
    state: cloneJsonValue({
      contractVersion,
      workspace: state.workspace,
      stateSchemaVersion: assessment.plan.toSchemaVersion,
      release: assessment.plan.toRelease,
      history: [
        ...state.history,
        ...assessment.plan.steps.map((step) => ({ ...step, appliedAt })),
      ],
    }),
  };
}

export function planReleaseRollback(options: {
  readonly currentState: DurableMigrationState;
  readonly predecessor: ReleaseCompatibilityManifest;
  readonly preMigrationBackup: ProtectedBackupManifest | null;
}): ReleaseRollbackPlan {
  if (!isDurableMigrationState(options.currentState)) {
    return { status: 'rejected', reason: 'invalid-current-state' };
  }
  if (!isReleaseCompatibilityManifest(options.predecessor)) {
    return { status: 'rejected', reason: 'invalid-predecessor' };
  }
  const { currentState, predecessor, preMigrationBackup } = options;
  if (!isReleasePairForWorkspace(predecessor.release, currentState.workspace)) {
    return { status: 'rejected', reason: 'shell-kind-mismatch' };
  }
  if (readsSchema(predecessor, currentState.stateSchemaVersion)) {
    return cloneJsonValue({
      status: 'ready',
      strategy: 'code-rollback',
      predecessor: predecessor.release,
      stateSchemaVersion: currentState.stateSchemaVersion,
    });
  }
  if (
    preMigrationBackup === null ||
    !isProtectedBackupManifest(preMigrationBackup)
  ) {
    return { status: 'rejected', reason: 'backup-required' };
  }
  if (!isExactWorkspace(preMigrationBackup.workspace, currentState.workspace)) {
    return { status: 'rejected', reason: 'backup-workspace-mismatch' };
  }
  if (!sameRelease(preMigrationBackup.release, predecessor.release)) {
    return { status: 'rejected', reason: 'backup-release-mismatch' };
  }
  if (!readsSchema(predecessor, preMigrationBackup.stateSchemaVersion)) {
    return { status: 'rejected', reason: 'backup-schema-incompatible' };
  }
  return cloneJsonValue({
    status: 'ready',
    strategy: 'restore-protected-backup-then-code-rollback',
    predecessor: predecessor.release,
    backup: preMigrationBackup,
    requiresIsolatedRestore: true,
  });
}
