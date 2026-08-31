import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  forbiddenProjectionFieldCategories,
  isAudienceSafeProjection,
  isReleasedProjectionFieldRegistry,
  isSharedFixtureCatalog,
  releasedProjectionFieldRegistry,
  runSharedFixtureContractSuite,
  sharedFixtureCatalogVersion,
  sharedFixtureFamilies,
  type SharedFixtureCatalog,
} from '../../../src/contracts/v1/index.js';
import { sharedSyntheticFixtureCatalog } from '../../fixtures/shared-fixture-suite.js';

function clone<Value>(value: Value): Value {
  return structuredClone(value);
}

function catalogByteDigest(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

test('A08 catalog is versioned, byte-stable, JSON-safe, and covers every family positively and negatively', () => {
  assert.equal(isSharedFixtureCatalog(sharedSyntheticFixtureCatalog), true);
  assert.equal(
    sharedSyntheticFixtureCatalog.catalogVersion,
    sharedFixtureCatalogVersion,
  );
  assert.equal(
    catalogByteDigest(sharedSyntheticFixtureCatalog),
    'sha256:bfccad9fc2f4434fdae5e08f0fe99694577843591edf2513bd248f18d7dd3a25',
  );
  for (const family of sharedFixtureFamilies) {
    const dispositions = sharedSyntheticFixtureCatalog.cases
      .filter((fixture) => fixture.family === family)
      .map((fixture) => fixture.expected.disposition)
      .sort();
    assert.equal(dispositions.includes('allowed'), true, `${family}:allowed`);
    assert.equal(dispositions.includes('denied'), true, `${family}:denied`);
  }
  assert.match(
    JSON.stringify(sharedSyntheticFixtureCatalog),
    /example\.invalid/u,
  );
  assert.doesNotMatch(
    JSON.stringify(sharedSyntheticFixtureCatalog).toLowerCase(),
    /\/home\/|password|access[_-]?token|client[_-]?secret/u,
  );
});

test('catalog covers required adversarial threats and mutation-free expectations', () => {
  const threatIds = new Set(
    sharedSyntheticFixtureCatalog.cases.flatMap(
      (fixture) => fixture.expected.threatIds,
    ),
  );
  for (const threatId of [
    'NT-03',
    'NT-04',
    'NT-09',
    'NT-10',
    'NT-11',
    'NT-14',
    'NT-18',
  ]) {
    assert.equal(threatIds.has(threatId), true, threatId);
  }
  assert.equal(
    sharedSyntheticFixtureCatalog.cases
      .filter((fixture) => fixture.family === 'preview')
      .every(
        (fixture) =>
          fixture.expected.effect === 'fixture-only-no-effect' ||
          fixture.expected.effect === 'denied-no-effect',
      ),
    true,
  );
});

test('independent A08 probes cover every required scope, lifecycle, OAuth, preview, and privacy denial', () => {
  const fixtureIds = new Set(
    sharedSyntheticFixtureCatalog.cases.map((fixture) => fixture.fixtureId),
  );
  for (const fixtureId of [
    'scope-wrong-actor-denied',
    'scope-wrong-workspace-denied',
    'scope-wrong-room-denied',
    'scope-wrong-screen-denied',
    'scope-wrong-resource-denied',
    'source-wrong-provider-grant-denied',
    'oauth-wrong-transaction-denied',
    'oauth-replayed-transaction-denied',
    'oauth-expired-transaction-denied',
    'preview-wrong-scope-denied',
    'preview-replayed-denied',
    'preview-stale-denied',
    'preview-mutation-attempt-denied',
    'cross-tenant-malformed-input-denied',
    'cross-tenant-unsafe-privacy-field-denied',
    'configuration-conflict-denied',
    'configuration-foreign-rollback-denied',
    'configuration-cross-workspace-export-denied',
    'configuration-cross-workspace-import-denied',
    'configuration-cross-workspace-backup-denied',
    'configuration-cross-workspace-restore-denied',
  ]) {
    assert.equal(fixtureIds.has(fixtureId), true, fixtureId);
  }
  assert.equal(
    fixtureIds.has('installation-hosted-organization-accepted'),
    true,
  );
  const acceptedSource = sharedSyntheticFixtureCatalog.cases.find(
    (fixture) =>
      fixture.fixtureId === 'source-modes-projections-freshness-accepted',
  )!;
  assert.deepEqual(Object.keys(acceptedSource.input).sort(), [
    'connectedDefinition',
    'managedDefinition',
    'sharedDefinition',
    'uploadedDefinition',
    'verifiedObservation',
    'verifiedPreflight',
  ]);
});

test('privacy projections enumerate released fields and fail closed for forbidden, unclassified, raw, and nested values', () => {
  const projectionKeys = sharedSyntheticFixtureCatalog.projections.map(
    (projection) => `${projection.fixtureId}:${projection.audience}`,
  );
  assert.equal(new Set(projectionKeys).size, projectionKeys.length);
  for (const projection of sharedSyntheticFixtureCatalog.projections) {
    assert.equal(
      isAudienceSafeProjection(projection),
      true,
      projection.fixtureId,
    );
    assert.equal(
      new Set(projection.fields.map((field) => field.name)).size,
      projection.fields.length,
    );
  }
  for (const forbiddenCategory of forbiddenProjectionFieldCategories) {
    const unsafe = clone(
      sharedSyntheticFixtureCatalog.projections[0],
    ) as unknown as {
      fields: Array<Record<string, unknown>>;
    };
    unsafe.fields[0]!.classification = forbiddenCategory;
    assert.equal(isAudienceSafeProjection(unsafe), false, forbiddenCategory);
  }

  const unclassified = clone(
    sharedSyntheticFixtureCatalog.projections[0],
  ) as unknown as {
    fields: Array<Record<string, unknown>>;
  };
  unclassified.fields[0]!.classification = 'unclassified';
  assert.equal(isAudienceSafeProjection(unclassified), false);

  const unknownName = clone(
    sharedSyntheticFixtureCatalog.projections[0],
  ) as unknown as { fields: Array<Record<string, unknown>> };
  unknownName.fields[0]!.name = 'arbitrary-new-field';
  assert.equal(isAudienceSafeProjection(unknownName), false);

  const misclassified = clone(
    sharedSyntheticFixtureCatalog.projections[0],
  ) as unknown as { fields: Array<Record<string, unknown>> };
  misclassified.fields[0]!.classification = 'student-safe';
  assert.equal(isAudienceSafeProjection(misclassified), false);

  const nestedValue = clone(
    sharedSyntheticFixtureCatalog.projections[0],
  ) as unknown as {
    fields: Array<Record<string, unknown>>;
  };
  nestedValue.fields[0]!.value = { rawProvider: 'blocked' };
  assert.equal(isAudienceSafeProjection(nestedValue), false);

  assert.equal(
    isReleasedProjectionFieldRegistry(releasedProjectionFieldRegistry),
    true,
  );
  const duplicateRegistry = clone(
    releasedProjectionFieldRegistry,
  ) as unknown as Array<Record<string, unknown>>;
  duplicateRegistry.push({ ...duplicateRegistry[0] });
  assert.equal(isReleasedProjectionFieldRegistry(duplicateRegistry), false);
  const omittedRegistry = clone(releasedProjectionFieldRegistry).slice(1);
  assert.equal(isReleasedProjectionFieldRegistry(omittedRegistry), false);
});

test('catalog and consumer seam reject malformed objects, missing coverage, and wrong results without adapters', () => {
  const malformed = clone(sharedSyntheticFixtureCatalog) as unknown as {
    cases: Array<Record<string, unknown>>;
  };
  malformed.cases[0]!.input = Object.create({ inherited: 'blocked' });
  assert.equal(isSharedFixtureCatalog(malformed), false);

  const incomplete = clone(sharedSyntheticFixtureCatalog) as unknown as {
    cases: Array<SharedFixtureCatalog['cases'][number]>;
  };
  incomplete.cases = incomplete.cases.filter(
    (fixture) =>
      fixture.family !== 'oauth' || fixture.expected.disposition !== 'denied',
  );
  assert.equal(isSharedFixtureCatalog(incomplete), false);

  const missingReleasedField = clone(
    sharedSyntheticFixtureCatalog,
  ) as unknown as {
    projections: Array<{ fields: Array<Record<string, unknown>> }>;
  };
  missingReleasedField.projections[0]!.fields.shift();
  assert.equal(isSharedFixtureCatalog(missingReleasedField), false);

  const expectedByFixtureId = new Map(
    sharedSyntheticFixtureCatalog.cases.map((fixture) => [
      fixture.fixtureId,
      fixture.expected,
    ]),
  );
  const catalogBeforeMutationProbe = JSON.stringify(
    sharedSyntheticFixtureCatalog,
  );
  const passing = runSharedFixtureContractSuite(sharedSyntheticFixtureCatalog, {
    evaluate: (scenario) => {
      assert.equal(Object.hasOwn(scenario, 'expected'), false);
      scenario.input.consumerMutation = 'detached';
      return expectedByFixtureId.get(scenario.fixtureId)!;
    },
  });
  assert.equal(passing.passed, true);
  assert.equal(
    passing.results.length,
    sharedSyntheticFixtureCatalog.cases.length,
  );
  assert.equal(
    JSON.stringify(sharedSyntheticFixtureCatalog),
    catalogBeforeMutationProbe,
  );

  const failing = runSharedFixtureContractSuite(sharedSyntheticFixtureCatalog, {
    evaluate: () => ({
      disposition: 'denied' as const,
      effect: 'denied-no-effect' as const,
      reasonCode: 'wrong-result',
      threatIds: ['NT-10'],
    }),
  });
  assert.equal(failing.passed, false);
  assert.equal(
    failing.results.every((result) => !result.passed),
    true,
  );
});
