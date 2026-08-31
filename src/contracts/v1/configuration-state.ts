import {
  contractVersion,
  type ContractEnvelope,
  type IanaTimeZone,
  type IsoInstant,
} from './common.js';
import {
  canonicalJson,
  hasExactKeys,
  hasUniqueValues,
  isBoundedString,
  isDenseArray,
  isIanaTimeZone,
  isIsoInstant,
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
  isWorkspace,
  type AuditScope,
  type ResourceId,
  type ResourceKind,
  type RoomId,
  type ScreenId,
  type Workspace,
  type WorkspaceId,
} from './workspace.js';

export const configurationSchemaVersion = 1 as const;
export const configurationStateSchemaVersion = 1 as const;
export const configurationStateRecordLimits = {
  maximumDrafts: 256,
  maximumRevisions: 256,
} as const;

declare const stateIdentifierBrand: unique symbol;

export const stateIdentifierKinds = [
  'configuration-draft',
  'configuration-revision',
  'class-code-state',
  'preview',
  'audit-event',
  'portable-export',
  'protected-backup',
  'secret-reference',
] as const;

export type StateIdentifierKind = (typeof stateIdentifierKinds)[number];
export type StateIdentifier<Kind extends StateIdentifierKind> = string & {
  readonly [stateIdentifierBrand]: Kind;
};

export type ConfigurationDraftId = StateIdentifier<'configuration-draft'>;
export type ConfigurationRevisionId = StateIdentifier<'configuration-revision'>;
export type ClassCodeStateId = StateIdentifier<'class-code-state'>;
export type PreviewId = StateIdentifier<'preview'>;
export type ConfigurationAuditEventId = StateIdentifier<'audit-event'>;
export type PortableExportId = StateIdentifier<'portable-export'>;
export type ProtectedBackupId = StateIdentifier<'protected-backup'>;
export type SecretReferenceId = StateIdentifier<'secret-reference'>;

declare const sha256DigestBrand: unique symbol;
export type Sha256Digest = `sha256:${string}` & {
  readonly [sha256DigestBrand]: 'sha256';
};

export function stateIdentifier<Kind extends StateIdentifierKind>(
  kind: Kind,
  value: unknown,
): StateIdentifier<Kind> {
  if (!isStateIdentifier(value)) {
    throw new TypeError(`Invalid ${kind} identifier.`);
  }
  return value as StateIdentifier<Kind>;
}

export function configurationDigest(value: unknown): Sha256Digest {
  return sha256Digest(value) as Sha256Digest;
}

/**
 * An opaque locator accepted only by an explicitly supplied protected-store
 * capability. The public contract intentionally exposes no enumeration API.
 */
export interface ProtectedSecretReference {
  readonly kind: 'protected-secret-reference';
  readonly referenceId: SecretReferenceId;
}

export interface TimePolicyConfiguration {
  readonly timeZone: IanaTimeZone;
  readonly datePolicyReference: ResourceId;
}

export interface RoomConfigurationRecord {
  readonly workspaceId: WorkspaceId;
  readonly roomId: RoomId;
  readonly label: string;
}

export interface ScreenConfigurationRecord {
  readonly workspaceId: WorkspaceId;
  readonly screenId: ScreenId;
  readonly roomId: RoomId;
  readonly label: string;
  readonly enabled: boolean;
  readonly classCodeStateId: ClassCodeStateId;
}

interface SourceConfigurationRecordBase {
  readonly workspaceId: WorkspaceId;
  readonly sourceId: ResourceId;
  readonly sourceKind: ResourceKind;
  readonly enabled: boolean;
  readonly definitionReference: ResourceId;
}

export interface ApplicationManagedSourceRecord extends SourceConfigurationRecordBase {
  readonly mode: 'application-managed';
}

export interface UploadedSnapshotSourceRecord extends SourceConfigurationRecordBase {
  readonly mode: 'uploaded-snapshot';
}

export interface SharedResourceSourceRecord extends SourceConfigurationRecordBase {
  readonly mode: 'shared-resource';
}

export interface ConnectedAccountSourceRecord extends SourceConfigurationRecordBase {
  readonly mode: 'connected-account';
  readonly connectionReference: ProtectedSecretReference;
}

export type SourceConfigurationRecord =
  | ApplicationManagedSourceRecord
  | UploadedSnapshotSourceRecord
  | SharedResourceSourceRecord
  | ConnectedAccountSourceRecord;

export interface EditableConfiguration extends ContractEnvelope {
  readonly configurationSchemaVersion: typeof configurationSchemaVersion;
  readonly workspace: Workspace;
  readonly timePolicy: TimePolicyConfiguration;
  readonly rooms: readonly RoomConfigurationRecord[];
  readonly screens: readonly ScreenConfigurationRecord[];
  readonly sources: readonly SourceConfigurationRecord[];
}

export interface ConfigurationDraftRecord extends ContractEnvelope {
  readonly recordKind: 'configuration-draft';
  readonly workspaceId: WorkspaceId;
  readonly draftId: ConfigurationDraftId;
  readonly draftVersion: number;
  readonly baseActiveRevisionId: ConfigurationRevisionId | null;
  readonly content: EditableConfiguration;
  readonly savedAt: IsoInstant;
}

export type ConfigurationRevisionLifecycle =
  'eligible' | 'active' | 'superseded' | 'rolled-back';

/** Content and checksum never change; lifecycle metadata moves atomically. */
export interface ConfigurationRevisionRecord extends ContractEnvelope {
  readonly recordKind: 'configuration-revision';
  readonly workspaceId: WorkspaceId;
  readonly revisionId: ConfigurationRevisionId;
  readonly revisionNumber: number;
  readonly parentRevisionId: ConfigurationRevisionId | null;
  readonly sourceDraftId: ConfigurationDraftId;
  readonly sourceDraftVersion: number;
  readonly lifecycle: ConfigurationRevisionLifecycle;
  readonly content: EditableConfiguration;
  readonly contentChecksum: Sha256Digest;
  readonly validatedAt: IsoInstant;
  readonly lifecycleChangedAt: IsoInstant;
}

export interface ActiveConfigurationPointer extends ContractEnvelope {
  readonly recordKind: 'active-configuration-pointer';
  readonly workspaceId: WorkspaceId;
  readonly pointerVersion: number;
  readonly revisionId: ConfigurationRevisionId;
  readonly selectedAt: IsoInstant;
}

export interface ConfigurationStateSnapshot extends ContractEnvelope {
  readonly stateSchemaVersion: typeof configurationStateSchemaVersion;
  readonly workspace: Workspace;
  readonly stateVersion: number;
  readonly drafts: readonly ConfigurationDraftRecord[];
  readonly revisions: readonly ConfigurationRevisionRecord[];
  readonly activePointer: ActiveConfigurationPointer | null;
}

interface ConfigurationCommandBase extends ContractEnvelope {
  readonly workspaceId: WorkspaceId;
  readonly expectedStateVersion: number;
  readonly auditScope: AuditScope;
}

export interface SaveConfigurationDraftRequest extends ConfigurationCommandBase {
  readonly kind: 'save-draft';
  readonly draftId: ConfigurationDraftId;
  readonly expectedDraftVersion: number | null;
  readonly content: EditableConfiguration;
  readonly savedAt: IsoInstant;
}

export interface ValidateConfigurationDraftRequest extends ConfigurationCommandBase {
  readonly kind: 'validate-draft';
  readonly draftId: ConfigurationDraftId;
  readonly expectedDraftVersion: number;
  readonly revisionId: ConfigurationRevisionId;
  readonly validatedAt: IsoInstant;
}

interface SelectConfigurationRevisionRequestBase extends ConfigurationCommandBase {
  readonly expectedActiveRevisionId: ConfigurationRevisionId | null;
  readonly revisionId: ConfigurationRevisionId;
  readonly selectedAt: IsoInstant;
}

export interface ActivateConfigurationRevisionRequest extends SelectConfigurationRevisionRequestBase {
  readonly kind: 'activate-revision';
}

export interface RollbackConfigurationRevisionRequest extends SelectConfigurationRevisionRequestBase {
  readonly kind: 'rollback-revision';
}

export type ConfigurationCommand =
  | SaveConfigurationDraftRequest
  | ValidateConfigurationDraftRequest
  | ActivateConfigurationRevisionRequest
  | RollbackConfigurationRevisionRequest;

export type ConfigurationConflictReason =
  'state-version-changed' | 'draft-version-changed' | 'active-revision-changed';

export type ConfigurationRejectionReason =
  | 'invalid-state'
  | 'invalid-command'
  | 'workspace-mismatch'
  | 'draft-not-found'
  | 'revision-not-found'
  | 'revision-id-conflict'
  | 'revision-not-eligible'
  | 'rollback-target-not-prior'
  | 'state-capacity-exceeded';

export type ConfigurationTransitionResult =
  | {
      readonly status: 'applied';
      readonly command: ConfigurationCommand['kind'];
      readonly previousStateVersion: number;
      readonly state: ConfigurationStateSnapshot;
    }
  | {
      readonly status: 'conflict';
      readonly reason: ConfigurationConflictReason;
      readonly currentStateVersion: number;
      readonly state: ConfigurationStateSnapshot;
    }
  | {
      readonly status: 'rejected';
      readonly reason: ConfigurationRejectionReason;
      readonly state: ConfigurationStateSnapshot;
    };

function isStateIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value)
  );
}

export function isProtectedSecretReference(
  value: unknown,
): value is ProtectedSecretReference {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['kind', 'referenceId']) &&
    value.kind === 'protected-secret-reference' &&
    isStateIdentifier(value.referenceId)
  );
}

function isTimePolicyConfiguration(
  value: unknown,
): value is TimePolicyConfiguration {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['timeZone', 'datePolicyReference']) &&
    isIanaTimeZone(value.timeZone) &&
    isScopeIdentifier('resource', value.datePolicyReference)
  );
}

function isRoomConfigurationRecord(
  value: unknown,
): value is RoomConfigurationRecord {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['workspaceId', 'roomId', 'label']) &&
    isScopeIdentifier('workspace', value.workspaceId) &&
    isScopeIdentifier('room', value.roomId) &&
    isBoundedString(value.label, 256)
  );
}

function isScreenConfigurationRecord(
  value: unknown,
): value is ScreenConfigurationRecord {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'workspaceId',
      'screenId',
      'roomId',
      'label',
      'enabled',
      'classCodeStateId',
    ]) &&
    isScopeIdentifier('workspace', value.workspaceId) &&
    isScopeIdentifier('screen', value.screenId) &&
    isScopeIdentifier('room', value.roomId) &&
    isBoundedString(value.label, 256) &&
    typeof value.enabled === 'boolean' &&
    isStateIdentifier(value.classCodeStateId)
  );
}

function isSourceConfigurationRecord(
  value: unknown,
): value is SourceConfigurationRecord {
  if (!isPlainObject(value)) return false;
  const connected = value.mode === 'connected-account';
  if (
    !hasExactKeys(
      value,
      connected
        ? [
            'workspaceId',
            'sourceId',
            'sourceKind',
            'enabled',
            'definitionReference',
            'mode',
            'connectionReference',
          ]
        : [
            'workspaceId',
            'sourceId',
            'sourceKind',
            'enabled',
            'definitionReference',
            'mode',
          ],
    ) ||
    !isScopeIdentifier('workspace', value.workspaceId) ||
    !isScopeIdentifier('resource', value.sourceId) ||
    !isScopeIdentifier('resource-kind', value.sourceKind) ||
    typeof value.enabled !== 'boolean' ||
    !isScopeIdentifier('resource', value.definitionReference) ||
    ![
      'application-managed',
      'uploaded-snapshot',
      'shared-resource',
      'connected-account',
    ].includes(value.mode as string)
  ) {
    return false;
  }
  return !connected || isProtectedSecretReference(value.connectionReference);
}

export function isEditableConfiguration(
  value: unknown,
): value is EditableConfiguration {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, [
        'contractVersion',
        'configurationSchemaVersion',
        'workspace',
        'timePolicy',
        'rooms',
        'screens',
        'sources',
      ]) ||
      value.contractVersion !== contractVersion ||
      value.configurationSchemaVersion !== configurationSchemaVersion ||
      !isWorkspace(value.workspace) ||
      !isTimePolicyConfiguration(value.timePolicy) ||
      !isDenseArray(value.rooms) ||
      value.rooms.length > 256 ||
      !value.rooms.every(isRoomConfigurationRecord) ||
      !isDenseArray(value.screens) ||
      value.screens.length > 512 ||
      !value.screens.every(isScreenConfigurationRecord) ||
      !isDenseArray(value.sources) ||
      value.sources.length > 1024 ||
      !value.sources.every(isSourceConfigurationRecord)
    ) {
      return false;
    }
    const workspaceId = value.workspace.workspaceId;
    if (
      [...value.rooms, ...value.screens, ...value.sources].some(
        (record) => record.workspaceId !== workspaceId,
      )
    ) {
      return false;
    }
    const roomIds = value.rooms.map((room) => room.roomId);
    const screenIds = value.screens.map((screen) => screen.screenId);
    const sourceIds = value.sources.map((source) => source.sourceId);
    return (
      hasUniqueValues(roomIds) &&
      hasUniqueValues(screenIds) &&
      hasUniqueValues(sourceIds) &&
      isSorted(roomIds) &&
      isSorted(screenIds) &&
      isSorted(sourceIds) &&
      value.screens.every((screen) => roomIds.includes(screen.roomId))
    );
  });
}

function hasMatchingWorkspace(
  workspaceId: WorkspaceId,
  workspace: Workspace,
): boolean {
  return workspaceId === workspace.workspaceId;
}

function isConfigurationDraftRecord(
  value: unknown,
): value is ConfigurationDraftRecord {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'contractVersion',
      'recordKind',
      'workspaceId',
      'draftId',
      'draftVersion',
      'baseActiveRevisionId',
      'content',
      'savedAt',
    ]) &&
    value.contractVersion === contractVersion &&
    value.recordKind === 'configuration-draft' &&
    isScopeIdentifier('workspace', value.workspaceId) &&
    isStateIdentifier(value.draftId) &&
    isPositiveInteger(value.draftVersion) &&
    (value.baseActiveRevisionId === null ||
      isStateIdentifier(value.baseActiveRevisionId)) &&
    isEditableConfiguration(value.content) &&
    value.content.workspace.workspaceId === value.workspaceId &&
    isIsoInstant(value.savedAt)
  );
}

function isConfigurationRevisionRecord(
  value: unknown,
): value is ConfigurationRevisionRecord {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'contractVersion',
      'recordKind',
      'workspaceId',
      'revisionId',
      'revisionNumber',
      'parentRevisionId',
      'sourceDraftId',
      'sourceDraftVersion',
      'lifecycle',
      'content',
      'contentChecksum',
      'validatedAt',
      'lifecycleChangedAt',
    ]) &&
    value.contractVersion === contractVersion &&
    value.recordKind === 'configuration-revision' &&
    isScopeIdentifier('workspace', value.workspaceId) &&
    isStateIdentifier(value.revisionId) &&
    isPositiveInteger(value.revisionNumber) &&
    (value.parentRevisionId === null ||
      isStateIdentifier(value.parentRevisionId)) &&
    isStateIdentifier(value.sourceDraftId) &&
    isPositiveInteger(value.sourceDraftVersion) &&
    ['eligible', 'active', 'superseded', 'rolled-back'].includes(
      value.lifecycle as string,
    ) &&
    isEditableConfiguration(value.content) &&
    value.content.workspace.workspaceId === value.workspaceId &&
    isSha256Digest(value.contentChecksum) &&
    value.contentChecksum === configurationDigest(value.content) &&
    isIsoInstant(value.validatedAt) &&
    isIsoInstant(value.lifecycleChangedAt)
  );
}

function isActiveConfigurationPointer(
  value: unknown,
): value is ActiveConfigurationPointer {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'contractVersion',
      'recordKind',
      'workspaceId',
      'pointerVersion',
      'revisionId',
      'selectedAt',
    ]) &&
    value.contractVersion === contractVersion &&
    value.recordKind === 'active-configuration-pointer' &&
    isScopeIdentifier('workspace', value.workspaceId) &&
    isPositiveInteger(value.pointerVersion) &&
    isStateIdentifier(value.revisionId) &&
    isIsoInstant(value.selectedAt)
  );
}

export function isConfigurationStateSnapshot(
  value: unknown,
): value is ConfigurationStateSnapshot {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, [
        'contractVersion',
        'stateSchemaVersion',
        'workspace',
        'stateVersion',
        'drafts',
        'revisions',
        'activePointer',
      ]) ||
      value.contractVersion !== contractVersion ||
      value.stateSchemaVersion !== configurationStateSchemaVersion ||
      !isWorkspace(value.workspace) ||
      !Number.isSafeInteger(value.stateVersion) ||
      typeof value.stateVersion !== 'number' ||
      value.stateVersion < 0 ||
      !isDenseArray(value.drafts) ||
      value.drafts.length > configurationStateRecordLimits.maximumDrafts ||
      !value.drafts.every(isConfigurationDraftRecord) ||
      !isDenseArray(value.revisions) ||
      value.revisions.length >
        configurationStateRecordLimits.maximumRevisions ||
      !value.revisions.every(isConfigurationRevisionRecord) ||
      (value.activePointer !== null &&
        !isActiveConfigurationPointer(value.activePointer))
    ) {
      return false;
    }
    const workspaceId = value.workspace.workspaceId;
    if (
      value.drafts.some((draft) => draft.workspaceId !== workspaceId) ||
      value.revisions.some(
        (revision) => revision.workspaceId !== workspaceId,
      ) ||
      (value.activePointer !== null &&
        value.activePointer.workspaceId !== workspaceId)
    ) {
      return false;
    }
    const draftIds = value.drafts.map((draft) => draft.draftId);
    const revisionIds = value.revisions.map((revision) => revision.revisionId);
    const revisionNumbers = value.revisions.map(
      (revision) => revision.revisionNumber,
    );
    if (
      !hasUniqueValues(draftIds) ||
      !hasUniqueValues(revisionIds) ||
      !hasUniqueValues(revisionNumbers.map(String)) ||
      !isSorted(draftIds) ||
      !revisionNumbers.every((number, index) => number === index + 1)
    ) {
      return false;
    }
    const draftsById = new Map(
      value.drafts.map((draft) => [draft.draftId, draft] as const),
    );
    const revisionsById = new Map(
      value.revisions.map(
        (revision) => [revision.revisionId, revision] as const,
      ),
    );
    if (
      value.drafts.some(
        (draft) =>
          draft.baseActiveRevisionId !== null &&
          !revisionsById.has(draft.baseActiveRevisionId),
      ) ||
      value.revisions.some((revision) => {
        const sourceDraft = draftsById.get(revision.sourceDraftId);
        const parent =
          revision.parentRevisionId === null
            ? undefined
            : revisionsById.get(revision.parentRevisionId);
        return (
          sourceDraft === undefined ||
          sourceDraft.draftVersion < revision.sourceDraftVersion ||
          (revision.parentRevisionId !== null &&
            (parent === undefined ||
              parent.revisionNumber >= revision.revisionNumber))
        );
      })
    ) {
      return false;
    }
    const active = value.revisions.filter(
      (revision) => revision.lifecycle === 'active',
    );
    if (value.activePointer === null) return active.length === 0;
    return (
      active.length === 1 &&
      active[0]?.revisionId === value.activePointer.revisionId
    );
  });
}

function isCommandAuditScope(
  value: unknown,
  workspaceId: unknown,
): value is AuditScope {
  return (
    isAuditScope(value) &&
    isScopeIdentifier('workspace', workspaceId) &&
    value.workspaceId === workspaceId
  );
}

export function isConfigurationCommand(
  value: unknown,
): value is ConfigurationCommand {
  if (
    !isPlainObject(value) ||
    value.contractVersion !== contractVersion ||
    !isScopeIdentifier('workspace', value.workspaceId) ||
    !Number.isSafeInteger(value.expectedStateVersion) ||
    typeof value.expectedStateVersion !== 'number' ||
    value.expectedStateVersion < 0 ||
    !isCommandAuditScope(value.auditScope, value.workspaceId)
  ) {
    return false;
  }
  if (value.kind === 'save-draft') {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'kind',
        'workspaceId',
        'expectedStateVersion',
        'auditScope',
        'draftId',
        'expectedDraftVersion',
        'content',
        'savedAt',
      ]) &&
      isStateIdentifier(value.draftId) &&
      (value.expectedDraftVersion === null ||
        isPositiveInteger(value.expectedDraftVersion)) &&
      isEditableConfiguration(value.content) &&
      value.content.workspace.workspaceId === value.workspaceId &&
      isIsoInstant(value.savedAt)
    );
  }
  if (value.kind === 'validate-draft') {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'kind',
        'workspaceId',
        'expectedStateVersion',
        'auditScope',
        'draftId',
        'expectedDraftVersion',
        'revisionId',
        'validatedAt',
      ]) &&
      isStateIdentifier(value.draftId) &&
      isPositiveInteger(value.expectedDraftVersion) &&
      isStateIdentifier(value.revisionId) &&
      isIsoInstant(value.validatedAt)
    );
  }
  if (
    value.kind === 'activate-revision' ||
    value.kind === 'rollback-revision'
  ) {
    return (
      hasExactKeys(value, [
        'contractVersion',
        'kind',
        'workspaceId',
        'expectedStateVersion',
        'auditScope',
        'expectedActiveRevisionId',
        'revisionId',
        'selectedAt',
      ]) &&
      (value.expectedActiveRevisionId === null ||
        isStateIdentifier(value.expectedActiveRevisionId)) &&
      isStateIdentifier(value.revisionId) &&
      isIsoInstant(value.selectedAt)
    );
  }
  return false;
}

function rejected(
  state: ConfigurationStateSnapshot,
  reason: ConfigurationRejectionReason,
): ConfigurationTransitionResult {
  return { status: 'rejected', reason, state };
}

function conflict(
  state: ConfigurationStateSnapshot,
  reason: ConfigurationConflictReason,
): ConfigurationTransitionResult {
  return {
    status: 'conflict',
    reason,
    currentStateVersion: state.stateVersion,
    state,
  };
}

function applied(
  previous: ConfigurationStateSnapshot,
  command: ConfigurationCommand['kind'],
  change: Omit<ConfigurationStateSnapshot, 'stateVersion'>,
): ConfigurationTransitionResult {
  return {
    status: 'applied',
    command,
    previousStateVersion: previous.stateVersion,
    state: { ...change, stateVersion: previous.stateVersion + 1 },
  };
}

/**
 * Executable contract semantics for optimistic concurrency and last-known-good
 * preservation. Persistence adapters must make the equivalent change atomic.
 */
export function transitionConfigurationState(
  state: ConfigurationStateSnapshot,
  command: ConfigurationCommand,
): ConfigurationTransitionResult {
  if (!isConfigurationStateSnapshot(state))
    return rejected(state, 'invalid-state');
  if (!isConfigurationCommand(command))
    return rejected(state, 'invalid-command');
  if (!hasMatchingWorkspace(command.workspaceId, state.workspace)) {
    return rejected(state, 'workspace-mismatch');
  }
  if (command.expectedStateVersion !== state.stateVersion) {
    return conflict(state, 'state-version-changed');
  }

  if (command.kind === 'save-draft') {
    const current = state.drafts.find(
      (draft) => draft.draftId === command.draftId,
    );
    if (
      (current === undefined && command.expectedDraftVersion !== null) ||
      (current !== undefined &&
        command.expectedDraftVersion !== current.draftVersion)
    ) {
      return conflict(state, 'draft-version-changed');
    }
    if (
      current === undefined &&
      state.drafts.length >= configurationStateRecordLimits.maximumDrafts
    ) {
      return rejected(state, 'state-capacity-exceeded');
    }
    const draft: ConfigurationDraftRecord = {
      contractVersion,
      recordKind: 'configuration-draft',
      workspaceId: command.workspaceId,
      draftId: command.draftId,
      draftVersion: (current?.draftVersion ?? 0) + 1,
      baseActiveRevisionId: state.activePointer?.revisionId ?? null,
      content: command.content,
      savedAt: command.savedAt,
    };
    const drafts = [
      ...state.drafts.filter((entry) => entry.draftId !== command.draftId),
      draft,
    ].sort((left, right) => left.draftId.localeCompare(right.draftId));
    return applied(state, command.kind, { ...state, drafts });
  }

  if (command.kind === 'validate-draft') {
    const draft = state.drafts.find(
      (entry) => entry.draftId === command.draftId,
    );
    if (draft === undefined) return rejected(state, 'draft-not-found');
    if (draft.draftVersion !== command.expectedDraftVersion) {
      return conflict(state, 'draft-version-changed');
    }
    if (
      state.revisions.some(
        (revision) => revision.revisionId === command.revisionId,
      )
    ) {
      return rejected(state, 'revision-id-conflict');
    }
    if (
      state.revisions.length >= configurationStateRecordLimits.maximumRevisions
    ) {
      return rejected(state, 'state-capacity-exceeded');
    }
    const revision: ConfigurationRevisionRecord = {
      contractVersion,
      recordKind: 'configuration-revision',
      workspaceId: command.workspaceId,
      revisionId: command.revisionId,
      revisionNumber:
        Math.max(0, ...state.revisions.map((entry) => entry.revisionNumber)) +
        1,
      parentRevisionId: draft.baseActiveRevisionId,
      sourceDraftId: draft.draftId,
      sourceDraftVersion: draft.draftVersion,
      lifecycle: 'eligible',
      content: draft.content,
      contentChecksum: configurationDigest(draft.content),
      validatedAt: command.validatedAt,
      lifecycleChangedAt: command.validatedAt,
    };
    return applied(state, command.kind, {
      ...state,
      revisions: [...state.revisions, revision],
    });
  }

  const currentRevisionId = state.activePointer?.revisionId ?? null;
  if (command.expectedActiveRevisionId !== currentRevisionId) {
    return conflict(state, 'active-revision-changed');
  }
  const target = state.revisions.find(
    (revision) => revision.revisionId === command.revisionId,
  );
  if (target === undefined) return rejected(state, 'revision-not-found');

  if (command.kind === 'activate-revision' && target.lifecycle !== 'eligible') {
    return rejected(state, 'revision-not-eligible');
  }
  if (
    command.kind === 'rollback-revision' &&
    !['superseded', 'rolled-back'].includes(target.lifecycle)
  ) {
    return rejected(state, 'rollback-target-not-prior');
  }

  const revisions = state.revisions.map((revision) => {
    if (revision.revisionId === target.revisionId) {
      return {
        ...revision,
        lifecycle: 'active' as const,
        lifecycleChangedAt: command.selectedAt,
      };
    }
    if (revision.revisionId === currentRevisionId) {
      return {
        ...revision,
        lifecycle:
          command.kind === 'rollback-revision'
            ? ('rolled-back' as const)
            : ('superseded' as const),
        lifecycleChangedAt: command.selectedAt,
      };
    }
    return revision;
  });
  const activePointer: ActiveConfigurationPointer = {
    contractVersion,
    recordKind: 'active-configuration-pointer',
    workspaceId: command.workspaceId,
    pointerVersion: (state.activePointer?.pointerVersion ?? 0) + 1,
    revisionId: target.revisionId,
    selectedAt: command.selectedAt,
  };
  return applied(state, command.kind, { ...state, revisions, activePointer });
}

/** Stable canonical bytes used by export and persistence adapters. */
export function canonicalConfigurationJson(
  value: EditableConfiguration,
): string {
  if (!isEditableConfiguration(value)) {
    throw new TypeError('Invalid editable configuration.');
  }
  return canonicalJson(value);
}
