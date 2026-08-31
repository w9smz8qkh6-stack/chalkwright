import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  applySourceObservation,
  automaticClassroomProviderNecessity,
  connectedCapabilities,
  contractVersion,
  deferredSourceBoundaries,
  evaluateConnectedSourceGrant,
  evaluateSharedResourcePreflight,
  evaluateUploadInspection,
  isCommittedSourceProjectionState,
  isProviderConsentTransaction,
  isProviderGrantState,
  isPublicNetworkAddress,
  isSourceDefinition,
  isSourceModeAvailabilityMatrix,
  isSourceReadRequest,
  isSourceRefreshAttempt,
  isUploadInspection,
  isVerifiedSourceObservation,
  logicalSourceFormats,
  scopeIdentifier,
  sharedNetworkPolicyRegistryReview,
  sourceContractVersion,
  sourceFormatBudgets,
  sourceModeAvailability,
  sourceModes,
  sourceStreams,
  sourceStreamFormats,
  sourceTransactionBudget,
  type CommittedSourceProjectionState,
  type SourceDefinition,
  type SourceObservationId,
  type SourceProjectionId,
  type VerifiedSourceObservation,
} from '../../../src/contracts/v1/index.js';
import {
  activeProviderGrant,
  connectedSourceDefinition,
  managedSourceDefinition,
  mediaUploadSourceDefinition,
  partialProviderGrant,
  providerConsentTransaction,
  sharedSourceDefinition,
  sourceContractFixtureCatalog,
  uploadedSourceDefinition,
  validCsvInspection,
  validRasterInspection,
  validSharedPreflight,
  verifiedSharedAttempt,
  verifiedSharedObservation,
} from '../../fixtures/source-contracts.js';
import {
  hostedWorkspace,
  selfHostedWorkspace,
} from '../../fixtures/configuration-state.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Value extends true> = Value;

const observationIsNotDefinition: Assert<
  Equal<Equal<VerifiedSourceObservation, SourceDefinition>, false>
> = true;
const observationIdIsNotProjectionId: Assert<
  Equal<Equal<SourceObservationId, SourceProjectionId>, false>
> = true;
void observationIsNotDefinition;
void observationIdIsNotProjectionId;

function clone<Value>(value: Value): Value {
  return structuredClone(value);
}

const sameIdDifferentInstallation = {
  ...selfHostedWorkspace,
  installationId: scopeIdentifier(
    'installation',
    'installation-synthetic-different',
  ),
};

const sameIdDifferentOrganization = {
  ...hostedWorkspace,
  organizationId: scopeIdentifier(
    'organization',
    'organization-synthetic-different',
  ),
};

const sameIdCrossKind = {
  contractVersion,
  kind: 'self-hosted-installation' as const,
  workspaceId: hostedWorkspace.workspaceId,
  installationId: scopeIdentifier(
    'installation',
    'installation-synthetic-cross-kind',
  ),
};

test('catalog is complete and gives every stream a non-connected first-release path', () => {
  assert.equal(isSourceModeAvailabilityMatrix(sourceModeAvailability), true);
  assert.equal(sourceModeAvailability.length, sourceStreams.length);
  assert.deepEqual(
    sourceModeAvailability.map((entry) => entry.stream),
    sourceStreams,
  );
  for (const entry of sourceModeAvailability) {
    assert.deepEqual(Object.keys(entry.modes), sourceModes);
    assert.equal(
      ['application-managed', 'uploaded-snapshot', 'shared-resource'].some(
        (mode) =>
          entry.modes[mode as keyof typeof entry.modes] === 'first-release',
      ),
      true,
    );
  }
  assert.equal(
    sourceModeAvailability.find(
      (entry) => entry.stream === 'presentation-controls',
    )?.modes['connected-account'],
    'not-applicable',
  );
  const drifted = clone(sourceModeAvailability) as unknown as Array<{
    stream: string;
    modes: Record<string, string>;
  }>;
  drifted[0]!.modes['uploaded-snapshot'] = 'first-release';
  assert.equal(isSourceModeAvailabilityMatrix(drifted), false);
});

test('format allowlists and concrete byte, record, processing, and media budgets are closed', () => {
  assert.deepEqual(Object.keys(sourceFormatBudgets), logicalSourceFormats);
  const csvBudget = sourceFormatBudgets['utf8-csv-v1'];
  const rasterBudget = sourceFormatBudgets['raster-png-v1'];
  const videoBudget = sourceFormatBudgets['display-mp4-v1'];
  assert.equal(csvBudget.maximumBytes, 1_048_576);
  assert.equal(csvBudget.kind, 'records');
  assert.equal(csvBudget.kind === 'records' && csvBudget.maximumRecords, 5_000);
  assert.equal(rasterBudget.kind, 'raster');
  assert.equal(
    rasterBudget.kind === 'raster' && rasterBudget.derivedArtifactPolicy,
    'reencode-required',
  );
  assert.equal(videoBudget.kind, 'video');
  assert.equal(
    videoBudget.kind === 'video' && videoBudget.maximumDurationMilliseconds,
    120_000,
  );
  assert.deepEqual(sourceStreamFormats['branding-display-media'], {
    'application-managed': ['canonical-records-v1'],
    'uploaded-snapshot': [
      'raster-png-v1',
      'raster-jpeg-v1',
      'raster-webp-v1',
      'display-mp4-v1',
    ],
  });
  assert.deepEqual(sourceTransactionBudget, {
    maximumDefinitions: 32,
    maximumTotalBytes: 67_108_864,
    maximumTotalRecords: 10_000,
    maximumProcessingMilliseconds: 15_000,
  });
  assert.equal(
    logicalSourceFormats.some((format) => /docx|xlsx|html/i.test(format)),
    false,
  );
});

test('all four definition modes validate with exact, stream-specific shapes', () => {
  for (const definition of sourceContractFixtureCatalog.definitions) {
    assert.equal(isSourceDefinition(definition), true);
  }
  assert.equal(
    isSourceDefinition({
      ...uploadedSourceDefinition,
      format: 'display-mp4-v1',
    }),
    false,
  );
  assert.equal(
    isSourceDefinition({ ...sharedSourceDefinition, unboundedRetries: true }),
    false,
  );
  const reorderedPolicy = {
    ...sharedSourceDefinition,
    refreshPolicy: Object.fromEntries(
      Object.entries(sharedSourceDefinition.refreshPolicy).reverse(),
    ),
  };
  assert.equal(isSourceDefinition(reorderedPolicy), true);
});

test('upload admission accepts verified text and rejects untrusted input properties', () => {
  const accepted = evaluateUploadInspection(
    uploadedSourceDefinition,
    validCsvInspection,
  );
  assert.equal(accepted.status, 'accepted');

  const cases: readonly [Record<string, unknown>, string][] = [
    [{ clientFilename: '../course.csv' }, 'path-like-filename'],
    [{ clientFilename: 'C:course.csv' }, 'path-like-filename'],
    [
      { clientFilename: `course${String.fromCharCode(0)}.csv` },
      'path-like-filename',
    ],
    [{ detectedFormat: 'utf8-icalendar-v1' }, 'format-mismatch'],
    [
      { declaredMediaType: 'application/octet-stream' },
      'declared-type-mismatch',
    ],
    [{ containsArchive: true }, 'archive-denied'],
    [{ containsActiveContent: true }, 'active-content-denied'],
    [{ containsFormula: true }, 'formula-denied'],
    [{ containsExternalReference: true }, 'external-reference-denied'],
    [
      {
        metrics: { ...validCsvInspection.metrics, utf8Valid: false },
      },
      'decode-failed',
    ],
    [
      {
        byteLength: sourceFormatBudgets['utf8-csv-v1'].maximumBytes + 1,
      },
      'budget-exceeded',
    ],
    [
      {
        metrics: {
          ...validCsvInspection.metrics,
          recordCount:
            sourceFormatBudgets['utf8-csv-v1'].kind === 'records'
              ? sourceFormatBudgets['utf8-csv-v1'].maximumRecords + 1
              : Number.MAX_SAFE_INTEGER,
        },
      },
      'budget-exceeded',
    ],
  ];
  for (const [change, reason] of cases) {
    assert.deepEqual(
      evaluateUploadInspection(uploadedSourceDefinition, {
        ...validCsvInspection,
        ...change,
      }),
      { status: 'rejected', reason },
    );
  }
  assert.equal(isUploadInspection(validCsvInspection), true);
  assert.equal(
    evaluateUploadInspection(
      { ...uploadedSourceDefinition, enabled: false },
      validCsvInspection,
    ).status,
    'rejected',
  );
});

test('media admission requires decode verification and a distinct normalized artifact', () => {
  assert.equal(
    evaluateUploadInspection(mediaUploadSourceDefinition, validRasterInspection)
      .status,
    'accepted',
  );
  assert.deepEqual(
    evaluateUploadInspection(mediaUploadSourceDefinition, {
      ...validRasterInspection,
      metrics: { ...validRasterInspection.metrics, decodeVerified: false },
    }),
    { status: 'rejected', reason: 'decode-failed' },
  );
  assert.deepEqual(
    evaluateUploadInspection(mediaUploadSourceDefinition, {
      ...validRasterInspection,
      derivedArtifact: {
        ...validRasterInspection.derivedArtifact,
        objectReference: validRasterInspection.storageObjectReference,
      },
    }),
    { status: 'rejected', reason: 'derived-artifact-required' },
  );
  assert.deepEqual(
    evaluateUploadInspection(mediaUploadSourceDefinition, {
      ...validRasterInspection,
      metrics: { ...validRasterInspection.metrics, frameCount: 2 },
    }),
    { status: 'rejected', reason: 'budget-exceeded' },
  );
});

test('upload admission binds the full workspace identity and definition revision', () => {
  for (const workspace of [
    sameIdDifferentInstallation,
    hostedWorkspace,
    {
      ...sameIdCrossKind,
      workspaceId: selfHostedWorkspace.workspaceId,
    },
  ]) {
    assert.deepEqual(
      evaluateUploadInspection(uploadedSourceDefinition, {
        ...validCsvInspection,
        workspace,
      }),
      { status: 'rejected', reason: 'workspace-mismatch' },
    );
  }
  assert.deepEqual(
    evaluateUploadInspection(uploadedSourceDefinition, {
      ...validCsvInspection,
      definitionRevision: 99,
    }),
    { status: 'rejected', reason: 'definition-mismatch' },
  );
});

test('shared-resource preflight accepts only bounded HTTPS fetch evidence', () => {
  const accepted = evaluateSharedResourcePreflight(
    sharedSourceDefinition,
    validSharedPreflight,
  );
  assert.equal(accepted.status, 'accepted');
  if (accepted.status === 'accepted') {
    assert.equal('url' in accepted.evidence, false);
    assert.equal(accepted.evidence.redirectCount, 0);
  }

  const unsafeUrls = [
    'http://calendar.synthetic.example/file.ics',
    'https://user:pass@calendar.synthetic.example/file.ics',
    'https://calendar.synthetic.example/file.ics#fragment',
    'https://127.0.0.1/file.ics',
    'https://[::1]/file.ics',
  ];
  for (const url of unsafeUrls) {
    assert.equal(
      evaluateSharedResourcePreflight(sharedSourceDefinition, {
        ...validSharedPreflight,
        hops: [{ ...validSharedPreflight.hops[0], url }],
      }).status,
      'rejected',
      url,
    );
  }
});

test('shared-resource preflight rejects private/reserved addresses, rebinding, and peer mismatch', () => {
  const denied = [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.1.1',
    '172.16.0.1',
    '192.0.2.1',
    '192.31.196.1',
    '192.52.193.1',
    '192.88.99.0',
    '192.88.99.255',
    '192.168.1.1',
    '192.175.48.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
    '::1',
    'fc00::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
    '2001:1::1',
    '2002::1',
    '2620:4f:8000::1',
    '3ffe::1',
    '3ffe:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    '3fff::1',
    '3fff:fff:ffff:ffff:ffff:ffff:ffff:ffff',
    '4000::1',
  ];
  for (const address of denied)
    assert.equal(isPublicNetworkAddress(address), false, address);
  assert.equal(isPublicNetworkAddress('93.184.216.34'), true);
  assert.equal(isPublicNetworkAddress('192.88.98.255'), true);
  assert.equal(isPublicNetworkAddress('192.88.100.0'), true);
  assert.equal(isPublicNetworkAddress('2001:200::1'), true);
  assert.equal(isPublicNetworkAddress('3ffd:ffff::1'), true);
  assert.equal(isPublicNetworkAddress('3fff:1000::1'), true);
  assert.equal(isPublicNetworkAddress('2606:4700:4700::1111'), true);
  assert.deepEqual(
    sharedNetworkPolicyRegistryReview.sources.map((source) => source.registry),
    [
      'iana-ipv4-special-purpose',
      'iana-ipv4-address-space',
      'iana-ipv6-special-purpose',
      'iana-ipv6-address-space',
    ],
  );
  assert.equal(sharedNetworkPolicyRegistryReview.reviewedOn, '2026-08-31');

  const hop = validSharedPreflight.hops[0];
  assert.deepEqual(
    evaluateSharedResourcePreflight(sharedSourceDefinition, {
      ...validSharedPreflight,
      hops: [
        {
          ...hop,
          dnsAnswers: ['10.0.0.1'],
          connectionAnswers: ['10.0.0.1'],
          peerAddress: '10.0.0.1',
        },
      ],
    }),
    { status: 'rejected', reason: 'unsafe-address' },
  );
  assert.deepEqual(
    evaluateSharedResourcePreflight(sharedSourceDefinition, {
      ...validSharedPreflight,
      hops: [
        { ...hop, connectionAnswers: ['1.1.1.1'], peerAddress: '1.1.1.1' },
      ],
    }),
    { status: 'rejected', reason: 'dns-rebinding-detected' },
  );
  assert.deepEqual(
    evaluateSharedResourcePreflight(sharedSourceDefinition, {
      ...validSharedPreflight,
      hops: [{ ...hop, peerAddress: '1.1.1.1' }],
    }),
    { status: 'rejected', reason: 'peer-mismatch' },
  );
  assert.deepEqual(
    evaluateSharedResourcePreflight(sharedSourceDefinition, {
      ...validSharedPreflight,
      hops: Array.from({ length: 6 }, () => hop),
    }),
    { status: 'rejected', reason: 'redirect-budget-exceeded' },
  );
});

test('shared-resource evidence enforces workspace, type, byte, record, and time budgets', () => {
  assert.deepEqual(
    evaluateSharedResourcePreflight(sharedSourceDefinition, {
      ...validSharedPreflight,
      workspace: sameIdDifferentOrganization,
    }),
    { status: 'rejected', reason: 'workspace-mismatch' },
  );
  const cases: readonly [Record<string, unknown>, string][] = [
    [{ detectedMediaType: 'text/csv' }, 'content-type-mismatch'],
    [{ utf8Valid: false }, 'decode-failed'],
    [{ structureValid: false }, 'decode-failed'],
    [{ containsActiveContent: true }, 'active-content-denied'],
    [{ containsFormula: true }, 'formula-denied'],
    [{ containsExternalReference: true }, 'external-reference-denied'],
    [{ elapsedMilliseconds: 10_001 }, 'budget-exceeded'],
    [{ processingMilliseconds: 3_001 }, 'budget-exceeded'],
    [{ byteLength: 524_289 }, 'budget-exceeded'],
    [{ recordCount: 2_001 }, 'budget-exceeded'],
    [{ maximumFieldsPerRecord: 65 }, 'budget-exceeded'],
    [{ maximumFieldBytes: 4_097 }, 'budget-exceeded'],
  ];
  for (const [change, reason] of cases) {
    assert.deepEqual(
      evaluateSharedResourcePreflight(sharedSourceDefinition, {
        ...validSharedPreflight,
        ...change,
      }),
      { status: 'rejected', reason },
    );
  }
});

test('connected grants are read-only, finite-state, and explicitly bound', () => {
  assert.equal(isProviderGrantState(activeProviderGrant), true);
  assert.equal(isProviderGrantState(partialProviderGrant), true);
  assert.deepEqual(
    evaluateConnectedSourceGrant(
      connectedSourceDefinition,
      activeProviderGrant,
      '2026-08-31T02:00:00.000Z',
    ).status,
    'accepted',
  );
  assert.deepEqual(
    evaluateConnectedSourceGrant(
      connectedSourceDefinition,
      partialProviderGrant,
      '2026-08-31T02:00:00.000Z',
    ),
    { status: 'rejected', reason: 'grant-not-active' },
  );
  assert.deepEqual(
    evaluateConnectedSourceGrant(
      connectedSourceDefinition,
      activeProviderGrant,
      '2026-08-31T00:59:59.999Z',
    ),
    { status: 'rejected', reason: 'grant-not-yet-valid' },
  );
  assert.equal(
    evaluateConnectedSourceGrant(
      connectedSourceDefinition,
      activeProviderGrant,
      activeProviderGrant.issuedAt,
    ).status,
    'accepted',
  );
  assert.deepEqual(
    evaluateConnectedSourceGrant(
      connectedSourceDefinition,
      activeProviderGrant,
      activeProviderGrant.expiresAt,
    ),
    { status: 'rejected', reason: 'grant-expired' },
  );
  assert.equal(
    connectedCapabilities.every((capability) => capability.endsWith('-read')),
    true,
  );
  assert.equal(
    connectedCapabilities.some((capability) =>
      /write|roster|grade|submission/.test(capability),
    ),
    false,
  );
  assert.deepEqual(automaticClassroomProviderNecessity.doesNotAuthorize, [
    'rosters',
    'submissions',
    'grades',
    'calendar-write',
    'chalkwright-login',
  ]);
});

test('connected admission rejects same-ID tenant collisions and missing grants', () => {
  for (const workspace of [sameIdDifferentOrganization, sameIdCrossKind]) {
    assert.deepEqual(
      evaluateConnectedSourceGrant(
        connectedSourceDefinition,
        { ...activeProviderGrant, workspace },
        '2026-08-31T02:00:00.000Z',
      ),
      { status: 'rejected', reason: 'workspace-mismatch' },
    );
  }
  assert.deepEqual(
    evaluateConnectedSourceGrant(
      connectedSourceDefinition,
      { ...activeProviderGrant, capabilities: ['calendar-events-read'] },
      '2026-08-31T02:00:00.000Z',
    ),
    { status: 'rejected', reason: 'capability-missing' },
  );
  assert.deepEqual(
    evaluateConnectedSourceGrant(
      connectedSourceDefinition,
      {
        ...activeProviderGrant,
        selectedResourceReferences: [
          scopeIdentifier('resource', 'provider-resource-synthetic-other'),
        ],
      },
      '2026-08-31T02:00:00.000Z',
    ),
    { status: 'rejected', reason: 'resource-not-selected' },
  );
});

test('consent transaction is short-lived, exact, and uses protected PKCE storage', () => {
  assert.equal(isProviderConsentTransaction(providerConsentTransaction), true);
  assert.equal(
    isProviderConsentTransaction({
      ...providerConsentTransaction,
      expiresAt: providerConsentTransaction.createdAt,
    }),
    false,
  );
  assert.equal(
    isProviderConsentTransaction({
      ...providerConsentTransaction,
      status: 'consumed',
      closedAt: '2026-08-31T01:35:00.000Z',
    }),
    true,
  );
  assert.equal(
    isProviderConsentTransaction({
      ...providerConsentTransaction,
      status: 'expired',
      closedAt: '2026-08-31T01:40:00.000Z',
    }),
    true,
  );
  assert.equal(
    isProviderConsentTransaction({
      ...providerConsentTransaction,
      status: 'consumed',
      closedAt: null,
    }),
    false,
  );
  assert.equal(
    isProviderConsentTransaction({
      ...providerConsentTransaction,
      pkceVerifier: 'plaintext-verifier-is-forbidden',
    }),
    false,
  );
  assert.equal(
    'referenceId' in providerConsentTransaction.pkceVerifierReference,
    true,
  );
});

test('source read requests are bounded, workspace-scoped, and mutation-free', () => {
  const request = {
    contractVersion,
    sourceContractVersion,
    workspace: hostedWorkspace,
    sourceDefinitionId: sharedSourceDefinition.sourceDefinitionId,
    purpose: 'preview',
    targets: [
      {
        kind: 'workspace',
        workspaceId: hostedWorkspace.workspaceId,
      },
    ],
    requestedAt: '2026-08-31T02:00:00.000Z',
  };
  assert.equal(isSourceReadRequest(request), true);
  assert.equal(isSourceReadRequest({ ...request, mutation: 'write' }), false);
  assert.equal(
    isSourceReadRequest({
      ...request,
      targets: [
        {
          kind: 'workspace',
          workspaceId: selfHostedWorkspace.workspaceId,
        },
      ],
    }),
    false,
  );
});

test('verified remote observation commits one current bounded projection', () => {
  assert.equal(isVerifiedSourceObservation(verifiedSharedObservation), true);
  assert.equal(isSourceRefreshAttempt(verifiedSharedAttempt), true);
  const result = applySourceObservation(
    null,
    sharedSourceDefinition,
    verifiedSharedAttempt,
  );
  assert.equal(result.status, 'committed');
  if (result.status !== 'committed') return;
  assert.equal(isCommittedSourceProjectionState(result.state), true);
  assert.equal(
    result.state.projectionId,
    verifiedSharedObservation.candidateProjectionId,
  );
  assert.equal(result.state.freshness.basis, 'bounded-refresh');
  assert.equal(result.state.freshness.status, 'current');
});

function committedSharedState(): CommittedSourceProjectionState {
  const result = applySourceObservation(
    null,
    sharedSourceDefinition,
    verifiedSharedAttempt,
  );
  assert.equal(result.status, 'committed');
  if (result.status !== 'committed')
    throw new Error('Synthetic commit failed.');
  return result.state;
}

function failedAttempt(attemptedAt: string) {
  return {
    contractVersion,
    sourceContractVersion,
    recordKind: 'source-refresh-attempt' as const,
    outcome: 'failed' as const,
    workspace: hostedWorkspace,
    sourceDefinitionId: sharedSourceDefinition.sourceDefinitionId,
    definitionRevision: sharedSourceDefinition.definitionRevision,
    stream: sharedSourceDefinition.stream,
    mode: sharedSourceDefinition.mode,
    format: sharedSourceDefinition.format,
    attemptedAt,
    diagnosticCode: 'refresh-failed' as const,
  };
}

test('failed refresh retains exact last-known-good projection and degrades then stales', () => {
  const previous = committedSharedState();
  const degraded = applySourceObservation(
    previous,
    sharedSourceDefinition,
    failedAttempt('2026-08-31T02:30:00.000Z'),
  );
  assert.equal(degraded.status, 'retained-last-known-good');
  if (degraded.status !== 'retained-last-known-good') return;
  assert.equal(degraded.state.projectionId, previous.projectionId);
  assert.equal(degraded.state.projectionDigest, previous.projectionDigest);
  assert.equal(degraded.state.observationId, previous.observationId);
  assert.equal(degraded.state.freshness.status, 'degraded');

  const stale = applySourceObservation(
    degraded.state,
    sharedSourceDefinition,
    failedAttempt('2026-08-31T03:00:01.000Z'),
  );
  assert.equal(stale.status, 'retained-last-known-good');
  if (stale.status === 'retained-last-known-good') {
    assert.equal(stale.state.freshness.status, 'stale');
    assert.equal(stale.state.projectionDigest, previous.projectionDigest);
  }
});

test('verified and failed attempts require strict chronology and preserve detached prior state', () => {
  const previous = committedSharedState();
  const older = clone(verifiedSharedAttempt);
  const olderObservation = {
    ...older.observation,
    acquisition: {
      kind: 'remote-fetch' as const,
      fetchedAt: '2026-08-31T01:58:59.000Z',
    },
    verifiedAt: '2026-08-31T01:59:00.000Z',
  };
  const olderAttempt = {
    ...older,
    attemptedAt: olderObservation.verifiedAt,
    observation: olderObservation,
    boundedRefreshWindow: {
      nextDueAt: '2026-08-31T02:14:00.000Z',
      expiresAt: '2026-08-31T02:59:00.000Z',
    },
  };
  assert.equal(isSourceRefreshAttempt(olderAttempt), true);
  const mutablePrevious = clone(previous) as unknown as Record<string, unknown>;
  const olderResult = applySourceObservation(
    mutablePrevious,
    sharedSourceDefinition,
    olderAttempt,
  );
  assert.equal(olderResult.status, 'rejected');
  if (olderResult.status !== 'rejected') return;
  assert.equal(olderResult.reason, 'out-of-order-attempt');
  const retainedDigest = olderResult.previousState?.projectionDigest;
  mutablePrevious.projectionDigest =
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  assert.equal(retainedDigest, previous.projectionDigest);
  assert.equal(olderResult.previousState?.projectionDigest, retainedDigest);

  const equalVerified = applySourceObservation(
    previous,
    sharedSourceDefinition,
    verifiedSharedAttempt,
  );
  assert.equal(equalVerified.status, 'rejected');
  if (equalVerified.status === 'rejected') {
    assert.equal(equalVerified.reason, 'out-of-order-attempt');
  }
  const equalFailure = applySourceObservation(
    previous,
    sharedSourceDefinition,
    failedAttempt(previous.lastAttempt.attemptedAt),
  );
  assert.equal(equalFailure.status, 'rejected');
  if (equalFailure.status === 'rejected') {
    assert.equal(equalFailure.reason, 'out-of-order-attempt');
  }
});

test('committed projections require coherent acquisition, commit, freshness, and attempt chronology', () => {
  const previous = committedSharedState();
  const invalidStates = [
    {
      ...previous,
      committedAt: '2026-08-31T01:59:59.000Z',
    },
    {
      ...previous,
      lastAttempt: {
        ...previous.lastAttempt,
        attemptedAt: '2026-08-31T01:59:59.000Z',
      },
    },
    {
      ...previous,
      freshness: {
        ...previous.freshness,
        lastSuccessAt: '2026-08-31T01:59:59.000Z',
      },
    },
    {
      ...previous,
      freshness: {
        ...previous.freshness,
        lastAttemptAt: '2026-08-31T02:00:02.000Z',
      },
    },
    {
      ...previous,
      lastAttempt: {
        status: 'failed',
        attemptedAt: previous.lastAttempt.attemptedAt,
        diagnosticCode: 'refresh-failed',
      },
    },
  ];
  for (const state of invalidStates) {
    assert.equal(isCommittedSourceProjectionState(state), false);
  }
});

test('failure without prior state is unavailable and cannot synthesize a projection', () => {
  assert.deepEqual(
    applySourceObservation(
      null,
      sharedSourceDefinition,
      failedAttempt('2026-08-31T02:30:00.000Z'),
    ),
    { status: 'unavailable', diagnosticCode: 'refresh-failed' },
  );
});

test('observation transitions reject workspace and definition mismatches without replacing prior', () => {
  const previous = committedSharedState();
  for (const workspace of [sameIdDifferentOrganization, sameIdCrossKind]) {
    const attempt = {
      ...failedAttempt('2026-08-31T02:30:00.000Z'),
      workspace,
    };
    const result = applySourceObservation(
      previous,
      sharedSourceDefinition,
      attempt,
    );
    assert.equal(result.status, 'rejected');
    if (result.status === 'rejected') {
      assert.equal(result.reason, 'workspace-mismatch');
      assert.equal(
        result.previousState?.projectionDigest,
        previous.projectionDigest,
      );
    }
  }
  assert.equal(
    applySourceObservation(previous, sharedSourceDefinition, {
      ...failedAttempt('2026-08-31T02:30:00.000Z'),
      definitionRevision: 99,
    }).status,
    'rejected',
  );
  const foreignPrevious = {
    ...previous,
    workspace: sameIdDifferentOrganization,
  };
  const replacement = applySourceObservation(
    foreignPrevious,
    sharedSourceDefinition,
    verifiedSharedAttempt,
  );
  assert.equal(replacement.status, 'rejected');
  if (replacement.status === 'rejected') {
    assert.equal(replacement.reason, 'workspace-mismatch');
    assert.equal(
      replacement.previousState?.projectionDigest,
      previous.projectionDigest,
    );
  }
});

test('accepted outputs are detached from post-validation input mutation', () => {
  const inspection = clone(validCsvInspection) as unknown as Record<
    string,
    unknown
  >;
  const upload = evaluateUploadInspection(uploadedSourceDefinition, inspection);
  assert.equal(upload.status, 'accepted');
  inspection.contentDigest =
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  if (upload.status === 'accepted') {
    assert.notEqual(upload.admission.contentDigest, inspection.contentDigest);
  }

  const preflight = clone(validSharedPreflight) as unknown as Record<
    string,
    unknown
  >;
  const shared = evaluateSharedResourcePreflight(
    sharedSourceDefinition,
    preflight,
  );
  assert.equal(shared.status, 'accepted');
  preflight.contentDigest =
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  if (shared.status === 'accepted') {
    assert.notEqual(shared.evidence.contentDigest, preflight.contentDigest);
  }

  const attempt = clone(verifiedSharedAttempt) as unknown as Record<
    string,
    unknown
  >;
  const committed = applySourceObservation(
    null,
    sharedSourceDefinition,
    attempt,
  );
  assert.equal(committed.status, 'committed');
  (attempt.observation as Record<string, unknown>).candidateProjectionDigest =
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  if (committed.status === 'committed') {
    assert.notEqual(
      committed.state.projectionDigest,
      (attempt.observation as Record<string, unknown>)
        .candidateProjectionDigest,
    );
  }
});

test('public source contracts contain no raw secret, filesystem, mutation, or deferred provider surface', () => {
  assert.deepEqual(deferredSourceBoundaries, [
    'rosters-deferred',
    'attendance-administration-deferred',
    'hosted-powerschool-browser-profile-excluded',
    'automatic-translation-deferred',
    'hosted-calendar-write-not-a-source-and-unapproved',
  ]);
  const files = [
    'src/contracts/v1/source-catalog.ts',
    'src/contracts/v1/source-acquisition.ts',
    'src/contracts/v1/source-observation.ts',
  ];
  const source = files.map((file) => readFileSync(file, 'utf8')).join('\n');
  for (const forbidden of [
    /accessToken\s*:/u,
    /refreshToken\s*:/u,
    /clientSecret\s*:/u,
    /filesystemPath\s*:/u,
    /roster-read'\s*,?\s*$/mu,
  ]) {
    assert.equal(forbidden.test(source), false, forbidden.source);
  }
  assert.doesNotThrow(() => JSON.stringify(sourceContractFixtureCatalog));
});
