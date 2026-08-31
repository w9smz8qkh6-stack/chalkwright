import {
  contractVersion,
  scopeIdentifier,
  sourceContractVersion,
  sourceIdentifier,
  sourceObservationDigest,
  stateIdentifier,
  type ApplicationManagedSourceDefinition,
  type ConnectedAccountSourceDefinition,
  type ProviderConsentTransaction,
  type ProviderGrantState,
  type RasterUploadInspection,
  type SharedResourcePreflight,
  type SharedResourceSourceDefinition,
  type TextUploadInspection,
  type UploadedSnapshotSourceDefinition,
  type VerifiedObservationAttempt,
  type VerifiedSourceObservation,
} from '../../src/contracts/v1/index.js';
import { hostedWorkspace, selfHostedWorkspace } from './configuration-state.js';

const syntheticSecret = (name: string) => ({
  kind: 'protected-secret-reference' as const,
  referenceId: stateIdentifier('secret-reference', name),
});

export const managedSourceDefinition: ApplicationManagedSourceDefinition = {
  contractVersion,
  sourceContractVersion,
  recordKind: 'source-definition',
  workspace: selfHostedWorkspace,
  sourceDefinitionId: sourceIdentifier(
    'source-definition',
    'source-definition-synthetic-managed',
  ),
  definitionRevision: 1,
  stream: 'presentation-controls',
  mode: 'application-managed',
  format: 'canonical-records-v1',
  enabled: true,
  revisedAt: '2026-08-31T01:00:00.000Z',
  contentReference: scopeIdentifier(
    'resource',
    'managed-content-synthetic-controls',
  ),
};

export const uploadedSourceDefinition: UploadedSnapshotSourceDefinition = {
  contractVersion,
  sourceContractVersion,
  recordKind: 'source-definition',
  workspace: selfHostedWorkspace,
  sourceDefinitionId: sourceIdentifier(
    'source-definition',
    'source-definition-synthetic-upload',
  ),
  definitionRevision: 2,
  stream: 'course-catalog-mapping',
  mode: 'uploaded-snapshot',
  format: 'utf8-csv-v1',
  enabled: true,
  revisedAt: '2026-08-31T01:05:00.000Z',
  storageObjectReference: scopeIdentifier(
    'resource',
    'storage-object-synthetic-course-csv',
  ),
  admissionReference: scopeIdentifier(
    'resource',
    'upload-admission-synthetic-course-csv',
  ),
};

export const mediaUploadSourceDefinition: UploadedSnapshotSourceDefinition = {
  ...uploadedSourceDefinition,
  sourceDefinitionId: sourceIdentifier(
    'source-definition',
    'source-definition-synthetic-media-upload',
  ),
  stream: 'branding-display-media',
  format: 'raster-png-v1',
  storageObjectReference: scopeIdentifier(
    'resource',
    'storage-object-synthetic-brand-png',
  ),
  admissionReference: scopeIdentifier(
    'resource',
    'upload-admission-synthetic-brand-png',
  ),
};

export const sharedSourceDefinition: SharedResourceSourceDefinition = {
  contractVersion,
  sourceContractVersion,
  recordKind: 'source-definition',
  workspace: hostedWorkspace,
  sourceDefinitionId: sourceIdentifier(
    'source-definition',
    'source-definition-synthetic-shared',
  ),
  definitionRevision: 3,
  stream: 'calendar-exceptions',
  mode: 'shared-resource',
  format: 'utf8-icalendar-v1',
  enabled: true,
  revisedAt: '2026-08-31T01:10:00.000Z',
  locatorReference: scopeIdentifier(
    'resource',
    'shared-locator-synthetic-calendar',
  ),
  access: { kind: 'public-published' },
  refreshPolicy: {
    minimumRefreshIntervalSeconds: 900,
    maximumRedirects: 4,
    maximumRequestMilliseconds: 10_000,
    maximumConcurrentFetchesPerWorkspace: 2,
    maximumRetries: 2,
    maximumFanOut: 4,
    requireHttps: true,
    requireStableDnsAnswersThroughConnect: true,
    commitOnlyValidatedProjection: true,
  },
};

export const connectedSourceDefinition: ConnectedAccountSourceDefinition = {
  contractVersion,
  sourceContractVersion,
  recordKind: 'source-definition',
  workspace: hostedWorkspace,
  sourceDefinitionId: sourceIdentifier(
    'source-definition',
    'source-definition-synthetic-connected',
  ),
  definitionRevision: 4,
  stream: 'assignments-links',
  mode: 'connected-account',
  format: 'provider-projection-v1',
  enabled: true,
  revisedAt: '2026-08-31T01:15:00.000Z',
  grantId: sourceIdentifier('provider-grant', 'grant-synthetic-classroom'),
  selectedResourceReference: scopeIdentifier(
    'resource',
    'provider-resource-synthetic-course',
  ),
  consent: {
    provider: 'google',
    issuerReference: scopeIdentifier(
      'resource',
      'provider-issuer-synthetic-google',
    ),
    redirectReference: scopeIdentifier(
      'resource',
      'provider-redirect-synthetic-local',
    ),
    capability: 'classroom-coursework-read',
    readOnly: true,
    stateRequired: true,
    pkceMethod: 'S256',
    noncePolicy: 'required-when-issued',
  },
};

export const validCsvInspection: TextUploadInspection = {
  contractVersion,
  sourceContractVersion,
  recordKind: 'upload-inspection',
  workspace: selfHostedWorkspace,
  sourceDefinitionId: uploadedSourceDefinition.sourceDefinitionId,
  definitionRevision: uploadedSourceDefinition.definitionRevision,
  stream: uploadedSourceDefinition.stream,
  expectedFormat: 'utf8-csv-v1',
  detectedFormat: 'utf8-csv-v1',
  storageObjectReference: uploadedSourceDefinition.storageObjectReference,
  clientFilename: 'synthetic-course-map.csv',
  declaredMediaType: 'text/csv',
  detectedMediaType: 'text/csv',
  byteLength: 4_096,
  contentDigest: sourceObservationDigest('synthetic csv bytes'),
  processingMilliseconds: 20,
  containsArchive: false,
  containsActiveContent: false,
  containsFormula: false,
  containsExternalReference: false,
  metrics: {
    kind: 'records',
    utf8Valid: true,
    recordCount: 20,
    maximumFieldsPerRecord: 8,
    maximumFieldBytes: 128,
  },
  derivedArtifact: null,
};

export const validRasterInspection: RasterUploadInspection = {
  ...validCsvInspection,
  sourceDefinitionId: mediaUploadSourceDefinition.sourceDefinitionId,
  stream: mediaUploadSourceDefinition.stream,
  expectedFormat: 'raster-png-v1',
  detectedFormat: 'raster-png-v1',
  storageObjectReference: mediaUploadSourceDefinition.storageObjectReference,
  clientFilename: 'synthetic-brand.png',
  declaredMediaType: 'image/png',
  detectedMediaType: 'image/png',
  byteLength: 64_000,
  metrics: {
    kind: 'raster',
    decodeVerified: true,
    width: 1_920,
    height: 1_080,
    frameCount: 1,
  },
  derivedArtifact: {
    policy: 'reencode-required',
    objectReference: scopeIdentifier(
      'resource',
      'derived-object-synthetic-brand-png',
    ),
    contentDigest: sourceObservationDigest('synthetic reencoded png'),
  },
};

export const validSharedPreflight: SharedResourcePreflight = {
  contractVersion,
  sourceContractVersion,
  recordKind: 'shared-resource-preflight',
  workspace: hostedWorkspace,
  sourceDefinitionId: sharedSourceDefinition.sourceDefinitionId,
  definitionRevision: sharedSourceDefinition.definitionRevision,
  attemptedAt: '2026-08-31T02:00:00.000Z',
  elapsedMilliseconds: 200,
  processingMilliseconds: 25,
  hops: [
    {
      url: 'https://fixture.example.invalid/published.ics',
      dnsAnswers: ['93.184.216.34'],
      connectionAnswers: ['93.184.216.34'],
      peerAddress: '93.184.216.34',
    },
  ],
  detectedFormat: 'utf8-icalendar-v1',
  declaredMediaType: 'text/calendar',
  detectedMediaType: 'text/calendar',
  byteLength: 8_192,
  recordCount: 30,
  maximumFieldsPerRecord: 16,
  maximumFieldBytes: 512,
  utf8Valid: true,
  structureValid: true,
  containsActiveContent: false,
  containsFormula: false,
  containsExternalReference: false,
  contentDigest: sourceObservationDigest('synthetic ical bytes'),
};

export const activeProviderGrant: ProviderGrantState = {
  contractVersion,
  sourceContractVersion,
  recordKind: 'provider-grant-state',
  workspace: hostedWorkspace,
  grantId: connectedSourceDefinition.grantId,
  provider: 'google',
  status: 'active',
  capabilities: ['classroom-coursework-read'],
  selectedResourceReferences: [
    connectedSourceDefinition.selectedResourceReference,
  ],
  protectedGrantReference: syntheticSecret('secret-ref-synthetic-grant'),
  issuedAt: '2026-08-31T01:00:00.000Z',
  expiresAt: '2026-08-31T08:00:00.000Z',
  revokedAt: null,
  failureCode: null,
};

export const partialProviderGrant: ProviderGrantState = {
  ...activeProviderGrant,
  status: 'partial',
  capabilities: [],
  selectedResourceReferences: [],
  protectedGrantReference: null,
  expiresAt: null,
  failureCode: 'partial-consent',
};

export const providerConsentTransaction: ProviderConsentTransaction = {
  contractVersion,
  sourceContractVersion,
  recordKind: 'provider-consent-transaction',
  workspace: hostedWorkspace,
  transactionReference: scopeIdentifier(
    'resource',
    'consent-transaction-synthetic-classroom',
  ),
  actorId: scopeIdentifier('actor', 'actor-synthetic-hosted-admin'),
  sessionReference: scopeIdentifier('resource', 'session-synthetic-consent'),
  provider: 'google',
  issuerReference: connectedSourceDefinition.consent.issuerReference,
  redirectReference: connectedSourceDefinition.consent.redirectReference,
  capability: connectedSourceDefinition.consent.capability,
  selectedResourceReference:
    connectedSourceDefinition.selectedResourceReference,
  stateBindingReference: scopeIdentifier(
    'resource',
    'state-binding-synthetic-consent',
  ),
  pkceVerifierReference: syntheticSecret('secret-ref-synthetic-pkce'),
  nonceReference: scopeIdentifier('resource', 'nonce-synthetic-consent'),
  createdAt: '2026-08-31T01:30:00.000Z',
  expiresAt: '2026-08-31T01:40:00.000Z',
  status: 'pending',
  closedAt: null,
};

export const verifiedSharedObservation: VerifiedSourceObservation = {
  contractVersion,
  sourceContractVersion,
  recordKind: 'verified-source-observation',
  workspace: hostedWorkspace,
  observationId: sourceIdentifier(
    'source-observation',
    'observation-synthetic-shared-001',
  ),
  observationDigest: sourceObservationDigest('synthetic observation'),
  sourceDefinitionId: sharedSourceDefinition.sourceDefinitionId,
  definitionRevision: sharedSourceDefinition.definitionRevision,
  stream: sharedSourceDefinition.stream,
  mode: sharedSourceDefinition.mode,
  format: sharedSourceDefinition.format,
  acquisition: {
    kind: 'remote-fetch',
    fetchedAt: '2026-08-31T02:00:00.000Z',
  },
  verifiedAt: '2026-08-31T02:00:01.000Z',
  verification: {
    status: 'verified',
    scope: 'whole-input-and-projection',
  },
  candidateProjectionId: sourceIdentifier(
    'source-projection',
    'projection-synthetic-shared-001',
  ),
  candidateProjectionDigest: sourceObservationDigest('synthetic projection'),
};

export const verifiedSharedAttempt: VerifiedObservationAttempt = {
  contractVersion,
  sourceContractVersion,
  recordKind: 'source-refresh-attempt',
  outcome: 'verified-observation',
  attemptedAt: verifiedSharedObservation.verifiedAt,
  observation: verifiedSharedObservation,
  boundedRefreshWindow: {
    nextDueAt: '2026-08-31T02:15:01.000Z',
    expiresAt: '2026-08-31T03:00:01.000Z',
  },
};

export const sourceContractFixtureCatalog = {
  definitions: [
    managedSourceDefinition,
    uploadedSourceDefinition,
    mediaUploadSourceDefinition,
    sharedSourceDefinition,
    connectedSourceDefinition,
  ],
  inspections: [validCsvInspection, validRasterInspection],
  sharedPreflights: [validSharedPreflight],
  grants: [activeProviderGrant, partialProviderGrant],
  consentTransactions: [providerConsentTransaction],
  observations: [verifiedSharedObservation],
  attempts: [verifiedSharedAttempt],
} as const;
