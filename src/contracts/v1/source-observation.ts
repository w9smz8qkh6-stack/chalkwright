import {
  configurationDigest,
  isExactWorkspace,
  type Sha256Digest,
} from './configuration-state.js';
import {
  contractVersion,
  type ContractEnvelope,
  type IsoInstant,
} from './common.js';
import {
  isSourceDefinition,
  sourceIdentifier,
  type SourceDefinition,
  type SourceDefinitionId,
  type SourceObservationId,
  type SourceProjectionId,
} from './source-acquisition.js';
import {
  isLogicalSourceFormat,
  isSourceMode,
  isSourceStream,
  sourceContractVersion,
  type LogicalSourceFormat,
  type SourceMode,
  type SourceStream,
} from './source-catalog.js';
import {
  cloneJsonValue,
  hasExactKeys,
  isIsoInstant,
  isPlainObject,
  isPositiveInteger,
  isSha256Digest,
  safelyValidate,
} from './state-contract-validation.js';
import { isWorkspace, type Workspace } from './workspace.js';

export const sourceDiagnosticCodes = [
  'invalid-input',
  'format-mismatch',
  'budget-exceeded',
  'source-unavailable',
  'authorization-required',
  'authorization-expired',
  'network-policy-denied',
  'refresh-failed',
  'projection-invalid',
] as const;
export type SourceDiagnosticCode = (typeof sourceDiagnosticCodes)[number];

export interface ManagedAcquisitionProvenance {
  readonly kind: 'managed-observation';
  readonly observedAt: IsoInstant;
}

export interface UploadedAcquisitionProvenance {
  readonly kind: 'uploaded-import';
  readonly importedAt: IsoInstant;
}

export interface FetchedAcquisitionProvenance {
  readonly kind: 'remote-fetch';
  readonly fetchedAt: IsoInstant;
}

export type SourceAcquisitionProvenance =
  | ManagedAcquisitionProvenance
  | UploadedAcquisitionProvenance
  | FetchedAcquisitionProvenance;

/**
 * A candidate can be committed only after the entire input and normalized
 * projection have been verified. Raw payloads and locators are intentionally
 * absent from this bounded provenance record.
 */
export interface VerifiedSourceObservation extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly recordKind: 'verified-source-observation';
  readonly workspace: Workspace;
  readonly observationId: SourceObservationId;
  readonly observationDigest: Sha256Digest;
  readonly sourceDefinitionId: SourceDefinitionId;
  readonly definitionRevision: number;
  readonly stream: SourceStream;
  readonly mode: SourceMode;
  readonly format: LogicalSourceFormat;
  readonly acquisition: SourceAcquisitionProvenance;
  readonly verifiedAt: IsoInstant;
  readonly verification: {
    readonly status: 'verified';
    readonly scope: 'whole-input-and-projection';
  };
  readonly candidateProjectionId: SourceProjectionId;
  readonly candidateProjectionDigest: Sha256Digest;
}

export interface ManagedRevisionFreshness {
  readonly basis: 'managed-revision';
  readonly status: 'current';
  readonly effectiveAt: IsoInstant;
}

export interface ImmutableImportFreshness {
  readonly basis: 'immutable-import';
  readonly status: 'current';
  readonly importedAt: IsoInstant;
}

export interface BoundedRefreshFreshness {
  readonly basis: 'bounded-refresh';
  readonly status: 'current' | 'degraded' | 'stale';
  readonly lastAttemptAt: IsoInstant;
  readonly lastSuccessAt: IsoInstant;
  readonly nextDueAt: IsoInstant;
  readonly expiresAt: IsoInstant;
}

export type SourceFreshness =
  ManagedRevisionFreshness | ImmutableImportFreshness | BoundedRefreshFreshness;

export interface VerifiedSourceAttemptSummary {
  readonly status: 'verified';
  readonly attemptedAt: IsoInstant;
  readonly observationId: SourceObservationId;
}

export interface FailedSourceAttemptSummary {
  readonly status: 'failed';
  readonly attemptedAt: IsoInstant;
  readonly diagnosticCode: SourceDiagnosticCode;
}

export type SourceAttemptSummary =
  VerifiedSourceAttemptSummary | FailedSourceAttemptSummary;

/** The active normalized projection; this is the only source state consumers read. */
export interface CommittedSourceProjectionState extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly recordKind: 'committed-source-projection';
  readonly workspace: Workspace;
  readonly sourceDefinitionId: SourceDefinitionId;
  readonly definitionRevision: number;
  readonly stream: SourceStream;
  readonly mode: SourceMode;
  readonly format: LogicalSourceFormat;
  readonly projectionId: SourceProjectionId;
  readonly projectionDigest: Sha256Digest;
  readonly observationId: SourceObservationId;
  readonly observationDigest: Sha256Digest;
  readonly acquisition: SourceAcquisitionProvenance;
  readonly committedAt: IsoInstant;
  readonly freshness: SourceFreshness;
  readonly lastAttempt: SourceAttemptSummary;
}

export interface VerifiedObservationAttempt extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly recordKind: 'source-refresh-attempt';
  readonly outcome: 'verified-observation';
  readonly attemptedAt: IsoInstant;
  readonly observation: VerifiedSourceObservation;
  readonly boundedRefreshWindow: {
    readonly nextDueAt: IsoInstant;
    readonly expiresAt: IsoInstant;
  } | null;
}

export interface FailedObservationAttempt extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly recordKind: 'source-refresh-attempt';
  readonly outcome: 'failed';
  readonly workspace: Workspace;
  readonly sourceDefinitionId: SourceDefinitionId;
  readonly definitionRevision: number;
  readonly stream: SourceStream;
  readonly mode: SourceMode;
  readonly format: LogicalSourceFormat;
  readonly attemptedAt: IsoInstant;
  readonly diagnosticCode: SourceDiagnosticCode;
}

export type SourceRefreshAttempt =
  VerifiedObservationAttempt | FailedObservationAttempt;

export type ApplySourceObservationResult =
  | {
      readonly status: 'committed';
      readonly state: CommittedSourceProjectionState;
    }
  | {
      readonly status: 'retained-last-known-good';
      readonly state: CommittedSourceProjectionState;
    }
  | {
      readonly status: 'unavailable';
      readonly diagnosticCode: SourceDiagnosticCode;
    }
  | {
      readonly status: 'rejected';
      readonly reason:
        'invalid-contract' | 'workspace-mismatch' | 'definition-mismatch';
      readonly previousState: CommittedSourceProjectionState | null;
    };

function isSourceIdentifier(value: unknown): value is string {
  try {
    sourceIdentifier('source-definition', value);
    return true;
  } catch {
    return false;
  }
}

function isSourceDiagnosticCode(value: unknown): value is SourceDiagnosticCode {
  return sourceDiagnosticCodes.includes(value as SourceDiagnosticCode);
}

function isAcquisitionProvenance(
  value: unknown,
): value is SourceAcquisitionProvenance {
  if (!isPlainObject(value)) return false;
  if (value.kind === 'managed-observation') {
    return (
      hasExactKeys(value, ['kind', 'observedAt']) &&
      isIsoInstant(value.observedAt)
    );
  }
  if (value.kind === 'uploaded-import') {
    return (
      hasExactKeys(value, ['kind', 'importedAt']) &&
      isIsoInstant(value.importedAt)
    );
  }
  return (
    value.kind === 'remote-fetch' &&
    hasExactKeys(value, ['kind', 'fetchedAt']) &&
    isIsoInstant(value.fetchedAt)
  );
}

function acquisitionMatchesMode(
  acquisition: SourceAcquisitionProvenance,
  mode: SourceMode,
): boolean {
  return mode === 'application-managed'
    ? acquisition.kind === 'managed-observation'
    : mode === 'uploaded-snapshot'
      ? acquisition.kind === 'uploaded-import'
      : acquisition.kind === 'remote-fetch';
}

function acquisitionInstant(
  acquisition: SourceAcquisitionProvenance,
): IsoInstant {
  return acquisition.kind === 'managed-observation'
    ? acquisition.observedAt
    : acquisition.kind === 'uploaded-import'
      ? acquisition.importedAt
      : acquisition.fetchedAt;
}

export function isVerifiedSourceObservation(
  value: unknown,
): value is VerifiedSourceObservation {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, [
        'contractVersion',
        'sourceContractVersion',
        'recordKind',
        'workspace',
        'observationId',
        'observationDigest',
        'sourceDefinitionId',
        'definitionRevision',
        'stream',
        'mode',
        'format',
        'acquisition',
        'verifiedAt',
        'verification',
        'candidateProjectionId',
        'candidateProjectionDigest',
      ]) ||
      value.contractVersion !== contractVersion ||
      value.sourceContractVersion !== sourceContractVersion ||
      value.recordKind !== 'verified-source-observation' ||
      !isWorkspace(value.workspace) ||
      !isSourceIdentifier(value.observationId) ||
      !isSha256Digest(value.observationDigest) ||
      !isSourceIdentifier(value.sourceDefinitionId) ||
      !isPositiveInteger(value.definitionRevision) ||
      !isSourceStream(value.stream) ||
      !isSourceMode(value.mode) ||
      !isLogicalSourceFormat(value.format) ||
      !isAcquisitionProvenance(value.acquisition) ||
      !isIsoInstant(value.verifiedAt) ||
      !isPlainObject(value.verification) ||
      !hasExactKeys(value.verification, ['status', 'scope']) ||
      value.verification.status !== 'verified' ||
      value.verification.scope !== 'whole-input-and-projection' ||
      !isSourceIdentifier(value.candidateProjectionId) ||
      !isSha256Digest(value.candidateProjectionDigest)
    ) {
      return false;
    }
    return (
      acquisitionMatchesMode(value.acquisition, value.mode) &&
      Date.parse(acquisitionInstant(value.acquisition)) <=
        Date.parse(value.verifiedAt)
    );
  });
}

function isSourceFreshness(
  value: unknown,
  mode: SourceMode,
): value is SourceFreshness {
  if (!isPlainObject(value)) return false;
  if (mode === 'application-managed') {
    return (
      hasExactKeys(value, ['basis', 'status', 'effectiveAt']) &&
      value.basis === 'managed-revision' &&
      value.status === 'current' &&
      isIsoInstant(value.effectiveAt)
    );
  }
  if (mode === 'uploaded-snapshot') {
    return (
      hasExactKeys(value, ['basis', 'status', 'importedAt']) &&
      value.basis === 'immutable-import' &&
      value.status === 'current' &&
      isIsoInstant(value.importedAt)
    );
  }
  if (!(
    hasExactKeys(value, [
      'basis',
      'status',
      'lastAttemptAt',
      'lastSuccessAt',
      'nextDueAt',
      'expiresAt',
    ]) &&
    value.basis === 'bounded-refresh' &&
    ['current', 'degraded', 'stale'].includes(value.status as string) &&
    isIsoInstant(value.lastAttemptAt) &&
    isIsoInstant(value.lastSuccessAt) &&
    isIsoInstant(value.nextDueAt) &&
    isIsoInstant(value.expiresAt) &&
    Date.parse(value.lastSuccessAt) <= Date.parse(value.lastAttemptAt) &&
    Date.parse(value.lastSuccessAt) < Date.parse(value.nextDueAt) &&
    Date.parse(value.nextDueAt) <= Date.parse(value.expiresAt)
  )) {
    return false;
  }
  return value.status === 'current'
    ? Date.parse(value.lastAttemptAt) < Date.parse(value.nextDueAt)
    : value.status === 'degraded'
      ? Date.parse(value.lastAttemptAt) < Date.parse(value.expiresAt)
      : Date.parse(value.lastAttemptAt) >= Date.parse(value.expiresAt);
}

function isSourceAttemptSummary(value: unknown): value is SourceAttemptSummary {
  if (!isPlainObject(value) || !isIsoInstant(value.attemptedAt)) return false;
  return value.status === 'verified'
    ? hasExactKeys(value, ['status', 'attemptedAt', 'observationId']) &&
        isSourceIdentifier(value.observationId)
    : value.status === 'failed' &&
        hasExactKeys(value, ['status', 'attemptedAt', 'diagnosticCode']) &&
        isSourceDiagnosticCode(value.diagnosticCode);
}

export function isCommittedSourceProjectionState(
  value: unknown,
): value is CommittedSourceProjectionState {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, [
        'contractVersion',
        'sourceContractVersion',
        'recordKind',
        'workspace',
        'sourceDefinitionId',
        'definitionRevision',
        'stream',
        'mode',
        'format',
        'projectionId',
        'projectionDigest',
        'observationId',
        'observationDigest',
        'acquisition',
        'committedAt',
        'freshness',
        'lastAttempt',
      ]) ||
      value.contractVersion !== contractVersion ||
      value.sourceContractVersion !== sourceContractVersion ||
      value.recordKind !== 'committed-source-projection' ||
      !isWorkspace(value.workspace) ||
      !isSourceIdentifier(value.sourceDefinitionId) ||
      !isPositiveInteger(value.definitionRevision) ||
      !isSourceStream(value.stream) ||
      !isSourceMode(value.mode) ||
      !isLogicalSourceFormat(value.format) ||
      !isSourceIdentifier(value.projectionId) ||
      !isSha256Digest(value.projectionDigest) ||
      !isSourceIdentifier(value.observationId) ||
      !isSha256Digest(value.observationDigest) ||
      !isAcquisitionProvenance(value.acquisition) ||
      !isIsoInstant(value.committedAt) ||
      !isSourceFreshness(value.freshness, value.mode) ||
      !isSourceAttemptSummary(value.lastAttempt)
    ) {
      return false;
    }
    return (
      acquisitionMatchesMode(value.acquisition, value.mode) &&
      Date.parse(acquisitionInstant(value.acquisition)) <=
        Date.parse(value.committedAt) &&
      (value.lastAttempt.status !== 'verified' ||
        value.lastAttempt.observationId === value.observationId)
    );
  });
}

export function isSourceRefreshAttempt(
  value: unknown,
): value is SourceRefreshAttempt {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      value.contractVersion !== contractVersion ||
      value.sourceContractVersion !== sourceContractVersion ||
      value.recordKind !== 'source-refresh-attempt' ||
      !isIsoInstant(value.attemptedAt)
    ) {
      return false;
    }
    if (value.outcome === 'verified-observation') {
      if (
        !hasExactKeys(value, [
          'contractVersion',
          'sourceContractVersion',
          'recordKind',
          'outcome',
          'attemptedAt',
          'observation',
          'boundedRefreshWindow',
        ]) ||
        !isVerifiedSourceObservation(value.observation) ||
        value.attemptedAt !== value.observation.verifiedAt
      ) {
        return false;
      }
      const remote =
        value.observation.mode === 'shared-resource' ||
        value.observation.mode === 'connected-account';
      if (!remote) return value.boundedRefreshWindow === null;
      return (
        isPlainObject(value.boundedRefreshWindow) &&
        hasExactKeys(value.boundedRefreshWindow, ['nextDueAt', 'expiresAt']) &&
        isIsoInstant(value.boundedRefreshWindow.nextDueAt) &&
        isIsoInstant(value.boundedRefreshWindow.expiresAt) &&
        Date.parse(value.attemptedAt) <
          Date.parse(value.boundedRefreshWindow.nextDueAt) &&
        Date.parse(value.boundedRefreshWindow.nextDueAt) <=
          Date.parse(value.boundedRefreshWindow.expiresAt)
      );
    }
    return (
      value.outcome === 'failed' &&
      hasExactKeys(value, [
        'contractVersion',
        'sourceContractVersion',
        'recordKind',
        'outcome',
        'workspace',
        'sourceDefinitionId',
        'definitionRevision',
        'stream',
        'mode',
        'format',
        'attemptedAt',
        'diagnosticCode',
      ]) &&
      isWorkspace(value.workspace) &&
      isSourceIdentifier(value.sourceDefinitionId) &&
      isPositiveInteger(value.definitionRevision) &&
      isSourceStream(value.stream) &&
      isSourceMode(value.mode) &&
      isLogicalSourceFormat(value.format) &&
      isSourceDiagnosticCode(value.diagnosticCode)
    );
  });
}

function definitionMatchesObservation(
  definition: SourceDefinition,
  observation: VerifiedSourceObservation,
): boolean {
  return (
    isExactWorkspace(definition.workspace, observation.workspace) &&
    definition.sourceDefinitionId === observation.sourceDefinitionId &&
    definition.definitionRevision === observation.definitionRevision &&
    definition.stream === observation.stream &&
    definition.mode === observation.mode &&
    definition.format === observation.format
  );
}

function definitionMatchesFailure(
  definition: SourceDefinition,
  attempt: FailedObservationAttempt,
): boolean {
  return (
    isExactWorkspace(definition.workspace, attempt.workspace) &&
    definition.sourceDefinitionId === attempt.sourceDefinitionId &&
    definition.definitionRevision === attempt.definitionRevision &&
    definition.stream === attempt.stream &&
    definition.mode === attempt.mode &&
    definition.format === attempt.format
  );
}

function priorMatchesDefinitionIdentity(
  previous: CommittedSourceProjectionState,
  definition: SourceDefinition,
): boolean {
  return (
    isExactWorkspace(previous.workspace, definition.workspace) &&
    previous.sourceDefinitionId === definition.sourceDefinitionId &&
    previous.stream === definition.stream &&
    previous.mode === definition.mode &&
    previous.format === definition.format
  );
}

function freshnessForSuccess(
  observation: VerifiedSourceObservation,
  attempt: VerifiedObservationAttempt,
): SourceFreshness {
  if (observation.acquisition.kind === 'managed-observation') {
    return {
      basis: 'managed-revision',
      status: 'current',
      effectiveAt: observation.acquisition.observedAt,
    };
  }
  if (observation.acquisition.kind === 'uploaded-import') {
    return {
      basis: 'immutable-import',
      status: 'current',
      importedAt: observation.acquisition.importedAt,
    };
  }
  const window = attempt.boundedRefreshWindow;
  if (window === null) {
    throw new TypeError(
      'Remote observations require a bounded refresh window.',
    );
  }
  return {
    basis: 'bounded-refresh',
    status: 'current',
    lastAttemptAt: attempt.attemptedAt,
    lastSuccessAt: observation.acquisition.fetchedAt,
    nextDueAt: window.nextDueAt,
    expiresAt: window.expiresAt,
  };
}

function rejected(
  reason: Extract<
    ApplySourceObservationResult,
    { status: 'rejected' }
  >['reason'],
  previous: CommittedSourceProjectionState | null,
): ApplySourceObservationResult {
  return cloneJsonValue({
    status: 'rejected',
    reason,
    previousState: previous,
  });
}

/**
 * Applies a verified observation atomically. Failed attempts retain exactly the
 * prior projection identity and content digest while freshness can degrade.
 */
export function applySourceObservation(
  previousValue: unknown,
  definitionValue: unknown,
  attemptValue: unknown,
): ApplySourceObservationResult {
  const previous =
    previousValue === null
      ? null
      : isCommittedSourceProjectionState(previousValue)
        ? previousValue
        : undefined;
  if (
    previous === undefined ||
    !isSourceDefinition(definitionValue) ||
    !isSourceRefreshAttempt(attemptValue)
  ) {
    return rejected('invalid-contract', previous ?? null);
  }
  const definition = definitionValue;
  const attempt = attemptValue;
  if (!definition.enabled) {
    return rejected('definition-mismatch', previous);
  }
  if (
    previous !== null &&
    !priorMatchesDefinitionIdentity(previous, definition)
  ) {
    return rejected(
      isExactWorkspace(previous.workspace, definition.workspace)
        ? 'definition-mismatch'
        : 'workspace-mismatch',
      previous,
    );
  }
  const attemptWorkspace =
    attempt.outcome === 'verified-observation'
      ? attempt.observation.workspace
      : attempt.workspace;
  if (!isExactWorkspace(definition.workspace, attemptWorkspace)) {
    return rejected('workspace-mismatch', previous);
  }
  const attemptMatches =
    attempt.outcome === 'verified-observation'
      ? definitionMatchesObservation(definition, attempt.observation)
      : definitionMatchesFailure(definition, attempt);
  if (!attemptMatches) return rejected('definition-mismatch', previous);

  if (attempt.outcome === 'verified-observation') {
    const observation = attempt.observation;
    const state: CommittedSourceProjectionState = {
      contractVersion,
      sourceContractVersion,
      recordKind: 'committed-source-projection',
      workspace: observation.workspace,
      sourceDefinitionId: observation.sourceDefinitionId,
      definitionRevision: observation.definitionRevision,
      stream: observation.stream,
      mode: observation.mode,
      format: observation.format,
      projectionId: observation.candidateProjectionId,
      projectionDigest: observation.candidateProjectionDigest,
      observationId: observation.observationId,
      observationDigest: observation.observationDigest,
      acquisition: observation.acquisition,
      committedAt: attempt.attemptedAt,
      freshness: freshnessForSuccess(observation, attempt),
      lastAttempt: {
        status: 'verified',
        attemptedAt: attempt.attemptedAt,
        observationId: observation.observationId,
      },
    };
    return cloneJsonValue({ status: 'committed', state });
  }

  if (previous === null) {
    return cloneJsonValue({
      status: 'unavailable',
      diagnosticCode: attempt.diagnosticCode,
    });
  }
  if (!priorMatchesDefinitionIdentity(previous, definition)) {
    return rejected('definition-mismatch', previous);
  }
  if (
    Date.parse(attempt.attemptedAt) <
    Date.parse(previous.lastAttempt.attemptedAt)
  ) {
    return rejected('invalid-contract', previous);
  }
  const freshness =
    previous.freshness.basis === 'bounded-refresh'
      ? {
          ...previous.freshness,
          status:
            Date.parse(attempt.attemptedAt) >=
            Date.parse(previous.freshness.expiresAt)
              ? ('stale' as const)
              : ('degraded' as const),
          lastAttemptAt: attempt.attemptedAt,
        }
      : previous.freshness;
  const retained: CommittedSourceProjectionState = {
    ...previous,
    freshness,
    lastAttempt: {
      status: 'failed',
      attemptedAt: attempt.attemptedAt,
      diagnosticCode: attempt.diagnosticCode,
    },
  };
  return cloneJsonValue({
    status: 'retained-last-known-good',
    state: retained,
  });
}

/** Stable digest helper for fixtures and adapters that build verified observations. */
export function sourceObservationDigest(value: unknown): Sha256Digest {
  return configurationDigest(value);
}
