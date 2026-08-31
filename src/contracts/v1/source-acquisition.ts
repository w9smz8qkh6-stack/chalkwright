import { isIP } from 'node:net';

import {
  isExactWorkspace,
  isProtectedSecretReference,
  type ProtectedSecretReference,
  type Sha256Digest,
} from './configuration-state.js';
import {
  contractVersion,
  type ContractEnvelope,
  type IsoInstant,
} from './common.js';
import {
  isFormatAllowedForSource,
  isLogicalSourceFormat,
  isSourceMode,
  isSourceStream,
  sourceContractVersion,
  sourceFormatBudgets,
  sourceTransactionBudget,
  type LogicalSourceFormat,
  type SourceMode,
  type SourceStream,
} from './source-catalog.js';
import {
  cloneJsonValue,
  hasExactKeys,
  hasUniqueValues,
  isBoundedString,
  isDenseArray,
  isIsoInstant,
  isNonNegativeInteger,
  isPlainObject,
  isPositiveInteger,
  isScopeIdentifier,
  isSha256Digest,
  isSorted,
  safelyValidate,
} from './state-contract-validation.js';
import {
  isScopedTarget,
  isWorkspace,
  type ActorId,
  type ResourceId,
  type ScopedTargets,
  type Workspace,
} from './workspace.js';

declare const sourceIdentifierBrand: unique symbol;
export const sourceIdentifierKinds = [
  'source-definition',
  'source-observation',
  'source-projection',
  'provider-grant',
] as const;
export type SourceIdentifierKind = (typeof sourceIdentifierKinds)[number];
export type SourceIdentifier<Kind extends SourceIdentifierKind> = string & {
  readonly [sourceIdentifierBrand]: Kind;
};
export type SourceDefinitionId = SourceIdentifier<'source-definition'>;
export type SourceObservationId = SourceIdentifier<'source-observation'>;
export type SourceProjectionId = SourceIdentifier<'source-projection'>;
export type ProviderGrantId = SourceIdentifier<'provider-grant'>;

function isSourceIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value)
  );
}

export function sourceIdentifier<Kind extends SourceIdentifierKind>(
  kind: Kind,
  value: unknown,
): SourceIdentifier<Kind> {
  if (!isSourceIdentifier(value)) {
    throw new TypeError(`Invalid ${kind} identifier.`);
  }
  return value as SourceIdentifier<Kind>;
}

interface SourceDefinitionBase extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly recordKind: 'source-definition';
  readonly workspace: Workspace;
  readonly sourceDefinitionId: SourceDefinitionId;
  readonly definitionRevision: number;
  readonly stream: SourceStream;
  readonly mode: SourceMode;
  readonly format: LogicalSourceFormat;
  readonly enabled: boolean;
  readonly revisedAt: IsoInstant;
}

export interface ApplicationManagedSourceDefinition extends SourceDefinitionBase {
  readonly mode: 'application-managed';
  readonly contentReference: ResourceId;
}

export interface UploadedSnapshotSourceDefinition extends SourceDefinitionBase {
  readonly mode: 'uploaded-snapshot';
  readonly storageObjectReference: ResourceId;
  readonly admissionReference: ResourceId;
}

export interface PublicSharedResourceAccess {
  readonly kind: 'public-published';
}

export interface ServiceIdentitySharedResourceAccess {
  readonly kind: 'service-identity-shared';
  readonly protectedAccessReference: ProtectedSecretReference;
}

export type SharedResourceAccess =
  PublicSharedResourceAccess | ServiceIdentitySharedResourceAccess;

export interface SharedResourceSourceDefinition extends SourceDefinitionBase {
  readonly mode: 'shared-resource';
  readonly locatorReference: ResourceId;
  readonly access: SharedResourceAccess;
  readonly refreshPolicy: typeof sharedResourceRefreshPolicy;
}

export const connectedCapabilities = [
  'classroom-coursework-read',
  'calendar-events-read',
  'drive-file-read',
  'education-coursework-read',
] as const;
export type ConnectedCapability = (typeof connectedCapabilities)[number];

export const connectedProviders = [
  'google',
  'microsoft',
  'approved-institutional-api',
] as const;
export type ConnectedProvider = (typeof connectedProviders)[number];

export interface ProviderConsentRequirement {
  readonly provider: ConnectedProvider;
  readonly issuerReference: ResourceId;
  readonly redirectReference: ResourceId;
  readonly capability: ConnectedCapability;
  readonly readOnly: true;
  readonly stateRequired: true;
  readonly pkceMethod: 'S256';
  readonly noncePolicy: 'required-when-issued';
}

export interface ConnectedAccountSourceDefinition extends SourceDefinitionBase {
  readonly mode: 'connected-account';
  readonly grantId: ProviderGrantId;
  readonly selectedResourceReference: ResourceId;
  readonly consent: ProviderConsentRequirement;
}

export type SourceDefinition =
  | ApplicationManagedSourceDefinition
  | UploadedSnapshotSourceDefinition
  | SharedResourceSourceDefinition
  | ConnectedAccountSourceDefinition;

export const sharedResourceRefreshPolicy = {
  minimumRefreshIntervalSeconds: 900,
  maximumRedirects: 4,
  maximumRequestMilliseconds: 10_000,
  maximumConcurrentFetchesPerWorkspace: 2,
  maximumRetries: 2,
  maximumFanOut: 4,
  requireHttps: true,
  requireStableDnsAnswersThroughConnect: true,
  commitOnlyValidatedProjection: true,
} as const;

function isProviderConsentRequirement(
  value: unknown,
): value is ProviderConsentRequirement {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'provider',
      'issuerReference',
      'redirectReference',
      'capability',
      'readOnly',
      'stateRequired',
      'pkceMethod',
      'noncePolicy',
    ]) &&
    connectedProviders.includes(value.provider as ConnectedProvider) &&
    isScopeIdentifier('resource', value.issuerReference) &&
    isScopeIdentifier('resource', value.redirectReference) &&
    connectedCapabilities.includes(value.capability as ConnectedCapability) &&
    value.readOnly === true &&
    value.stateRequired === true &&
    value.pkceMethod === 'S256' &&
    value.noncePolicy === 'required-when-issued'
  );
}

function isSharedResourceRefreshPolicy(
  value: unknown,
): value is typeof sharedResourceRefreshPolicy {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, Object.keys(sharedResourceRefreshPolicy)) &&
    Object.entries(sharedResourceRefreshPolicy).every(
      ([key, expected]) => value[key] === expected,
    )
  );
}

function isSharedResourceAccess(value: unknown): value is SharedResourceAccess {
  if (!isPlainObject(value)) return false;
  if (value.kind === 'public-published') {
    return hasExactKeys(value, ['kind']);
  }
  return (
    value.kind === 'service-identity-shared' &&
    hasExactKeys(value, ['kind', 'protectedAccessReference']) &&
    isProtectedSecretReference(value.protectedAccessReference)
  );
}

export function isSourceDefinition(value: unknown): value is SourceDefinition {
  if (
    !isPlainObject(value) ||
    value.contractVersion !== contractVersion ||
    value.sourceContractVersion !== sourceContractVersion ||
    value.recordKind !== 'source-definition' ||
    !isWorkspace(value.workspace) ||
    !isSourceIdentifier(value.sourceDefinitionId) ||
    !isPositiveInteger(value.definitionRevision) ||
    !isSourceStream(value.stream) ||
    !isSourceMode(value.mode) ||
    !isLogicalSourceFormat(value.format) ||
    !isFormatAllowedForSource(value.stream, value.mode, value.format) ||
    typeof value.enabled !== 'boolean' ||
    !isIsoInstant(value.revisedAt)
  ) {
    return false;
  }
  const commonKeys = [
    'contractVersion',
    'sourceContractVersion',
    'recordKind',
    'workspace',
    'sourceDefinitionId',
    'definitionRevision',
    'stream',
    'mode',
    'format',
    'enabled',
    'revisedAt',
  ];
  if (value.mode === 'application-managed') {
    return (
      hasExactKeys(value, [...commonKeys, 'contentReference']) &&
      isScopeIdentifier('resource', value.contentReference)
    );
  }
  if (value.mode === 'uploaded-snapshot') {
    return (
      hasExactKeys(value, [
        ...commonKeys,
        'storageObjectReference',
        'admissionReference',
      ]) &&
      isScopeIdentifier('resource', value.storageObjectReference) &&
      isScopeIdentifier('resource', value.admissionReference)
    );
  }
  if (value.mode === 'shared-resource') {
    return (
      hasExactKeys(value, [
        ...commonKeys,
        'locatorReference',
        'access',
        'refreshPolicy',
      ]) &&
      isScopeIdentifier('resource', value.locatorReference) &&
      isSharedResourceAccess(value.access) &&
      isSharedResourceRefreshPolicy(value.refreshPolicy)
    );
  }
  return (
    value.mode === 'connected-account' &&
    hasExactKeys(value, [
      ...commonKeys,
      'grantId',
      'selectedResourceReference',
      'consent',
    ]) &&
    isSourceIdentifier(value.grantId) &&
    isScopeIdentifier('resource', value.selectedResourceReference) &&
    isProviderConsentRequirement(value.consent)
  );
}

export const uploadDetectedMediaTypes: Readonly<
  Record<LogicalSourceFormat, readonly string[]>
> = {
  'canonical-records-v1': [],
  'utf8-csv-v1': ['text/csv'],
  'utf8-icalendar-v1': ['text/calendar'],
  'reviewed-https-reference-v1': [],
  'raster-png-v1': ['image/png'],
  'raster-jpeg-v1': ['image/jpeg'],
  'raster-webp-v1': ['image/webp'],
  'display-mp4-v1': ['video/mp4'],
  'provider-projection-v1': [],
} as const;

interface UploadInspectionBase extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly recordKind: 'upload-inspection';
  readonly workspace: Workspace;
  readonly sourceDefinitionId: SourceDefinitionId;
  readonly definitionRevision: number;
  readonly stream: SourceStream;
  readonly expectedFormat: LogicalSourceFormat;
  readonly detectedFormat: LogicalSourceFormat;
  readonly storageObjectReference: ResourceId;
  readonly clientFilename: string;
  readonly declaredMediaType: string;
  readonly detectedMediaType: string;
  readonly byteLength: number;
  readonly contentDigest: Sha256Digest;
  readonly processingMilliseconds: number;
  readonly containsArchive: boolean;
  readonly containsActiveContent: boolean;
  readonly containsFormula: boolean;
  readonly containsExternalReference: boolean;
}

export interface TextUploadInspection extends UploadInspectionBase {
  readonly metrics: {
    readonly kind: 'records';
    readonly utf8Valid: boolean;
    readonly recordCount: number;
    readonly maximumFieldsPerRecord: number;
    readonly maximumFieldBytes: number;
  };
  readonly derivedArtifact: null;
}

export interface RasterUploadInspection extends UploadInspectionBase {
  readonly metrics: {
    readonly kind: 'raster';
    readonly decodeVerified: boolean;
    readonly width: number;
    readonly height: number;
    readonly frameCount: number;
  };
  readonly derivedArtifact: {
    readonly policy: 'reencode-required';
    readonly objectReference: ResourceId;
    readonly contentDigest: Sha256Digest;
  };
}

export interface VideoUploadInspection extends UploadInspectionBase {
  readonly metrics: {
    readonly kind: 'video';
    readonly decodeVerified: boolean;
    readonly width: number;
    readonly height: number;
    readonly durationMilliseconds: number;
    readonly frameRate: number;
  };
  readonly derivedArtifact: {
    readonly policy: 'transcode-required';
    readonly objectReference: ResourceId;
    readonly contentDigest: Sha256Digest;
  };
}

export type UploadInspection =
  TextUploadInspection | RasterUploadInspection | VideoUploadInspection;

function isUploadMetrics(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  if (value.kind === 'records') {
    return (
      hasExactKeys(value, [
        'kind',
        'utf8Valid',
        'recordCount',
        'maximumFieldsPerRecord',
        'maximumFieldBytes',
      ]) &&
      typeof value.utf8Valid === 'boolean' &&
      isNonNegativeInteger(value.recordCount) &&
      isNonNegativeInteger(value.maximumFieldsPerRecord) &&
      isNonNegativeInteger(value.maximumFieldBytes)
    );
  }
  if (value.kind === 'raster') {
    return (
      hasExactKeys(value, [
        'kind',
        'decodeVerified',
        'width',
        'height',
        'frameCount',
      ]) &&
      typeof value.decodeVerified === 'boolean' &&
      isPositiveInteger(value.width) &&
      isPositiveInteger(value.height) &&
      isPositiveInteger(value.frameCount)
    );
  }
  return (
    value.kind === 'video' &&
    hasExactKeys(value, [
      'kind',
      'decodeVerified',
      'width',
      'height',
      'durationMilliseconds',
      'frameRate',
    ]) &&
    typeof value.decodeVerified === 'boolean' &&
    isPositiveInteger(value.width) &&
    isPositiveInteger(value.height) &&
    isPositiveInteger(value.durationMilliseconds) &&
    typeof value.frameRate === 'number' &&
    Number.isFinite(value.frameRate) &&
    value.frameRate > 0
  );
}

function isDerivedArtifact(value: unknown, kind: unknown): boolean {
  if (kind === 'records') return value === null;
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['policy', 'objectReference', 'contentDigest']) &&
    value.policy ===
      (kind === 'raster' ? 'reencode-required' : 'transcode-required') &&
    isScopeIdentifier('resource', value.objectReference) &&
    isSha256Digest(value.contentDigest)
  );
}

export function isUploadInspection(value: unknown): value is UploadInspection {
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
        'expectedFormat',
        'detectedFormat',
        'storageObjectReference',
        'clientFilename',
        'declaredMediaType',
        'detectedMediaType',
        'byteLength',
        'contentDigest',
        'processingMilliseconds',
        'containsArchive',
        'containsActiveContent',
        'containsFormula',
        'containsExternalReference',
        'metrics',
        'derivedArtifact',
      ]) ||
      value.contractVersion !== contractVersion ||
      value.sourceContractVersion !== sourceContractVersion ||
      value.recordKind !== 'upload-inspection' ||
      !isWorkspace(value.workspace) ||
      !isSourceIdentifier(value.sourceDefinitionId) ||
      !isPositiveInteger(value.definitionRevision) ||
      !isSourceStream(value.stream) ||
      !isLogicalSourceFormat(value.expectedFormat) ||
      !isLogicalSourceFormat(value.detectedFormat) ||
      !isScopeIdentifier('resource', value.storageObjectReference) ||
      !isBoundedString(value.clientFilename, 255) ||
      !isBoundedString(value.declaredMediaType, 128) ||
      !isBoundedString(value.detectedMediaType, 128) ||
      !isNonNegativeInteger(value.byteLength) ||
      !isSha256Digest(value.contentDigest) ||
      !isNonNegativeInteger(value.processingMilliseconds) ||
      typeof value.containsArchive !== 'boolean' ||
      typeof value.containsActiveContent !== 'boolean' ||
      typeof value.containsFormula !== 'boolean' ||
      typeof value.containsExternalReference !== 'boolean' ||
      !isUploadMetrics(value.metrics)
    ) {
      return false;
    }
    return isDerivedArtifact(
      value.derivedArtifact,
      (value.metrics as { readonly kind: string }).kind,
    );
  });
}

export type UploadAdmissionResult =
  | {
      readonly status: 'accepted';
      readonly admission: {
        readonly workspace: Workspace;
        readonly sourceDefinitionId: SourceDefinitionId;
        readonly definitionRevision: number;
        readonly stream: SourceStream;
        readonly format: LogicalSourceFormat;
        readonly storageObjectReference: ResourceId;
        readonly contentDigest: Sha256Digest;
        readonly byteLength: number;
        readonly derivedArtifact: UploadInspection['derivedArtifact'];
      };
    }
  | {
      readonly status: 'rejected';
      readonly reason:
        | 'invalid-inspection'
        | 'definition-mismatch'
        | 'workspace-mismatch'
        | 'path-like-filename'
        | 'format-mismatch'
        | 'declared-type-mismatch'
        | 'archive-denied'
        | 'active-content-denied'
        | 'formula-denied'
        | 'external-reference-denied'
        | 'decode-failed'
        | 'budget-exceeded'
        | 'derived-artifact-required';
    };

function clientFilenameIsPathLike(value: string): boolean {
  return (
    /[\\/]/u.test(value) ||
    value === '.' ||
    value === '..' ||
    value.includes('\0') ||
    /^[A-Za-z]:/u.test(value)
  );
}

export function evaluateUploadInspection(
  definition: SourceDefinition,
  inspection: unknown,
): UploadAdmissionResult {
  if (
    !isSourceDefinition(definition) ||
    definition.mode !== 'uploaded-snapshot' ||
    !definition.enabled ||
    !isUploadInspection(inspection)
  ) {
    return { status: 'rejected', reason: 'invalid-inspection' };
  }
  if (!isExactWorkspace(definition.workspace, inspection.workspace)) {
    return { status: 'rejected', reason: 'workspace-mismatch' };
  }
  if (
    definition.sourceDefinitionId !== inspection.sourceDefinitionId ||
    definition.definitionRevision !== inspection.definitionRevision ||
    definition.stream !== inspection.stream ||
    definition.storageObjectReference !== inspection.storageObjectReference
  ) {
    return { status: 'rejected', reason: 'definition-mismatch' };
  }
  if (clientFilenameIsPathLike(inspection.clientFilename)) {
    return { status: 'rejected', reason: 'path-like-filename' };
  }
  if (
    definition.format !== inspection.expectedFormat ||
    inspection.detectedFormat !== inspection.expectedFormat
  ) {
    return { status: 'rejected', reason: 'format-mismatch' };
  }
  const mediaTypes = uploadDetectedMediaTypes[inspection.detectedFormat];
  if (
    !mediaTypes.includes(inspection.detectedMediaType) ||
    inspection.declaredMediaType !== inspection.detectedMediaType
  ) {
    return { status: 'rejected', reason: 'declared-type-mismatch' };
  }
  if (inspection.containsArchive) {
    return { status: 'rejected', reason: 'archive-denied' };
  }
  if (inspection.containsActiveContent) {
    return { status: 'rejected', reason: 'active-content-denied' };
  }
  if (inspection.containsFormula) {
    return { status: 'rejected', reason: 'formula-denied' };
  }
  if (inspection.containsExternalReference) {
    return { status: 'rejected', reason: 'external-reference-denied' };
  }
  const budget = sourceFormatBudgets[inspection.detectedFormat];
  if (
    inspection.byteLength > budget.maximumBytes ||
    inspection.byteLength > sourceTransactionBudget.maximumTotalBytes ||
    inspection.processingMilliseconds > budget.maximumProcessingMilliseconds ||
    inspection.processingMilliseconds >
      sourceTransactionBudget.maximumProcessingMilliseconds
  ) {
    return { status: 'rejected', reason: 'budget-exceeded' };
  }
  const metrics = inspection.metrics;
  if (metrics.kind === 'records') {
    if (
      !metrics.utf8Valid ||
      budget.kind !== 'records' ||
      metrics.recordCount > budget.maximumRecords ||
      metrics.recordCount > sourceTransactionBudget.maximumTotalRecords ||
      metrics.maximumFieldsPerRecord > budget.maximumFieldsPerRecord ||
      metrics.maximumFieldBytes > budget.maximumFieldBytes
    ) {
      return {
        status: 'rejected',
        reason: metrics.utf8Valid ? 'budget-exceeded' : 'decode-failed',
      };
    }
  } else if (metrics.kind === 'raster') {
    if (!metrics.decodeVerified) {
      return { status: 'rejected', reason: 'decode-failed' };
    }
    if (
      budget.kind !== 'raster' ||
      metrics.width > budget.maximumWidth ||
      metrics.height > budget.maximumHeight ||
      metrics.width * metrics.height > budget.maximumPixels ||
      metrics.frameCount > budget.maximumFrames
    ) {
      return { status: 'rejected', reason: 'budget-exceeded' };
    }
  } else {
    if (!metrics.decodeVerified) {
      return { status: 'rejected', reason: 'decode-failed' };
    }
    if (
      budget.kind !== 'video' ||
      metrics.width > budget.maximumWidth ||
      metrics.height > budget.maximumHeight ||
      metrics.durationMilliseconds > budget.maximumDurationMilliseconds ||
      metrics.frameRate > budget.maximumFrameRate
    ) {
      return { status: 'rejected', reason: 'budget-exceeded' };
    }
  }
  if (
    metrics.kind !== 'records' &&
    (inspection.derivedArtifact === null ||
      inspection.derivedArtifact.objectReference ===
        inspection.storageObjectReference)
  ) {
    return { status: 'rejected', reason: 'derived-artifact-required' };
  }
  return cloneJsonValue({
    status: 'accepted',
    admission: {
      workspace: inspection.workspace,
      sourceDefinitionId: inspection.sourceDefinitionId,
      definitionRevision: inspection.definitionRevision,
      stream: inspection.stream,
      format: inspection.detectedFormat,
      storageObjectReference: inspection.storageObjectReference,
      contentDigest: inspection.contentDigest,
      byteLength: inspection.byteLength,
      derivedArtifact: inspection.derivedArtifact,
    },
  });
}

export interface SharedResourceHopEvidence {
  readonly url: string;
  readonly dnsAnswers: readonly string[];
  readonly connectionAnswers: readonly string[];
  readonly peerAddress: string;
}

export interface SharedResourcePreflight extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly recordKind: 'shared-resource-preflight';
  readonly workspace: Workspace;
  readonly sourceDefinitionId: SourceDefinitionId;
  readonly definitionRevision: number;
  readonly attemptedAt: IsoInstant;
  readonly elapsedMilliseconds: number;
  readonly processingMilliseconds: number;
  readonly hops: readonly SharedResourceHopEvidence[];
  readonly detectedFormat: LogicalSourceFormat;
  readonly declaredMediaType: string;
  readonly detectedMediaType: string;
  readonly byteLength: number;
  readonly recordCount: number;
  readonly maximumFieldsPerRecord: number;
  readonly maximumFieldBytes: number;
  readonly utf8Valid: boolean;
  readonly structureValid: boolean;
  readonly containsActiveContent: boolean;
  readonly containsFormula: boolean;
  readonly containsExternalReference: boolean;
  readonly contentDigest: Sha256Digest;
}

interface NetworkPrefixPolicyEntry {
  readonly cidr: string;
  readonly basis:
    | 'iana-ipv4-special-purpose'
    | 'iana-ipv4-address-space'
    | 'iana-ipv6-special-purpose'
    | 'iana-ipv6-address-space';
}

export const sharedNetworkPolicyRegistryReview = {
  reviewedOn: '2026-08-31',
  sources: [
    {
      registry: 'iana-ipv4-special-purpose',
      lastUpdated: '2025-10-09',
      reference: 'https://www.iana.org/assignments/iana-ipv4-special-registry/',
    },
    {
      registry: 'iana-ipv4-address-space',
      lastUpdated: '2025-10-10',
      reference: 'https://www.iana.org/assignments/ipv4-address-space/',
    },
    {
      registry: 'iana-ipv6-special-purpose',
      lastUpdated: '2025-10-09',
      reference: 'https://www.iana.org/assignments/iana-ipv6-special-registry/',
    },
    {
      registry: 'iana-ipv6-address-space',
      lastUpdated: '2025-10-23',
      reference: 'https://www.iana.org/assignments/ipv6-address-space/',
    },
  ],
  maintenanceCondition:
    'Review before shared-resource implementation and whenever an IANA source registry updates.',
} as const;

/**
 * Conservative snapshot reviewed against the IANA IPv4 Special-Purpose and
 * IPv4 Address Space registries on 2026-08-31. Nested registry entries are
 * coalesced under their containing prefix; even globally reachable special
 * anycast ranges remain denied because shared-resource fetching needs ordinary
 * public destinations, not protocol-specific infrastructure.
 */
const deniedIpv4NetworkPrefixes: readonly NetworkPrefixPolicyEntry[] = [
  { cidr: '0.0.0.0/8', basis: 'iana-ipv4-special-purpose' },
  { cidr: '10.0.0.0/8', basis: 'iana-ipv4-special-purpose' },
  { cidr: '100.64.0.0/10', basis: 'iana-ipv4-special-purpose' },
  { cidr: '127.0.0.0/8', basis: 'iana-ipv4-special-purpose' },
  { cidr: '169.254.0.0/16', basis: 'iana-ipv4-special-purpose' },
  { cidr: '172.16.0.0/12', basis: 'iana-ipv4-special-purpose' },
  { cidr: '192.0.0.0/24', basis: 'iana-ipv4-special-purpose' },
  { cidr: '192.0.2.0/24', basis: 'iana-ipv4-special-purpose' },
  { cidr: '192.31.196.0/24', basis: 'iana-ipv4-special-purpose' },
  { cidr: '192.52.193.0/24', basis: 'iana-ipv4-special-purpose' },
  { cidr: '192.88.99.0/24', basis: 'iana-ipv4-special-purpose' },
  { cidr: '192.168.0.0/16', basis: 'iana-ipv4-special-purpose' },
  { cidr: '192.175.48.0/24', basis: 'iana-ipv4-special-purpose' },
  { cidr: '198.18.0.0/15', basis: 'iana-ipv4-special-purpose' },
  { cidr: '198.51.100.0/24', basis: 'iana-ipv4-special-purpose' },
  { cidr: '203.0.113.0/24', basis: 'iana-ipv4-special-purpose' },
  { cidr: '224.0.0.0/4', basis: 'iana-ipv4-address-space' },
  { cidr: '240.0.0.0/4', basis: 'iana-ipv4-special-purpose' },
] as const;

/**
 * Conservative snapshot reviewed against the IANA IPv6 Special-Purpose and
 * IPv6 Address Space registries on 2026-08-31. The positive envelope is the
 * currently allocated 2000::/3 global-unicast block; special-purpose prefixes
 * inside it and the returned 3ffe::/16 6bone block are denied explicitly.
 */
const allowedIpv6NetworkPrefixes: readonly NetworkPrefixPolicyEntry[] = [
  { cidr: '2000::/3', basis: 'iana-ipv6-address-space' },
] as const;

const deniedIpv6NetworkPrefixes: readonly NetworkPrefixPolicyEntry[] = [
  { cidr: '::/128', basis: 'iana-ipv6-special-purpose' },
  { cidr: '::1/128', basis: 'iana-ipv6-special-purpose' },
  { cidr: '::ffff:0:0/96', basis: 'iana-ipv6-special-purpose' },
  { cidr: '64:ff9b::/96', basis: 'iana-ipv6-special-purpose' },
  { cidr: '64:ff9b:1::/48', basis: 'iana-ipv6-special-purpose' },
  { cidr: '100::/64', basis: 'iana-ipv6-special-purpose' },
  { cidr: '100:0:0:1::/64', basis: 'iana-ipv6-special-purpose' },
  { cidr: '2001::/23', basis: 'iana-ipv6-special-purpose' },
  { cidr: '2001:db8::/32', basis: 'iana-ipv6-special-purpose' },
  { cidr: '2002::/16', basis: 'iana-ipv6-special-purpose' },
  { cidr: '2620:4f:8000::/48', basis: 'iana-ipv6-special-purpose' },
  { cidr: '3ffe::/16', basis: 'iana-ipv6-address-space' },
  { cidr: '3fff::/20', basis: 'iana-ipv6-special-purpose' },
  { cidr: '5f00::/16', basis: 'iana-ipv6-special-purpose' },
  { cidr: 'fc00::/7', basis: 'iana-ipv6-special-purpose' },
  { cidr: 'fe80::/10', basis: 'iana-ipv6-special-purpose' },
] as const;

function ipv4ToInteger(address: string): bigint {
  return address
    .split('.')
    .map(Number)
    .reduce((value, octet) => (value << 8n) | BigInt(octet), 0n);
}

function ipv6ToInteger(address: string): bigint {
  let normalized = address.toLowerCase();
  if (normalized.includes('.')) {
    const separator = normalized.lastIndexOf(':');
    const ipv4 = normalized.slice(separator + 1);
    const value = ipv4ToInteger(ipv4);
    normalized = `${normalized.slice(0, separator)}:${(
      (value >> 16n) &
      0xffffn
    ).toString(16)}:${(value & 0xffffn).toString(16)}`;
  }
  const [left = '', right = ''] = normalized.split('::');
  const leftParts = left === '' ? [] : left.split(':');
  const rightParts = right === '' ? [] : right.split(':');
  const omitted = 8 - leftParts.length - rightParts.length;
  const parts = [
    ...leftParts,
    ...Array.from({ length: omitted }, () => '0'),
    ...rightParts,
  ];
  return parts.reduce(
    (value, part) => (value << 16n) | BigInt(`0x${part}`),
    0n,
  );
}

function addressMatchesPrefix(address: string, cidr: string): boolean {
  const [network = '', prefixText = ''] = cidr.split('/');
  const family = isIP(address);
  if (family === 0 || family !== isIP(network)) return false;
  const prefixLength = Number(prefixText);
  const bitLength = family === 4 ? 32 : 128;
  if (
    !Number.isInteger(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > bitLength
  ) {
    return false;
  }
  const shift = BigInt(bitLength - prefixLength);
  const addressValue =
    family === 4 ? ipv4ToInteger(address) : ipv6ToInteger(address);
  const networkValue =
    family === 4 ? ipv4ToInteger(network) : ipv6ToInteger(network);
  return addressValue >> shift === networkValue >> shift;
}

export function isPublicNetworkAddress(address: unknown): address is string {
  if (typeof address !== 'string') return false;
  const family = isIP(address);
  if (family === 4) {
    return !deniedIpv4NetworkPrefixes.some(({ cidr }) =>
      addressMatchesPrefix(address, cidr),
    );
  }
  return (
    family === 6 &&
    allowedIpv6NetworkPrefixes.some(({ cidr }) =>
      addressMatchesPrefix(address, cidr),
    ) &&
    !deniedIpv6NetworkPrefixes.some(({ cidr }) =>
      addressMatchesPrefix(address, cidr),
    )
  );
}

function isSharedResourceHopEvidence(
  value: unknown,
): value is SharedResourceHopEvidence {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'url',
      'dnsAnswers',
      'connectionAnswers',
      'peerAddress',
    ]) &&
    isBoundedString(value.url, 2_048) &&
    isDenseArray(value.dnsAnswers) &&
    value.dnsAnswers.length > 0 &&
    value.dnsAnswers.length <= 8 &&
    value.dnsAnswers.every((address) => typeof address === 'string') &&
    hasUniqueValues(value.dnsAnswers as readonly string[]) &&
    isSorted(value.dnsAnswers as readonly string[]) &&
    isDenseArray(value.connectionAnswers) &&
    value.connectionAnswers.length > 0 &&
    value.connectionAnswers.length <= 8 &&
    value.connectionAnswers.every((address) => typeof address === 'string') &&
    hasUniqueValues(value.connectionAnswers as readonly string[]) &&
    isSorted(value.connectionAnswers as readonly string[]) &&
    typeof value.peerAddress === 'string'
  );
}

function isSafeSharedUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.replace(/^\[|\]$/gu, '');
    return (
      parsed.protocol === 'https:' &&
      parsed.username === '' &&
      parsed.password === '' &&
      parsed.hash === '' &&
      hostname.length > 0 &&
      hostname.length <= 253 &&
      isIP(hostname) === 0
    );
  } catch {
    return false;
  }
}

export type SharedResourcePreflightResult =
  | {
      readonly status: 'accepted';
      readonly evidence: {
        readonly workspace: Workspace;
        readonly sourceDefinitionId: SourceDefinitionId;
        readonly definitionRevision: number;
        readonly attemptedAt: IsoInstant;
        readonly redirectCount: number;
        readonly format: LogicalSourceFormat;
        readonly byteLength: number;
        readonly recordCount: number;
        readonly contentDigest: Sha256Digest;
      };
    }
  | {
      readonly status: 'rejected';
      readonly reason:
        | 'invalid-preflight'
        | 'definition-mismatch'
        | 'workspace-mismatch'
        | 'unsafe-url'
        | 'redirect-budget-exceeded'
        | 'unsafe-address'
        | 'dns-rebinding-detected'
        | 'peer-mismatch'
        | 'content-type-mismatch'
        | 'decode-failed'
        | 'active-content-denied'
        | 'formula-denied'
        | 'external-reference-denied'
        | 'budget-exceeded';
    };

export function evaluateSharedResourcePreflight(
  definition: SourceDefinition,
  preflight: unknown,
): SharedResourcePreflightResult {
  if (
    !isSourceDefinition(definition) ||
    definition.mode !== 'shared-resource' ||
    !definition.enabled ||
    !isPlainObject(preflight) ||
    !hasExactKeys(preflight, [
      'contractVersion',
      'sourceContractVersion',
      'recordKind',
      'workspace',
      'sourceDefinitionId',
      'definitionRevision',
      'attemptedAt',
      'elapsedMilliseconds',
      'processingMilliseconds',
      'hops',
      'detectedFormat',
      'declaredMediaType',
      'detectedMediaType',
      'byteLength',
      'recordCount',
      'maximumFieldsPerRecord',
      'maximumFieldBytes',
      'utf8Valid',
      'structureValid',
      'containsActiveContent',
      'containsFormula',
      'containsExternalReference',
      'contentDigest',
    ]) ||
    preflight.contractVersion !== contractVersion ||
    preflight.sourceContractVersion !== sourceContractVersion ||
    preflight.recordKind !== 'shared-resource-preflight' ||
    !isWorkspace(preflight.workspace) ||
    !isSourceIdentifier(preflight.sourceDefinitionId) ||
    !isPositiveInteger(preflight.definitionRevision) ||
    !isIsoInstant(preflight.attemptedAt) ||
    !isNonNegativeInteger(preflight.elapsedMilliseconds) ||
    !isNonNegativeInteger(preflight.processingMilliseconds) ||
    !isDenseArray(preflight.hops) ||
    preflight.hops.length === 0 ||
    !preflight.hops.every(isSharedResourceHopEvidence) ||
    !isLogicalSourceFormat(preflight.detectedFormat) ||
    !isBoundedString(preflight.declaredMediaType, 128) ||
    !isBoundedString(preflight.detectedMediaType, 128) ||
    !isNonNegativeInteger(preflight.byteLength) ||
    !isNonNegativeInteger(preflight.recordCount) ||
    !isNonNegativeInteger(preflight.maximumFieldsPerRecord) ||
    !isNonNegativeInteger(preflight.maximumFieldBytes) ||
    typeof preflight.utf8Valid !== 'boolean' ||
    typeof preflight.structureValid !== 'boolean' ||
    typeof preflight.containsActiveContent !== 'boolean' ||
    typeof preflight.containsFormula !== 'boolean' ||
    typeof preflight.containsExternalReference !== 'boolean' ||
    !isSha256Digest(preflight.contentDigest)
  ) {
    return { status: 'rejected', reason: 'invalid-preflight' };
  }
  const evidence = preflight as unknown as SharedResourcePreflight;
  if (!isExactWorkspace(definition.workspace, evidence.workspace)) {
    return { status: 'rejected', reason: 'workspace-mismatch' };
  }
  if (
    definition.sourceDefinitionId !== evidence.sourceDefinitionId ||
    definition.definitionRevision !== evidence.definitionRevision
  ) {
    return { status: 'rejected', reason: 'definition-mismatch' };
  }
  if (evidence.hops.some((hop) => !isSafeSharedUrl(hop.url))) {
    return { status: 'rejected', reason: 'unsafe-url' };
  }
  if (evidence.hops.length - 1 > sharedResourceRefreshPolicy.maximumRedirects) {
    return { status: 'rejected', reason: 'redirect-budget-exceeded' };
  }
  for (const hop of evidence.hops) {
    if (
      hop.dnsAnswers.some((address) => !isPublicNetworkAddress(address)) ||
      hop.connectionAnswers.some((address) => !isPublicNetworkAddress(address))
    ) {
      return { status: 'rejected', reason: 'unsafe-address' };
    }
    if (
      JSON.stringify(hop.dnsAnswers) !== JSON.stringify(hop.connectionAnswers)
    ) {
      return { status: 'rejected', reason: 'dns-rebinding-detected' };
    }
    if (!hop.connectionAnswers.includes(hop.peerAddress)) {
      return { status: 'rejected', reason: 'peer-mismatch' };
    }
  }
  if (
    definition.format !== evidence.detectedFormat ||
    !uploadDetectedMediaTypes[evidence.detectedFormat].includes(
      evidence.detectedMediaType,
    ) ||
    evidence.declaredMediaType !== evidence.detectedMediaType
  ) {
    return { status: 'rejected', reason: 'content-type-mismatch' };
  }
  if (!evidence.utf8Valid || !evidence.structureValid) {
    return { status: 'rejected', reason: 'decode-failed' };
  }
  if (evidence.containsActiveContent) {
    return { status: 'rejected', reason: 'active-content-denied' };
  }
  if (evidence.containsFormula) {
    return { status: 'rejected', reason: 'formula-denied' };
  }
  if (evidence.containsExternalReference) {
    return { status: 'rejected', reason: 'external-reference-denied' };
  }
  const budget = sourceFormatBudgets[evidence.detectedFormat];
  if (
    evidence.elapsedMilliseconds >
      sharedResourceRefreshPolicy.maximumRequestMilliseconds ||
    evidence.byteLength > budget.maximumBytes ||
    (budget.kind === 'records' &&
      (evidence.recordCount > budget.maximumRecords ||
        evidence.maximumFieldsPerRecord > budget.maximumFieldsPerRecord ||
        evidence.maximumFieldBytes > budget.maximumFieldBytes ||
        evidence.processingMilliseconds > budget.maximumProcessingMilliseconds))
  ) {
    return { status: 'rejected', reason: 'budget-exceeded' };
  }
  return cloneJsonValue({
    status: 'accepted',
    evidence: {
      workspace: evidence.workspace,
      sourceDefinitionId: evidence.sourceDefinitionId,
      definitionRevision: evidence.definitionRevision,
      attemptedAt: evidence.attemptedAt,
      redirectCount: evidence.hops.length - 1,
      format: evidence.detectedFormat,
      byteLength: evidence.byteLength,
      recordCount: evidence.recordCount,
      contentDigest: evidence.contentDigest,
    },
  });
}

export const providerGrantStatuses = [
  'pending',
  'active',
  'partial',
  'expired',
  'reconnect-required',
  'revoked',
] as const;
export type ProviderGrantStatus = (typeof providerGrantStatuses)[number];

export const providerGrantFailureCodes = [
  'partial-consent',
  'provider-expired',
  'provider-revoked',
  'reauthorization-required',
] as const;
export type ProviderGrantFailureCode =
  (typeof providerGrantFailureCodes)[number];

export interface ProviderGrantState extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly recordKind: 'provider-grant-state';
  readonly workspace: Workspace;
  readonly grantId: ProviderGrantId;
  readonly provider: ConnectedProvider;
  readonly status: ProviderGrantStatus;
  readonly capabilities: readonly ConnectedCapability[];
  readonly selectedResourceReferences: readonly ResourceId[];
  readonly protectedGrantReference: ProtectedSecretReference | null;
  readonly issuedAt: IsoInstant | null;
  readonly expiresAt: IsoInstant | null;
  readonly revokedAt: IsoInstant | null;
  readonly failureCode: ProviderGrantFailureCode | null;
}

export interface ProviderConsentTransaction extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly recordKind: 'provider-consent-transaction';
  readonly workspace: Workspace;
  readonly transactionReference: ResourceId;
  readonly actorId: ActorId;
  readonly sessionReference: ResourceId;
  readonly provider: ConnectedProvider;
  readonly issuerReference: ResourceId;
  readonly redirectReference: ResourceId;
  readonly capability: ConnectedCapability;
  readonly selectedResourceReference: ResourceId;
  readonly stateBindingReference: ResourceId;
  readonly pkceVerifierReference: ProtectedSecretReference;
  readonly nonceReference: ResourceId | null;
  readonly createdAt: IsoInstant;
  readonly expiresAt: IsoInstant;
  readonly status: 'pending' | 'consumed' | 'expired';
  readonly closedAt: IsoInstant | null;
}

/** Validates the short-lived, workspace-bound OAuth correlation record. */
export function isProviderConsentTransaction(
  value: unknown,
): value is ProviderConsentTransaction {
  return safelyValidate(
    () =>
      isPlainObject(value) &&
      hasExactKeys(value, [
        'contractVersion',
        'sourceContractVersion',
        'recordKind',
        'workspace',
        'transactionReference',
        'actorId',
        'sessionReference',
        'provider',
        'issuerReference',
        'redirectReference',
        'capability',
        'selectedResourceReference',
        'stateBindingReference',
        'pkceVerifierReference',
        'nonceReference',
        'createdAt',
        'expiresAt',
        'status',
        'closedAt',
      ]) &&
      value.contractVersion === contractVersion &&
      value.sourceContractVersion === sourceContractVersion &&
      value.recordKind === 'provider-consent-transaction' &&
      isWorkspace(value.workspace) &&
      isScopeIdentifier('resource', value.transactionReference) &&
      isScopeIdentifier('actor', value.actorId) &&
      isScopeIdentifier('resource', value.sessionReference) &&
      connectedProviders.includes(value.provider as ConnectedProvider) &&
      isScopeIdentifier('resource', value.issuerReference) &&
      isScopeIdentifier('resource', value.redirectReference) &&
      connectedCapabilities.includes(value.capability as ConnectedCapability) &&
      isScopeIdentifier('resource', value.selectedResourceReference) &&
      isScopeIdentifier('resource', value.stateBindingReference) &&
      isProtectedSecretReference(value.pkceVerifierReference) &&
      (value.nonceReference === null ||
        isScopeIdentifier('resource', value.nonceReference)) &&
      isIsoInstant(value.createdAt) &&
      isIsoInstant(value.expiresAt) &&
      Date.parse(value.createdAt) < Date.parse(value.expiresAt) &&
      ['pending', 'consumed', 'expired'].includes(value.status as string) &&
      (value.closedAt === null || isIsoInstant(value.closedAt)) &&
      (value.status === 'pending'
        ? value.closedAt === null
        : value.status === 'consumed'
          ? value.closedAt !== null &&
            Date.parse(value.createdAt) <= Date.parse(value.closedAt) &&
            Date.parse(value.closedAt) <= Date.parse(value.expiresAt)
          : value.closedAt !== null &&
            Date.parse(value.closedAt) >= Date.parse(value.expiresAt)),
  );
}

export function isProviderGrantState(
  value: unknown,
): value is ProviderGrantState {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, [
        'contractVersion',
        'sourceContractVersion',
        'recordKind',
        'workspace',
        'grantId',
        'provider',
        'status',
        'capabilities',
        'selectedResourceReferences',
        'protectedGrantReference',
        'issuedAt',
        'expiresAt',
        'revokedAt',
        'failureCode',
      ]) ||
      value.contractVersion !== contractVersion ||
      value.sourceContractVersion !== sourceContractVersion ||
      value.recordKind !== 'provider-grant-state' ||
      !isWorkspace(value.workspace) ||
      !isSourceIdentifier(value.grantId) ||
      !connectedProviders.includes(value.provider as ConnectedProvider) ||
      !providerGrantStatuses.includes(value.status as ProviderGrantStatus) ||
      !isDenseArray(value.capabilities) ||
      value.capabilities.length > connectedCapabilities.length ||
      !value.capabilities.every((capability) =>
        connectedCapabilities.includes(capability as ConnectedCapability),
      ) ||
      !hasUniqueValues(value.capabilities as readonly string[]) ||
      !isSorted(value.capabilities as readonly string[]) ||
      !isDenseArray(value.selectedResourceReferences) ||
      value.selectedResourceReferences.length > 32 ||
      !value.selectedResourceReferences.every((reference) =>
        isScopeIdentifier('resource', reference),
      ) ||
      !hasUniqueValues(value.selectedResourceReferences as readonly string[]) ||
      !isSorted(value.selectedResourceReferences as readonly string[]) ||
      (value.protectedGrantReference !== null &&
        !isProtectedSecretReference(value.protectedGrantReference)) ||
      (value.issuedAt !== null && !isIsoInstant(value.issuedAt)) ||
      (value.expiresAt !== null && !isIsoInstant(value.expiresAt)) ||
      (value.revokedAt !== null && !isIsoInstant(value.revokedAt)) ||
      (value.failureCode !== null &&
        !providerGrantFailureCodes.includes(
          value.failureCode as ProviderGrantFailureCode,
        ))
    ) {
      return false;
    }
    if (value.status === 'active') {
      return (
        value.protectedGrantReference !== null &&
        value.issuedAt !== null &&
        value.expiresAt !== null &&
        Date.parse(value.issuedAt) < Date.parse(value.expiresAt) &&
        value.revokedAt === null &&
        value.failureCode === null &&
        value.capabilities.length > 0 &&
        value.selectedResourceReferences.length > 0
      );
    }
    if (value.status === 'revoked') {
      return (
        value.protectedGrantReference === null &&
        value.revokedAt !== null &&
        value.failureCode === 'provider-revoked'
      );
    }
    if (value.protectedGrantReference !== null || value.revokedAt !== null) {
      return false;
    }
    if (value.status === 'pending') {
      return (
        value.issuedAt === null &&
        value.expiresAt === null &&
        value.failureCode === null &&
        value.capabilities.length === 0 &&
        value.selectedResourceReferences.length === 0
      );
    }
    if (value.status === 'partial') {
      return (
        value.expiresAt === null && value.failureCode === 'partial-consent'
      );
    }
    if (value.status === 'expired') {
      return (
        value.expiresAt !== null && value.failureCode === 'provider-expired'
      );
    }
    return (
      value.status === 'reconnect-required' &&
      value.failureCode === 'reauthorization-required'
    );
  });
}

export type ConnectedGrantAdmissionResult =
  | {
      readonly status: 'accepted';
      readonly grantReference: ProtectedSecretReference;
    }
  | {
      readonly status: 'rejected';
      readonly reason:
        | 'invalid-definition-or-grant'
        | 'workspace-mismatch'
        | 'grant-mismatch'
        | 'grant-not-active'
        | 'grant-not-yet-valid'
        | 'grant-expired'
        | 'capability-missing'
        | 'resource-not-selected';
    };

export function evaluateConnectedSourceGrant(
  definition: SourceDefinition,
  grant: unknown,
  evaluatedAt: unknown,
): ConnectedGrantAdmissionResult {
  if (
    !isSourceDefinition(definition) ||
    definition.mode !== 'connected-account' ||
    !definition.enabled ||
    !isProviderGrantState(grant) ||
    !isIsoInstant(evaluatedAt)
  ) {
    return { status: 'rejected', reason: 'invalid-definition-or-grant' };
  }
  if (!isExactWorkspace(definition.workspace, grant.workspace)) {
    return { status: 'rejected', reason: 'workspace-mismatch' };
  }
  if (
    definition.grantId !== grant.grantId ||
    definition.consent.provider !== grant.provider
  ) {
    return { status: 'rejected', reason: 'grant-mismatch' };
  }
  if (grant.status !== 'active' || grant.protectedGrantReference === null) {
    return { status: 'rejected', reason: 'grant-not-active' };
  }
  if (
    grant.issuedAt === null ||
    Date.parse(evaluatedAt) < Date.parse(grant.issuedAt)
  ) {
    return { status: 'rejected', reason: 'grant-not-yet-valid' };
  }
  if (
    grant.expiresAt === null ||
    Date.parse(evaluatedAt) >= Date.parse(grant.expiresAt)
  ) {
    return { status: 'rejected', reason: 'grant-expired' };
  }
  if (!grant.capabilities.includes(definition.consent.capability)) {
    return { status: 'rejected', reason: 'capability-missing' };
  }
  if (
    !grant.selectedResourceReferences.includes(
      definition.selectedResourceReference,
    )
  ) {
    return { status: 'rejected', reason: 'resource-not-selected' };
  }
  return cloneJsonValue({
    status: 'accepted',
    grantReference: grant.protectedGrantReference,
  });
}

export interface SourceReadRequest extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly workspace: Workspace;
  readonly sourceDefinitionId: SourceDefinitionId;
  readonly purpose: 'read' | 'preview';
  readonly targets: ScopedTargets;
  readonly requestedAt: IsoInstant;
}

export function isSourceReadRequest(
  value: unknown,
): value is SourceReadRequest {
  if (
    !isPlainObject(value) ||
    !(
      hasExactKeys(value, [
        'contractVersion',
        'sourceContractVersion',
        'workspace',
        'sourceDefinitionId',
        'purpose',
        'targets',
        'requestedAt',
      ]) &&
      value.contractVersion === contractVersion &&
      value.sourceContractVersion === sourceContractVersion &&
      isWorkspace(value.workspace) &&
      isSourceIdentifier(value.sourceDefinitionId) &&
      (value.purpose === 'read' || value.purpose === 'preview') &&
      isDenseArray(value.targets) &&
      value.targets.length > 0 &&
      value.targets.length <= 16 &&
      value.targets.every(isScopedTarget) &&
      isIsoInstant(value.requestedAt)
    )
  ) {
    return false;
  }
  const workspace = value.workspace;
  return value.targets.every(
    (target) => target.workspaceId === workspace.workspaceId,
  );
}

export const automaticClassroomProviderNecessity = {
  capability: 'classroom-coursework-read',
  providerAuthorizationNecessaryFor: [
    'automatic-course-discovery',
    'automatic-coursework-refresh',
  ],
  doesNotAuthorize: [
    'rosters',
    'submissions',
    'grades',
    'calendar-write',
    'chalkwright-login',
  ],
  displayEquivalentFirstReleaseModes: [
    'application-managed',
    'uploaded-snapshot',
    'shared-resource',
  ],
} as const;
