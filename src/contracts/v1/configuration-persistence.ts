import {
  configurationDigest,
  configurationSchemaVersion,
  configurationStateSchemaVersion,
  isConfigurationStateSnapshot,
  isEditableConfiguration,
  stateIdentifier,
  type ClassCodeStateId,
  type ConfigurationAuditEventId,
  type ConfigurationDraftId,
  type ConfigurationRevisionId,
  type ConfigurationStateSnapshot,
  type EditableConfiguration,
  type PortableExportId,
  type PreviewId,
  type ProtectedBackupId,
  type ProtectedSecretReference,
  type Sha256Digest,
  type SourceConfigurationRecord,
} from './configuration-state.js';
import {
  contractVersion,
  type ContractEnvelope,
  type IsoDate,
  type IsoInstant,
} from './common.js';
import {
  canonicalJson,
  hasExactKeys,
  hasUniqueValues,
  isBoundedString,
  isDenseArray,
  isIsoDate,
  isIsoInstant,
  isNonNegativeInteger,
  isPlainObject,
  isPositiveInteger,
  isScopeIdentifier,
  isSha256Digest,
  isSorted,
  safelyValidate,
  sha256Digest,
} from './state-contract-validation.js';
import {
  isAuditScope,
  isScopedTarget,
  isWorkspace,
  type AuditScope,
  type ResourceId,
  type ResourceKind,
  type ScopedTargets,
  type ScreenId,
  type Workspace,
  type WorkspaceId,
} from './workspace.js';

export const portableConfigurationExportVersion = 1 as const;
export const protectedBackupManifestVersion = 1 as const;

/** Low-privilege admission still requires non-sequential, rate-limited codes. */
export const viewerClassCodePolicy = {
  version: 1,
  minimumEntropyBits: 64,
  minimumLength: 12,
  maximumLength: 32,
  maximumViewerSessionLifetimeSeconds: 43_200,
} as const;

export interface ConfigurationPreviewDraftBasis {
  readonly kind: 'draft';
  readonly draftId: ConfigurationDraftId;
  readonly draftVersion: number;
  readonly contentChecksum: Sha256Digest;
}

export interface ConfigurationPreviewRevisionBasis {
  readonly kind: 'revision';
  readonly revisionId: ConfigurationRevisionId;
  readonly contentChecksum: Sha256Digest;
}

export type ConfigurationPreviewBasis =
  ConfigurationPreviewDraftBasis | ConfigurationPreviewRevisionBasis;

export interface ConfigurationPreviewSnapshot extends ContractEnvelope {
  readonly recordKind: 'configuration-preview';
  readonly workspaceId: WorkspaceId;
  readonly previewId: PreviewId;
  readonly basis: ConfigurationPreviewBasis;
  readonly targets: ScopedTargets;
  readonly status: 'ready' | 'invalid';
  readonly diagnosticCodes: readonly string[];
  readonly generatedAt: IsoInstant;
  readonly expiresAt: IsoInstant;
}

export interface CreateConfigurationPreviewRequest extends ContractEnvelope {
  readonly workspaceId: WorkspaceId;
  readonly expectedStateVersion: number;
  readonly previewId: PreviewId;
  readonly basis: ConfigurationPreviewBasis;
  readonly targets: ScopedTargets;
  readonly status: 'ready' | 'invalid';
  readonly diagnosticCodes: readonly string[];
  readonly generatedAt: IsoInstant;
  readonly expiresAt: IsoInstant;
  readonly auditScope: AuditScope;
}

export type ConfigurationPreviewResult =
  | {
      readonly status: 'created';
      readonly state: ConfigurationStateSnapshot;
      readonly snapshot: ConfigurationPreviewSnapshot;
    }
  | {
      readonly status: 'conflict';
      readonly reason: 'state-version-changed' | 'basis-version-changed';
      readonly state: ConfigurationStateSnapshot;
    }
  | {
      readonly status: 'rejected';
      readonly reason:
        | 'invalid-state'
        | 'invalid-request'
        | 'workspace-mismatch'
        | 'basis-not-found';
      readonly state: ConfigurationStateSnapshot;
    };

export interface ActiveClassCodeState extends ContractEnvelope {
  readonly recordKind: 'class-code-state';
  readonly status: 'active';
  readonly workspaceId: WorkspaceId;
  readonly classCodeStateId: ClassCodeStateId;
  readonly screenId: ScreenId;
  readonly policyVersion: typeof viewerClassCodePolicy.version;
  readonly verifierReference: ProtectedSecretReference;
  readonly verifierVersion: number;
  readonly rotatedAt: IsoInstant;
}

export interface RevokedClassCodeState extends ContractEnvelope {
  readonly recordKind: 'class-code-state';
  readonly status: 'revoked';
  readonly workspaceId: WorkspaceId;
  readonly classCodeStateId: ClassCodeStateId;
  readonly screenId: ScreenId;
  readonly policyVersion: typeof viewerClassCodePolicy.version;
  readonly verifierVersion: number;
  readonly revokedAt: IsoInstant;
}

export type ClassCodeState = ActiveClassCodeState | RevokedClassCodeState;

export const configurationAuditActions = [
  'draft-saved',
  'draft-validated',
  'revision-activated',
  'revision-rolled-back',
  'preview-created',
  'portable-export-created',
  'protected-backup-created',
  'restore-validated',
  'migration-applied',
] as const;

export type ConfigurationAuditAction =
  (typeof configurationAuditActions)[number];

export interface ConfigurationAuditEvent extends ContractEnvelope {
  readonly recordKind: 'configuration-audit-event';
  readonly eventId: ConfigurationAuditEventId;
  readonly auditScope: AuditScope;
  readonly action: ConfigurationAuditAction;
  readonly outcome: 'succeeded' | 'rejected' | 'conflict' | 'failed';
  readonly subjectKind:
    'draft' | 'revision' | 'preview' | 'export' | 'backup' | 'migration';
  readonly subjectReference: ResourceId;
  readonly stateVersionBefore: number;
  readonly stateVersionAfter: number;
  readonly configurationRevisionId: ConfigurationRevisionId | null;
  readonly occurredAt: IsoInstant;
}

interface PortableSourceRecordBase {
  readonly workspaceId: WorkspaceId;
  readonly sourceId: ResourceId;
  readonly sourceKind: ResourceKind;
  readonly enabled: boolean;
  readonly definitionReference: ResourceId;
}

export type PortableSourceRecord =
  | (PortableSourceRecordBase & {
      readonly mode:
        'application-managed' | 'uploaded-snapshot' | 'shared-resource';
    })
  | (PortableSourceRecordBase & {
      readonly mode: 'connected-account';
      readonly connectionRequired: true;
    });

export interface PortableConfigurationContent extends ContractEnvelope {
  readonly configurationSchemaVersion: typeof configurationSchemaVersion;
  readonly workspace: Workspace;
  readonly timePolicy: EditableConfiguration['timePolicy'];
  readonly rooms: EditableConfiguration['rooms'];
  readonly screens: EditableConfiguration['screens'];
  readonly sources: readonly PortableSourceRecord[];
}

export interface PortableConfigurationExportManifest {
  readonly kind: 'portable-configuration-export';
  readonly exportVersion: typeof portableConfigurationExportVersion;
  readonly exportId: PortableExportId;
  readonly workspace: Workspace;
  readonly configurationRevisionId: ConfigurationRevisionId;
  readonly stateSchemaVersion: typeof configurationStateSchemaVersion;
  readonly canonicalization: 'sorted-json-v1';
  readonly createdAt: IsoInstant;
  readonly contentChecksum: Sha256Digest;
}

export interface PortableConfigurationExport extends ContractEnvelope {
  readonly manifest: PortableConfigurationExportManifest;
  readonly configuration: PortableConfigurationContent;
  readonly integrity: {
    readonly algorithm: 'sha256';
    readonly manifestAndContentChecksum: Sha256Digest;
  };
}

export interface SelfHostedReleasePairing {
  readonly shellKind: 'self-hosted';
  readonly coreVersion: string;
  readonly shellVersion: string;
}

export interface HostedReleasePairing {
  readonly shellKind: 'hosted';
  readonly coreVersion: string;
  readonly shellVersion: string;
}

export type CoreShellReleasePairing =
  SelfHostedReleasePairing | HostedReleasePairing;

export interface ProtectedBackupManifest extends ContractEnvelope {
  readonly kind: 'protected-full-backup';
  readonly manifestVersion: typeof protectedBackupManifestVersion;
  readonly backupId: ProtectedBackupId;
  readonly workspace: Workspace;
  readonly stateSchemaVersion: number;
  readonly migrationVersion: number;
  readonly release: CoreShellReleasePairing;
  readonly artifact: {
    readonly artifactReference: ResourceId;
    readonly checksum: Sha256Digest;
    readonly byteLength: number;
  };
  readonly createdAt: IsoInstant;
  readonly restoration: {
    readonly mode: 'exact-workspace-isolated';
    readonly requiresIntegrityVerification: true;
    readonly containsProtectedState: true;
  };
}

export type ArtifactAdmissionResult =
  | { readonly status: 'accepted'; readonly workspaceId: WorkspaceId }
  | {
      readonly status: 'rejected';
      readonly reason:
        'invalid-artifact' | 'workspace-mismatch' | 'checksum-mismatch';
    };

function isStateIdentifier(value: unknown): value is string {
  try {
    stateIdentifier('configuration-revision', value);
    return true;
  } catch {
    return false;
  }
}

function isConfigurationPreviewBasis(
  value: unknown,
): value is ConfigurationPreviewBasis {
  if (!isPlainObject(value)) return false;
  if (value.kind === 'draft') {
    return (
      hasExactKeys(value, [
        'kind',
        'draftId',
        'draftVersion',
        'contentChecksum',
      ]) &&
      isStateIdentifier(value.draftId) &&
      isPositiveInteger(value.draftVersion) &&
      isSha256Digest(value.contentChecksum)
    );
  }
  return (
    value.kind === 'revision' &&
    hasExactKeys(value, ['kind', 'revisionId', 'contentChecksum']) &&
    isStateIdentifier(value.revisionId) &&
    isSha256Digest(value.contentChecksum)
  );
}

function isDiagnosticCodes(value: unknown): value is readonly string[] {
  return (
    isDenseArray(value) &&
    value.length <= 32 &&
    value.every((entry) =>
      typeof entry === 'string' ? /^[a-z][a-z0-9-]{0,63}$/u.test(entry) : false,
    ) &&
    hasUniqueValues(value as readonly string[]) &&
    isSorted(value as readonly string[])
  );
}

function isScopedTargets(value: unknown): value is ScopedTargets {
  return (
    isDenseArray(value) &&
    value.length > 0 &&
    value.length <= 16 &&
    value.every(isScopedTarget)
  );
}

export function isConfigurationPreviewSnapshot(
  value: unknown,
): value is ConfigurationPreviewSnapshot {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'contractVersion',
      'recordKind',
      'workspaceId',
      'previewId',
      'basis',
      'targets',
      'status',
      'diagnosticCodes',
      'generatedAt',
      'expiresAt',
    ]) &&
    value.contractVersion === contractVersion &&
    value.recordKind === 'configuration-preview' &&
    isScopeIdentifier('workspace', value.workspaceId) &&
    isStateIdentifier(value.previewId) &&
    isConfigurationPreviewBasis(value.basis) &&
    isScopedTargets(value.targets) &&
    value.targets.every((target) => target.workspaceId === value.workspaceId) &&
    (value.status === 'ready' || value.status === 'invalid') &&
    isDiagnosticCodes(value.diagnosticCodes) &&
    (value.status === 'ready'
      ? value.diagnosticCodes.length === 0
      : value.diagnosticCodes.length > 0) &&
    isIsoInstant(value.generatedAt) &&
    isIsoInstant(value.expiresAt) &&
    Date.parse(value.generatedAt) < Date.parse(value.expiresAt)
  );
}

function isCreateConfigurationPreviewRequest(
  value: unknown,
): value is CreateConfigurationPreviewRequest {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'contractVersion',
      'workspaceId',
      'expectedStateVersion',
      'previewId',
      'basis',
      'targets',
      'status',
      'diagnosticCodes',
      'generatedAt',
      'expiresAt',
      'auditScope',
    ]) &&
    value.contractVersion === contractVersion &&
    isScopeIdentifier('workspace', value.workspaceId) &&
    isNonNegativeInteger(value.expectedStateVersion) &&
    isStateIdentifier(value.previewId) &&
    isConfigurationPreviewBasis(value.basis) &&
    isScopedTargets(value.targets) &&
    value.targets.every((target) => target.workspaceId === value.workspaceId) &&
    (value.status === 'ready' || value.status === 'invalid') &&
    isDiagnosticCodes(value.diagnosticCodes) &&
    (value.status === 'ready'
      ? value.diagnosticCodes.length === 0
      : value.diagnosticCodes.length > 0) &&
    isIsoInstant(value.generatedAt) &&
    isIsoInstant(value.expiresAt) &&
    Date.parse(value.generatedAt) < Date.parse(value.expiresAt) &&
    isAuditScope(value.auditScope) &&
    value.auditScope.workspaceId === value.workspaceId
  );
}

export function createConfigurationPreview(
  state: ConfigurationStateSnapshot,
  request: CreateConfigurationPreviewRequest,
): ConfigurationPreviewResult {
  if (!isConfigurationStateSnapshot(state)) {
    return { status: 'rejected', reason: 'invalid-state', state };
  }
  if (!isCreateConfigurationPreviewRequest(request)) {
    return { status: 'rejected', reason: 'invalid-request', state };
  }
  if (state.workspace.workspaceId !== request.workspaceId) {
    return { status: 'rejected', reason: 'workspace-mismatch', state };
  }
  if (state.stateVersion !== request.expectedStateVersion) {
    return { status: 'conflict', reason: 'state-version-changed', state };
  }

  const requestedBasis = request.basis;
  const basis =
    requestedBasis.kind === 'draft'
      ? state.drafts.find((draft) => draft.draftId === requestedBasis.draftId)
      : state.revisions.find(
          (revision) => revision.revisionId === requestedBasis.revisionId,
        );
  if (basis === undefined) {
    return { status: 'rejected', reason: 'basis-not-found', state };
  }
  const versionMatches =
    requestedBasis.kind === 'draft'
      ? 'draftVersion' in basis &&
        basis.draftVersion === requestedBasis.draftVersion
      : 'contentChecksum' in basis;
  const checksum =
    'contentChecksum' in basis
      ? basis.contentChecksum
      : configurationDigest(basis.content);
  if (!versionMatches || checksum !== requestedBasis.contentChecksum) {
    return { status: 'conflict', reason: 'basis-version-changed', state };
  }
  const snapshot: ConfigurationPreviewSnapshot = {
    contractVersion,
    recordKind: 'configuration-preview',
    workspaceId: request.workspaceId,
    previewId: request.previewId,
    basis: requestedBasis,
    targets: request.targets,
    status: request.status,
    diagnosticCodes: request.diagnosticCodes,
    generatedAt: request.generatedAt,
    expiresAt: request.expiresAt,
  };
  return { status: 'created', state, snapshot };
}

export function isClassCodeState(value: unknown): value is ClassCodeState {
  if (
    !isPlainObject(value) ||
    value.contractVersion !== contractVersion ||
    value.recordKind !== 'class-code-state' ||
    !isScopeIdentifier('workspace', value.workspaceId) ||
    !isStateIdentifier(value.classCodeStateId) ||
    !isScopeIdentifier('screen', value.screenId) ||
    value.policyVersion !== viewerClassCodePolicy.version ||
    !isPositiveInteger(value.verifierVersion)
  ) {
    return false;
  }
  if (value.status === 'active') {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'recordKind',
        'status',
        'workspaceId',
        'classCodeStateId',
        'screenId',
        'policyVersion',
        'verifierReference',
        'verifierVersion',
        'rotatedAt',
      ]) &&
      isProtectedReference(value.verifierReference) &&
      isIsoInstant(value.rotatedAt)
    );
  }
  return (
    value.status === 'revoked' &&
    hasExactKeys(value, [
      'contractVersion',
      'recordKind',
      'status',
      'workspaceId',
      'classCodeStateId',
      'screenId',
      'policyVersion',
      'verifierVersion',
      'revokedAt',
    ]) &&
    isIsoInstant(value.revokedAt)
  );
}

function isProtectedReference(
  value: unknown,
): value is ProtectedSecretReference {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['kind', 'referenceId']) &&
    value.kind === 'protected-secret-reference' &&
    isStateIdentifier(value.referenceId)
  );
}

export function isConfigurationAuditEvent(
  value: unknown,
): value is ConfigurationAuditEvent {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'contractVersion',
      'recordKind',
      'eventId',
      'auditScope',
      'action',
      'outcome',
      'subjectKind',
      'subjectReference',
      'stateVersionBefore',
      'stateVersionAfter',
      'configurationRevisionId',
      'occurredAt',
    ]) &&
    value.contractVersion === contractVersion &&
    value.recordKind === 'configuration-audit-event' &&
    isStateIdentifier(value.eventId) &&
    isAuditScope(value.auditScope) &&
    configurationAuditActions.includes(
      value.action as ConfigurationAuditAction,
    ) &&
    ['succeeded', 'rejected', 'conflict', 'failed'].includes(
      value.outcome as string,
    ) &&
    ['draft', 'revision', 'preview', 'export', 'backup', 'migration'].includes(
      value.subjectKind as string,
    ) &&
    isScopeIdentifier('resource', value.subjectReference) &&
    isNonNegativeInteger(value.stateVersionBefore) &&
    isNonNegativeInteger(value.stateVersionAfter) &&
    (value.configurationRevisionId === null ||
      isStateIdentifier(value.configurationRevisionId)) &&
    isIsoInstant(value.occurredAt)
  );
}

function portableSource(
  source: SourceConfigurationRecord,
): PortableSourceRecord {
  const common = {
    workspaceId: source.workspaceId,
    sourceId: source.sourceId,
    sourceKind: source.sourceKind,
    enabled: source.enabled,
    definitionReference: source.definitionReference,
  } as const;
  return source.mode === 'connected-account'
    ? { ...common, mode: source.mode, connectionRequired: true }
    : { ...common, mode: source.mode };
}

export function createPortableConfigurationExport(options: {
  readonly exportId: PortableExportId;
  readonly revisionId: ConfigurationRevisionId;
  readonly configuration: EditableConfiguration;
  readonly createdAt: IsoInstant;
}): PortableConfigurationExport {
  if (
    !isStateIdentifier(options.exportId) ||
    !isStateIdentifier(options.revisionId) ||
    !isEditableConfiguration(options.configuration) ||
    !isIsoInstant(options.createdAt)
  ) {
    throw new TypeError('Invalid portable export input.');
  }
  const configuration: PortableConfigurationContent = {
    contractVersion,
    configurationSchemaVersion,
    workspace: options.configuration.workspace,
    timePolicy: options.configuration.timePolicy,
    rooms: options.configuration.rooms,
    screens: options.configuration.screens,
    sources: options.configuration.sources.map(portableSource),
  };
  const manifest: PortableConfigurationExportManifest = {
    kind: 'portable-configuration-export',
    exportVersion: portableConfigurationExportVersion,
    exportId: options.exportId,
    workspace: options.configuration.workspace,
    configurationRevisionId: options.revisionId,
    stateSchemaVersion: configurationStateSchemaVersion,
    canonicalization: 'sorted-json-v1',
    createdAt: options.createdAt,
    contentChecksum: configurationDigest(configuration),
  };
  return {
    contractVersion,
    manifest,
    configuration,
    integrity: {
      algorithm: 'sha256',
      manifestAndContentChecksum: sha256Digest({
        manifest,
        configuration,
      }) as Sha256Digest,
    },
  };
}

function isPortableSourceRecord(value: unknown): value is PortableSourceRecord {
  if (!isPlainObject(value)) return false;
  const connected = value.mode === 'connected-account';
  return (
    hasExactKeys(
      value,
      connected
        ? [
            'workspaceId',
            'sourceId',
            'sourceKind',
            'enabled',
            'definitionReference',
            'mode',
            'connectionRequired',
          ]
        : [
            'workspaceId',
            'sourceId',
            'sourceKind',
            'enabled',
            'definitionReference',
            'mode',
          ],
    ) &&
    isScopeIdentifier('workspace', value.workspaceId) &&
    isScopeIdentifier('resource', value.sourceId) &&
    isScopeIdentifier('resource-kind', value.sourceKind) &&
    typeof value.enabled === 'boolean' &&
    isScopeIdentifier('resource', value.definitionReference) &&
    (connected
      ? value.connectionRequired === true
      : [
          'application-managed',
          'uploaded-snapshot',
          'shared-resource',
        ].includes(value.mode as string))
  );
}

function isPortableConfigurationContent(
  value: unknown,
): value is PortableConfigurationContent {
  return safelyValidate(() => {
    const baseValid =
      isPlainObject(value) &&
      hasExactKeys(value, [
        'contractVersion',
        'configurationSchemaVersion',
        'workspace',
        'timePolicy',
        'rooms',
        'screens',
        'sources',
      ]) &&
      value.contractVersion === contractVersion &&
      value.configurationSchemaVersion === configurationSchemaVersion &&
      isWorkspace(value.workspace) &&
      isPlainObject(value.timePolicy) &&
      hasExactKeys(value.timePolicy, ['timeZone', 'datePolicyReference']) &&
      isBoundedString(value.timePolicy.timeZone, 128) &&
      isScopeIdentifier('resource', value.timePolicy.datePolicyReference) &&
      isDenseArray(value.rooms) &&
      isDenseArray(value.screens) &&
      isDenseArray(value.sources) &&
      value.sources.every(isPortableSourceRecord);
    if (!baseValid) return false;
    const workspace = value.workspace as Workspace;
    const sources = value.sources as readonly PortableSourceRecord[];
    const editableCandidate = {
      ...value,
      sources: sources.map((source) =>
        source.mode === 'connected-account'
          ? {
              workspaceId: source.workspaceId,
              sourceId: source.sourceId,
              sourceKind: source.sourceKind,
              enabled: source.enabled,
              definitionReference: source.definitionReference,
              mode: source.mode,
              connectionReference: {
                kind: 'protected-secret-reference',
                referenceId: 'redacted-reference',
              },
            }
          : source,
      ),
    };
    return (
      sources.every((source) => source.workspaceId === workspace.workspaceId) &&
      isEditableConfiguration(editableCandidate)
    );
  });
}

export function isPortableConfigurationExport(
  value: unknown,
): value is PortableConfigurationExport {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, [
        'contractVersion',
        'manifest',
        'configuration',
        'integrity',
      ]) ||
      value.contractVersion !== contractVersion ||
      !isPlainObject(value.manifest) ||
      !hasExactKeys(value.manifest, [
        'kind',
        'exportVersion',
        'exportId',
        'workspace',
        'configurationRevisionId',
        'stateSchemaVersion',
        'canonicalization',
        'createdAt',
        'contentChecksum',
      ]) ||
      value.manifest.kind !== 'portable-configuration-export' ||
      value.manifest.exportVersion !== portableConfigurationExportVersion ||
      !isStateIdentifier(value.manifest.exportId) ||
      !isWorkspace(value.manifest.workspace) ||
      !isStateIdentifier(value.manifest.configurationRevisionId) ||
      value.manifest.stateSchemaVersion !== configurationStateSchemaVersion ||
      value.manifest.canonicalization !== 'sorted-json-v1' ||
      !isIsoInstant(value.manifest.createdAt) ||
      !isSha256Digest(value.manifest.contentChecksum) ||
      !isPortableConfigurationContent(value.configuration) ||
      value.configuration.workspace.workspaceId !==
        value.manifest.workspace.workspaceId ||
      value.manifest.contentChecksum !==
        configurationDigest(value.configuration) ||
      !isPlainObject(value.integrity) ||
      !hasExactKeys(value.integrity, [
        'algorithm',
        'manifestAndContentChecksum',
      ]) ||
      value.integrity.algorithm !== 'sha256' ||
      !isSha256Digest(value.integrity.manifestAndContentChecksum)
    ) {
      return false;
    }
    return (
      value.integrity.manifestAndContentChecksum ===
      sha256Digest({
        manifest: value.manifest,
        configuration: value.configuration,
      })
    );
  });
}

export function isCoreShellReleasePairing(
  value: unknown,
): value is CoreShellReleasePairing {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['shellKind', 'coreVersion', 'shellVersion']) &&
    (value.shellKind === 'self-hosted' || value.shellKind === 'hosted') &&
    typeof value.coreVersion === 'string' &&
    /^0\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(value.coreVersion) &&
    typeof value.shellVersion === 'string' &&
    /^0\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(value.shellVersion)
  );
}

export function isProtectedBackupManifest(
  value: unknown,
): value is ProtectedBackupManifest {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'contractVersion',
      'kind',
      'manifestVersion',
      'backupId',
      'workspace',
      'stateSchemaVersion',
      'migrationVersion',
      'release',
      'artifact',
      'createdAt',
      'restoration',
    ]) &&
    value.contractVersion === contractVersion &&
    value.kind === 'protected-full-backup' &&
    value.manifestVersion === protectedBackupManifestVersion &&
    isStateIdentifier(value.backupId) &&
    isWorkspace(value.workspace) &&
    isPositiveInteger(value.stateSchemaVersion) &&
    isNonNegativeInteger(value.migrationVersion) &&
    isCoreShellReleasePairing(value.release) &&
    ((value.workspace.kind === 'self-hosted-installation' &&
      value.release.shellKind === 'self-hosted') ||
      (value.workspace.kind === 'hosted-organization' &&
        value.release.shellKind === 'hosted')) &&
    isPlainObject(value.artifact) &&
    hasExactKeys(value.artifact, [
      'artifactReference',
      'checksum',
      'byteLength',
    ]) &&
    isScopeIdentifier('resource', value.artifact.artifactReference) &&
    isSha256Digest(value.artifact.checksum) &&
    isPositiveInteger(value.artifact.byteLength) &&
    isIsoInstant(value.createdAt) &&
    isPlainObject(value.restoration) &&
    hasExactKeys(value.restoration, [
      'mode',
      'requiresIntegrityVerification',
      'containsProtectedState',
    ]) &&
    value.restoration.mode === 'exact-workspace-isolated' &&
    value.restoration.requiresIntegrityVerification === true &&
    value.restoration.containsProtectedState === true
  );
}

export function evaluatePortableImport(
  workspace: Workspace,
  artifact: unknown,
): ArtifactAdmissionResult {
  if (!isPortableConfigurationExport(artifact)) {
    return { status: 'rejected', reason: 'invalid-artifact' };
  }
  if (artifact.manifest.workspace.workspaceId !== workspace.workspaceId) {
    return { status: 'rejected', reason: 'workspace-mismatch' };
  }
  return { status: 'accepted', workspaceId: workspace.workspaceId };
}

export function evaluateProtectedRestore(
  workspace: Workspace,
  manifest: unknown,
  observedChecksum: unknown,
): ArtifactAdmissionResult {
  if (!isProtectedBackupManifest(manifest)) {
    return { status: 'rejected', reason: 'invalid-artifact' };
  }
  if (manifest.workspace.workspaceId !== workspace.workspaceId) {
    return { status: 'rejected', reason: 'workspace-mismatch' };
  }
  if (
    !isSha256Digest(observedChecksum) ||
    observedChecksum !== manifest.artifact.checksum
  ) {
    return { status: 'rejected', reason: 'checksum-mismatch' };
  }
  return { status: 'accepted', workspaceId: workspace.workspaceId };
}

/** Canonical bytes exclude the protected backup artifact itself. */
export function canonicalPortableExportJson(
  value: PortableConfigurationExport,
): string {
  if (!isPortableConfigurationExport(value)) {
    throw new TypeError('Invalid portable configuration export.');
  }
  return canonicalJson(value);
}

/** Exact target helper used by representative preview fixtures. */
export function dateTarget(
  workspaceId: WorkspaceId,
  date: IsoDate,
): {
  readonly kind: 'date';
  readonly workspaceId: WorkspaceId;
  readonly date: IsoDate;
} {
  if (!isIsoDate(date)) throw new TypeError('Invalid preview date.');
  return { kind: 'date', workspaceId, date };
}
