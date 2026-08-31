import {
  canonicalJson,
  cloneJsonValue,
  hasExactKeys,
  hasUniqueValues,
  isDenseArray,
  isPlainObject,
  safelyValidate,
} from './state-contract-validation.js';
import { isWorkspace, type Workspace } from './workspace.js';

/** A08's versioned, adapter-free shared contract-suite format. */
export const sharedFixtureCatalogVersion = '1.0.0' as const;

export const sharedFixtureFamilies = [
  'installation',
  'scope',
  'configuration',
  'source',
  'course-schedule-vocabulary-media',
  'oauth',
  'preview',
  'cross-tenant',
] as const;
export type SharedFixtureFamily = (typeof sharedFixtureFamilies)[number];

export const sharedFixtureAudiences = ['display', 'student'] as const;
export type SharedFixtureAudience = (typeof sharedFixtureAudiences)[number];

export const releasedPrivacyClassifications = [
  'display-safe',
  'student-safe',
] as const;
export type ReleasedPrivacyClassification =
  (typeof releasedPrivacyClassifications)[number];

/** These categories must never be released by a display or student fixture. */
export const forbiddenProjectionFieldCategories = [
  'raw-provider',
  'account',
  'diagnostic',
  'internal-plan',
  'secret-like',
  'private-link',
  'restricted',
  'unclassified',
] as const;
export type ForbiddenProjectionFieldCategory =
  (typeof forbiddenProjectionFieldCategories)[number];
export type ProjectionFieldClassification =
  ReleasedPrivacyClassification | ForbiddenProjectionFieldCategory;

/** The complete v1 release allowlist; every other field fails closed. */
export const releasedProjectionFieldRegistry = [
  { name: 'screen-label', audience: 'display', classification: 'display-safe' },
  {
    name: 'active-revision-status',
    audience: 'display',
    classification: 'display-safe',
  },
  {
    name: 'source-freshness',
    audience: 'display',
    classification: 'display-safe',
  },
  { name: 'source-label', audience: 'display', classification: 'display-safe' },
  {
    name: 'projection-freshness',
    audience: 'display',
    classification: 'display-safe',
  },
  { name: 'course-label', audience: 'student', classification: 'student-safe' },
  {
    name: 'schedule-label',
    audience: 'student',
    classification: 'student-safe',
  },
  {
    name: 'vocabulary-term',
    audience: 'student',
    classification: 'student-safe',
  },
  {
    name: 'media-alt-text',
    audience: 'student',
    classification: 'student-safe',
  },
] as const;

export type SharedFixtureDisposition = 'allowed' | 'denied';
export type SharedFixtureEffect = 'fixture-only-no-effect' | 'denied-no-effect';

export interface SharedFixtureExpectation {
  readonly disposition: SharedFixtureDisposition;
  readonly effect: SharedFixtureEffect;
  readonly reasonCode: string;
  readonly threatIds: readonly string[];
}

/**
 * JSON-only test input. Its format belongs to the scenario family rather than
 * a runtime adapter, so future contract consumers can evaluate it directly.
 */
export interface SharedFixtureScenario {
  readonly fixtureId: string;
  readonly family: SharedFixtureFamily;
  readonly workspace: Workspace;
  readonly input: Record<string, unknown>;
}

export interface SharedSyntheticFixtureCase extends SharedFixtureScenario {
  readonly expected: SharedFixtureExpectation;
}

/** A scalar-only allowlisted field prevents nested raw provider objects. */
export interface ReleasedProjectionField {
  readonly name: string;
  readonly classification: ProjectionFieldClassification;
  readonly value: string | boolean | number | null;
}

/** Every released display or student field is declared in this exact shape. */
export interface AudienceSafeProjection {
  readonly fixtureId: string;
  readonly audience: SharedFixtureAudience;
  readonly fields: readonly ReleasedProjectionField[];
}

export interface SharedFixtureCatalog {
  readonly catalogVersion: typeof sharedFixtureCatalogVersion;
  readonly cases: readonly SharedSyntheticFixtureCase[];
  readonly projections: readonly AudienceSafeProjection[];
}

/**
 * The only seam required by a future implementation. It receives a detached
 * fixture and returns a detached decision; it has no route, provider, storage,
 * authentication, or mutation dependency.
 */
export interface SharedFixtureSuiteConsumer {
  evaluate(scenario: SharedFixtureScenario): SharedFixtureExpectation;
}

export interface SharedFixtureSuiteResult {
  readonly fixtureId: string;
  readonly passed: boolean;
}

export interface SharedFixtureSuiteReport {
  readonly catalogVersion: typeof sharedFixtureCatalogVersion;
  readonly passed: boolean;
  readonly results: readonly SharedFixtureSuiteResult[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 160;
}

function isEffectForDisposition(
  disposition: SharedFixtureDisposition,
  effect: unknown,
): effect is SharedFixtureEffect {
  return (
    (disposition === 'allowed' && effect === 'fixture-only-no-effect') ||
    (disposition === 'denied' && effect === 'denied-no-effect')
  );
}

export function isSharedFixtureExpectation(
  value: unknown,
): value is SharedFixtureExpectation {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, [
        'disposition',
        'effect',
        'reasonCode',
        'threatIds',
      ]) ||
      (value.disposition !== 'allowed' && value.disposition !== 'denied') ||
      !isEffectForDisposition(value.disposition, value.effect) ||
      !isNonEmptyString(value.reasonCode) ||
      !isDenseArray(value.threatIds) ||
      value.threatIds.length === 0 ||
      !value.threatIds.every(isNonEmptyString) ||
      !hasUniqueValues(value.threatIds)
    ) {
      return false;
    }
    return true;
  });
}

export function isSharedSyntheticFixtureCase(
  value: unknown,
): value is SharedSyntheticFixtureCase {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, [
        'fixtureId',
        'family',
        'workspace',
        'input',
        'expected',
      ]) ||
      !isNonEmptyString(value.fixtureId) ||
      !sharedFixtureFamilies.includes(value.family as SharedFixtureFamily) ||
      !isWorkspace(value.workspace) ||
      !isPlainObject(value.input) ||
      !isSharedFixtureExpectation(value.expected)
    ) {
      return false;
    }
    canonicalJson(value.input);
    return true;
  });
}

export function isReleasedProjectionFieldRegistry(value: unknown): boolean {
  return safelyValidate(() => {
    if (!isDenseArray(value) || value.length === 0) return false;
    const names: string[] = [];
    for (const entry of value) {
      if (
        !isPlainObject(entry) ||
        !hasExactKeys(entry, ['name', 'audience', 'classification']) ||
        !isNonEmptyString(entry.name) ||
        !sharedFixtureAudiences.includes(
          entry.audience as SharedFixtureAudience,
        ) ||
        !releasedPrivacyClassifications.includes(
          entry.classification as ReleasedPrivacyClassification,
        ) ||
        (entry.audience === 'display' &&
          entry.classification !== 'display-safe') ||
        (entry.audience === 'student' &&
          entry.classification !== 'student-safe')
      ) {
        return false;
      }
      names.push(entry.name);
    }
    return (
      hasUniqueValues(names) &&
      value.length === releasedProjectionFieldRegistry.length &&
      releasedProjectionFieldRegistry.every((expected) =>
        value.some(
          (entry) =>
            isPlainObject(entry) &&
            entry.name === expected.name &&
            entry.audience === expected.audience &&
            entry.classification === expected.classification,
        ),
      )
    );
  });
}

export function isAudienceSafeProjection(
  value: unknown,
): value is AudienceSafeProjection {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, ['fixtureId', 'audience', 'fields']) ||
      !isNonEmptyString(value.fixtureId) ||
      !sharedFixtureAudiences.includes(
        value.audience as SharedFixtureAudience,
      ) ||
      !isDenseArray(value.fields) ||
      value.fields.length === 0
    ) {
      return false;
    }
    const names: string[] = [];
    for (const field of value.fields) {
      if (
        !isPlainObject(field) ||
        !hasExactKeys(field, ['name', 'classification', 'value']) ||
        !isNonEmptyString(field.name) ||
        !isReleasedProjectionFieldRegistry(releasedProjectionFieldRegistry) ||
        !(
          field.value === null ||
          typeof field.value === 'string' ||
          typeof field.value === 'boolean' ||
          (typeof field.value === 'number' && Number.isFinite(field.value))
        )
      ) {
        return false;
      }
      const registryEntry = releasedProjectionFieldRegistry.find(
        (entry) => entry.name === field.name,
      );
      if (
        registryEntry === undefined ||
        registryEntry.audience !== value.audience ||
        registryEntry.classification !== field.classification
      ) {
        return false;
      }
      names.push(field.name);
    }
    return hasUniqueValues(names);
  });
}

/** Validates the catalog before any consumer sees a fixture or projection. */
export function isSharedFixtureCatalog(
  value: unknown,
): value is SharedFixtureCatalog {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, ['catalogVersion', 'cases', 'projections']) ||
      value.catalogVersion !== sharedFixtureCatalogVersion ||
      !isDenseArray(value.cases) ||
      !isDenseArray(value.projections) ||
      !value.cases.every(isSharedSyntheticFixtureCase) ||
      !value.projections.every(isAudienceSafeProjection)
    ) {
      return false;
    }
    const fixtureIds = value.cases.map((fixture) => fixture.fixtureId);
    if (!hasUniqueValues(fixtureIds)) return false;
    for (const family of sharedFixtureFamilies) {
      const familyCases = value.cases.filter(
        (fixture) => fixture.family === family,
      );
      if (
        !familyCases.some(
          (fixture) => fixture.expected.disposition === 'allowed',
        ) ||
        !familyCases.some(
          (fixture) => fixture.expected.disposition === 'denied',
        )
      ) {
        return false;
      }
    }
    const projectionKeys = value.projections.map(
      (projection) => `${projection.fixtureId}:${projection.audience}`,
    );
    const releasedFieldNames = value.projections.flatMap((projection) =>
      projection.fields.map((field) => field.name),
    );
    return (
      hasUniqueValues(projectionKeys) &&
      value.projections.every((projection) =>
        fixtureIds.includes(projection.fixtureId),
      ) &&
      hasUniqueValues(releasedFieldNames) &&
      releasedFieldNames.length === releasedProjectionFieldRegistry.length &&
      releasedProjectionFieldRegistry.every((entry) =>
        releasedFieldNames.includes(entry.name),
      )
    );
  });
}

function sameExpectation(
  left: SharedFixtureExpectation,
  right: SharedFixtureExpectation,
): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

/**
 * Runs only detached, pure data. Invalid catalogs or consumer responses fail
 * closed in the report and cannot make a fixture look accepted.
 */
export function runSharedFixtureContractSuite(
  catalog: SharedFixtureCatalog,
  consumer: SharedFixtureSuiteConsumer,
): SharedFixtureSuiteReport {
  if (!isSharedFixtureCatalog(catalog)) {
    return {
      catalogVersion: sharedFixtureCatalogVersion,
      passed: false,
      results: [],
    };
  }
  const results = catalog.cases.map((fixture) => {
    try {
      const detachedScenario = cloneJsonValue({
        fixtureId: fixture.fixtureId,
        family: fixture.family,
        workspace: fixture.workspace,
        input: fixture.input,
      });
      const actual = consumer.evaluate(detachedScenario);
      return {
        fixtureId: fixture.fixtureId,
        passed:
          isSharedFixtureExpectation(actual) &&
          sameExpectation(actual, fixture.expected),
      };
    } catch {
      return { fixtureId: fixture.fixtureId, passed: false };
    }
  });
  return {
    catalogVersion: sharedFixtureCatalogVersion,
    passed: results.every((result) => result.passed),
    results,
  };
}
