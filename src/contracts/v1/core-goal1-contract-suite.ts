import {
  isClassCodeState,
  isConfigurationPreviewSnapshot,
  isPortableConfigurationExport,
  isProtectedBackupManifest,
  type ClassCodeState,
  type ConfigurationPreviewSnapshot,
  type PortableConfigurationExport,
  type ProtectedBackupManifest,
} from './configuration-persistence.js';
import {
  configurationDigest,
  isConfigurationStateSnapshot,
  isExactWorkspace,
  type ConfigurationStateSnapshot,
} from './configuration-state.js';
import {
  contractVersion,
  type ContractEnvelope,
  type IsoDate,
} from './common.js';
import {
  canonicalJson,
  cloneJsonValue,
  hasExactKeys,
  hasUniqueValues,
  isBoundedString,
  isDenseArray,
  isIsoDate,
  isIsoInstant,
  isPlainObject,
  isPositiveInteger,
  isScopeIdentifier,
  isSha256Digest,
  safelyValidate,
} from './state-contract-validation.js';
import {
  isWorkspace,
  type ResourceId,
  type RoomId,
  type ScreenId,
  type SelfHostedWorkspace,
} from './workspace.js';

export const coreGoal1FixtureContractVersion = '1.0.0' as const;

export const coreGoal1AcceptanceTasks = [
  'C01',
  'C02',
  'C03',
  'C04',
  'C09',
  'C10',
] as const;
export type CoreGoal1AcceptanceTask = (typeof coreGoal1AcceptanceTasks)[number];

export interface CoreGoal1RoomFixture {
  readonly roomId: RoomId;
  readonly label: string;
}

export interface CoreGoal1ScreenFixture {
  readonly screenId: ScreenId;
  readonly roomId: RoomId;
  readonly label: string;
  readonly classCodeState: ClassCodeState;
}

export interface CoreGoal1CourseFixture {
  readonly courseId: ResourceId;
  readonly roomId: RoomId;
  readonly code: string;
  readonly label: string;
}

export interface CoreGoal1ScheduleMeetingFixture {
  readonly meetingId: ResourceId;
  readonly courseId: ResourceId;
  readonly screenId: ScreenId;
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface CoreGoal1ManualScheduleFixture {
  readonly schoolDate: IsoDate;
  readonly timeZone: string;
  readonly meetings: readonly CoreGoal1ScheduleMeetingFixture[];
}

export interface CoreGoal1VocabularyFixture {
  readonly vocabularyId: ResourceId;
  readonly courseId: ResourceId;
  readonly term: string;
  readonly pronunciation: string;
  readonly translations: Readonly<Record<'es' | 'vi', string>>;
}

export interface CoreGoal1MediaFixture {
  readonly mediaId: ResourceId;
  readonly courseId: ResourceId;
  readonly format: 'raster-png-v1';
  readonly alternateText: string;
  readonly byteLength: number;
  readonly contentDigest: `sha256:${string}`;
}

export interface CoreGoal1PlannedFrameFixture {
  readonly frameId: ResourceId;
  readonly schoolDate: IsoDate;
  readonly screenId: ScreenId;
  readonly courseId: ResourceId;
  readonly sequence: number;
  readonly state: 'coming-up' | 'in-class' | 'transition' | 'day-complete';
  readonly mediaIds: readonly ResourceId[];
}

export interface CoreGoal1PrivacyRules {
  readonly dataClassification: 'synthetic-only';
  readonly workspaceKinds: readonly ['self-hosted-installation'];
  readonly sourceModes: readonly ['application-managed'];
  readonly identifierMarker: 'synthetic';
  readonly allowedUrlHostSuffix: '.invalid';
  readonly forbiddenKeys: readonly string[];
  readonly portableExportForbiddenKeys: readonly string[];
  readonly forbidEmailAddresses: true;
  readonly forbidProviderEnrollment: true;
  readonly forbidHostedAuthority: true;
}

export const coreGoal1PrivacyRules: CoreGoal1PrivacyRules = {
  dataClassification: 'synthetic-only',
  workspaceKinds: ['self-hosted-installation'],
  sourceModes: ['application-managed'],
  identifierMarker: 'synthetic',
  allowedUrlHostSuffix: '.invalid',
  forbiddenKeys: [
    'accessToken',
    'accountId',
    'billingCustomerId',
    'classCode',
    'cookie',
    'oauthCode',
    'organizationId',
    'password',
    'refreshToken',
    'sessionId',
  ],
  portableExportForbiddenKeys: [
    'accessToken',
    'classCode',
    'connectionReference',
    'cookie',
    'password',
    'refreshToken',
    'verifierReference',
  ],
  forbidEmailAddresses: true,
  forbidProviderEnrollment: true,
  forbidHostedAuthority: true,
};

export interface CoreGoal1ExpectedScenario extends ContractEnvelope {
  readonly fixtureContractVersion: typeof coreGoal1FixtureContractVersion;
  readonly scenarioId: string;
  readonly operation: string;
  readonly requiredBy: readonly CoreGoal1AcceptanceTask[];
  readonly input: unknown;
  readonly expected: unknown;
}

export interface CoreGoal1FixtureCatalog extends ContractEnvelope {
  readonly fixtureContractVersion: typeof coreGoal1FixtureContractVersion;
  readonly recordKind: 'core-goal1-fixture-catalog';
  readonly workspace: SelfHostedWorkspace;
  readonly rooms: readonly CoreGoal1RoomFixture[];
  readonly screens: readonly CoreGoal1ScreenFixture[];
  readonly courses: readonly CoreGoal1CourseFixture[];
  readonly manualSchedule: CoreGoal1ManualScheduleFixture;
  readonly vocabulary: readonly CoreGoal1VocabularyFixture[];
  readonly media: readonly CoreGoal1MediaFixture[];
  readonly configurationStates: {
    readonly fresh: ConfigurationStateSnapshot;
    readonly firstActivated: ConfigurationStateSnapshot;
    readonly secondActivated: ConfigurationStateSnapshot;
    readonly rolledBack: ConfigurationStateSnapshot;
  };
  readonly preview: ConfigurationPreviewSnapshot;
  readonly portableExport: PortableConfigurationExport;
  readonly recoveryBackup: ProtectedBackupManifest;
  readonly plannedFrames: readonly CoreGoal1PlannedFrameFixture[];
  readonly expectedScenarios: readonly CoreGoal1ExpectedScenario[];
  readonly privacyRules: CoreGoal1PrivacyRules;
}

export interface CoreGoal1ScenarioObservation {
  readonly scenarioId: string;
  readonly actual: unknown;
}

export interface CoreGoal1ScenarioResult {
  readonly scenarioId: string;
  readonly status: 'passed' | 'failed';
  readonly diagnostics: readonly string[];
}

export interface CoreGoal1ContractSuiteReport {
  readonly fixtureContractVersion: typeof coreGoal1FixtureContractVersion;
  readonly status: 'passed' | 'failed';
  readonly results: readonly CoreGoal1ScenarioResult[];
}

export type CoreGoal1ScenarioExecutor = (
  scenario: CoreGoal1ExpectedScenario,
  catalog: CoreGoal1FixtureCatalog,
) => CoreGoal1ScenarioObservation | Promise<CoreGoal1ScenarioObservation>;

const fixtureKeys = [
  'contractVersion',
  'fixtureContractVersion',
  'recordKind',
  'workspace',
  'rooms',
  'screens',
  'courses',
  'manualSchedule',
  'vocabulary',
  'media',
  'configurationStates',
  'preview',
  'portableExport',
  'recoveryBackup',
  'plannedFrames',
  'expectedScenarios',
  'privacyRules',
] as const;

function identifierIsSynthetic(value: unknown): boolean {
  return typeof value === 'string' && value.includes('-synthetic-');
}

function isClassCodeStateForWorkspace(
  value: unknown,
  workspace: SelfHostedWorkspace,
  screenId: ScreenId,
): value is ClassCodeState {
  return (
    isClassCodeState(value) &&
    value.workspaceId === workspace.workspaceId &&
    value.screenId === screenId
  );
}

function isExpectedScenario(
  value: unknown,
): value is CoreGoal1ExpectedScenario {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'contractVersion',
      'fixtureContractVersion',
      'scenarioId',
      'operation',
      'requiredBy',
      'input',
      'expected',
    ]) &&
    value.contractVersion === contractVersion &&
    value.fixtureContractVersion === coreGoal1FixtureContractVersion &&
    isBoundedString(value.scenarioId, 128) &&
    /^core-goal1-[a-z0-9-]+$/u.test(value.scenarioId) &&
    isBoundedString(value.operation, 128) &&
    isDenseArray(value.requiredBy) &&
    value.requiredBy.length > 0 &&
    value.requiredBy.every((task) =>
      coreGoal1AcceptanceTasks.includes(task as CoreGoal1AcceptanceTask),
    ) &&
    hasUniqueValues(value.requiredBy as readonly string[]) &&
    safelyValidate(() => {
      canonicalJson(value.input);
      canonicalJson(value.expected);
      return true;
    })
  );
}

function collectPrivacyViolations(
  value: unknown,
  rules: CoreGoal1PrivacyRules,
  portableOnly = false,
): string[] {
  const violations: string[] = [];
  const visited = new WeakSet<object>();
  const forbidden = new Set(
    (portableOnly
      ? rules.portableExportForbiddenKeys
      : rules.forbiddenKeys
    ).map((key) => key.toLowerCase()),
  );
  const visit = (entry: unknown, path: string): void => {
    if (typeof entry === 'string') {
      if (
        rules.forbidEmailAddresses &&
        /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u.test(entry)
      ) {
        violations.push(`${path}:email-address`);
      }
      for (const match of entry.matchAll(/https?:\/\/([^/\s]+)/giu)) {
        const host = match[1]?.split(':')[0]?.toLowerCase() ?? '';
        if (!host.endsWith(rules.allowedUrlHostSuffix)) {
          violations.push(`${path}:non-reserved-url-host`);
        }
      }
      return;
    }
    if (entry === null || typeof entry !== 'object') return;
    if (visited.has(entry)) return;
    visited.add(entry);
    if (Array.isArray(entry)) {
      entry.forEach((child, index) => visit(child, `${path}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(entry)) {
      const normalizedKey = key.toLowerCase();
      if (forbidden.has(normalizedKey)) {
        violations.push(`${path}.${key}:forbidden-key`);
      }
      if (
        (rules.forbidHostedAuthority || rules.forbidProviderEnrollment) &&
        [
          'accountrequired',
          'authenticationrequired',
          'billingrequired',
          'commercialframeworkrequired',
          'oauthrequired',
          'providerenrollmentrequired',
        ].includes(normalizedKey) &&
        child === true
      ) {
        violations.push(`${path}.${key}:deferred-authority-required`);
      }
      if (
        (normalizedKey === 'sourcemode' || normalizedKey === 'mode') &&
        child === 'connected-account'
      ) {
        violations.push(`${path}.${key}:connected-account-mode`);
      }
      if (
        (normalizedKey === 'authority' || normalizedKey === 'workspacekind') &&
        (child === 'hosted-account' || child === 'hosted-organization')
      ) {
        violations.push(`${path}.${key}:hosted-authority`);
      }
      visit(child, `${path}.${key}`);
    }
  };
  visit(value, '$');
  return violations;
}

function exactWorkspaceArtifacts(value: CoreGoal1FixtureCatalog): boolean {
  const states = Object.values(value.configurationStates);
  return (
    states.every(
      (state) =>
        isConfigurationStateSnapshot(state) &&
        isExactWorkspace(state.workspace, value.workspace),
    ) &&
    isConfigurationPreviewSnapshot(value.preview) &&
    isExactWorkspace(value.preview.workspace, value.workspace) &&
    isPortableConfigurationExport(value.portableExport) &&
    isExactWorkspace(
      value.portableExport.manifest.workspace,
      value.workspace,
    ) &&
    isProtectedBackupManifest(value.recoveryBackup) &&
    isExactWorkspace(value.recoveryBackup.workspace, value.workspace)
  );
}

/**
 * Validates the deliberately narrow A08 catalog. It accepts one self-hosted
 * workspace only and rejects commercial or connected-account scope.
 */
export function isCoreGoal1FixtureCatalog(
  value: unknown,
): value is CoreGoal1FixtureCatalog {
  return safelyValidate(() => {
    if (
      !isPlainObject(value) ||
      !hasExactKeys(value, fixtureKeys) ||
      value.contractVersion !== contractVersion ||
      value.fixtureContractVersion !== coreGoal1FixtureContractVersion ||
      value.recordKind !== 'core-goal1-fixture-catalog' ||
      !isWorkspace(value.workspace) ||
      value.workspace.kind !== 'self-hosted-installation' ||
      !identifierIsSynthetic(value.workspace.workspaceId) ||
      !identifierIsSynthetic(value.workspace.installationId) ||
      !isDenseArray(value.rooms) ||
      value.rooms.length < 2 ||
      !isDenseArray(value.screens) ||
      value.screens.length < 2 ||
      !isDenseArray(value.courses) ||
      value.courses.length < 2 ||
      !isDenseArray(value.vocabulary) ||
      value.vocabulary.length < 2 ||
      !isDenseArray(value.media) ||
      value.media.length < 2 ||
      !isDenseArray(value.plannedFrames) ||
      value.plannedFrames.length < 4 ||
      !isDenseArray(value.expectedScenarios) ||
      value.expectedScenarios.length < coreGoal1AcceptanceTasks.length ||
      !isPlainObject(value.privacyRules) ||
      !isPlainObject(value.configurationStates) ||
      !hasExactKeys(value.configurationStates, [
        'fresh',
        'firstActivated',
        'secondActivated',
        'rolledBack',
      ]) ||
      !isPlainObject(value.manualSchedule) ||
      !hasExactKeys(value.manualSchedule, [
        'schoolDate',
        'timeZone',
        'meetings',
      ])
    ) {
      return false;
    }
    const catalog = value as unknown as CoreGoal1FixtureCatalog;
    const roomIds = catalog.rooms.map((room) => room.roomId);
    const screenIds = catalog.screens.map((screen) => screen.screenId);
    const courseIds = catalog.courses.map((course) => course.courseId);
    const mediaIds = catalog.media.map((asset) => asset.mediaId);
    if (
      !hasUniqueValues(roomIds) ||
      !hasUniqueValues(screenIds) ||
      !hasUniqueValues(courseIds) ||
      !hasUniqueValues(mediaIds) ||
      !catalog.rooms.every(
        (room) =>
          isPlainObject(room) &&
          hasExactKeys(room, ['roomId', 'label']) &&
          isScopeIdentifier('room', room.roomId) &&
          identifierIsSynthetic(room.roomId) &&
          isBoundedString(room.label, 128),
      ) ||
      !catalog.screens.every(
        (screen) =>
          isPlainObject(screen) &&
          hasExactKeys(screen, [
            'screenId',
            'roomId',
            'label',
            'classCodeState',
          ]) &&
          isScopeIdentifier('screen', screen.screenId) &&
          identifierIsSynthetic(screen.screenId) &&
          roomIds.includes(screen.roomId) &&
          isBoundedString(screen.label, 128) &&
          isClassCodeStateForWorkspace(
            screen.classCodeState,
            catalog.workspace,
            screen.screenId,
          ),
      ) ||
      !catalog.courses.every(
        (course) =>
          isPlainObject(course) &&
          hasExactKeys(course, ['courseId', 'roomId', 'code', 'label']) &&
          isScopeIdentifier('resource', course.courseId) &&
          identifierIsSynthetic(course.courseId) &&
          roomIds.includes(course.roomId) &&
          isBoundedString(course.code, 32) &&
          isBoundedString(course.label, 128),
      )
    ) {
      return false;
    }
    if (
      !isIsoDate(catalog.manualSchedule.schoolDate) ||
      !isBoundedString(catalog.manualSchedule.timeZone, 128) ||
      !isDenseArray(catalog.manualSchedule.meetings) ||
      catalog.manualSchedule.meetings.length < 2 ||
      !catalog.manualSchedule.meetings.every(
        (meeting) =>
          isPlainObject(meeting) &&
          hasExactKeys(meeting, [
            'meetingId',
            'courseId',
            'screenId',
            'startsAt',
            'endsAt',
          ]) &&
          isScopeIdentifier('resource', meeting.meetingId) &&
          identifierIsSynthetic(meeting.meetingId) &&
          courseIds.includes(meeting.courseId) &&
          screenIds.includes(meeting.screenId) &&
          isIsoInstant(meeting.startsAt) &&
          isIsoInstant(meeting.endsAt) &&
          meeting.startsAt < meeting.endsAt,
      )
    ) {
      return false;
    }
    if (
      !catalog.vocabulary.every(
        (entry) =>
          isPlainObject(entry) &&
          hasExactKeys(entry, [
            'vocabularyId',
            'courseId',
            'term',
            'pronunciation',
            'translations',
          ]) &&
          isScopeIdentifier('resource', entry.vocabularyId) &&
          identifierIsSynthetic(entry.vocabularyId) &&
          courseIds.includes(entry.courseId) &&
          isBoundedString(entry.term, 128) &&
          isBoundedString(entry.pronunciation, 128) &&
          isPlainObject(entry.translations) &&
          hasExactKeys(entry.translations, ['es', 'vi']) &&
          isBoundedString(entry.translations.es, 256) &&
          isBoundedString(entry.translations.vi, 256),
      ) ||
      !catalog.media.every(
        (asset) =>
          isPlainObject(asset) &&
          hasExactKeys(asset, [
            'mediaId',
            'courseId',
            'format',
            'alternateText',
            'byteLength',
            'contentDigest',
          ]) &&
          isScopeIdentifier('resource', asset.mediaId) &&
          identifierIsSynthetic(asset.mediaId) &&
          courseIds.includes(asset.courseId) &&
          asset.format === 'raster-png-v1' &&
          isBoundedString(asset.alternateText, 256) &&
          isPositiveInteger(asset.byteLength) &&
          isSha256Digest(asset.contentDigest),
      ) ||
      !catalog.plannedFrames.every(
        (frame, index) =>
          isPlainObject(frame) &&
          hasExactKeys(frame, [
            'frameId',
            'schoolDate',
            'screenId',
            'courseId',
            'sequence',
            'state',
            'mediaIds',
          ]) &&
          isScopeIdentifier('resource', frame.frameId) &&
          identifierIsSynthetic(frame.frameId) &&
          isIsoDate(frame.schoolDate) &&
          screenIds.includes(frame.screenId) &&
          courseIds.includes(frame.courseId) &&
          frame.sequence === index + 1 &&
          ['coming-up', 'in-class', 'transition', 'day-complete'].includes(
            frame.state,
          ) &&
          isDenseArray(frame.mediaIds) &&
          frame.mediaIds.every((mediaId) => mediaIds.includes(mediaId)),
      )
    ) {
      return false;
    }
    if (
      !exactWorkspaceArtifacts(catalog) ||
      catalog.configurationStates.firstActivated.activePointer === null ||
      catalog.configurationStates.secondActivated.activePointer === null ||
      catalog.configurationStates.rolledBack.activePointer === null ||
      catalog.preview.status !== 'ready' ||
      !catalog.expectedScenarios.every(isExpectedScenario) ||
      !hasUniqueValues(
        catalog.expectedScenarios.map((scenario) => scenario.scenarioId),
      ) ||
      !coreGoal1AcceptanceTasks.every((task) =>
        catalog.expectedScenarios.some((scenario) =>
          scenario.requiredBy.includes(task),
        ),
      )
    ) {
      return false;
    }
    const rules = catalog.privacyRules;
    if (
      rules.dataClassification !== 'synthetic-only' ||
      canonicalJson(rules.workspaceKinds) !==
        canonicalJson(['self-hosted-installation']) ||
      canonicalJson(rules.sourceModes) !==
        canonicalJson(['application-managed']) ||
      rules.identifierMarker !== 'synthetic' ||
      rules.allowedUrlHostSuffix !== '.invalid' ||
      rules.forbidEmailAddresses !== true ||
      rules.forbidProviderEnrollment !== true ||
      rules.forbidHostedAuthority !== true ||
      canonicalJson(rules) !== canonicalJson(coreGoal1PrivacyRules) ||
      !isDenseArray(rules.forbiddenKeys) ||
      !isDenseArray(rules.portableExportForbiddenKeys) ||
      !rules.forbiddenKeys.every((key) => isBoundedString(key, 64)) ||
      !rules.portableExportForbiddenKeys.every((key) =>
        isBoundedString(key, 64),
      ) ||
      !hasUniqueValues(rules.forbiddenKeys) ||
      !hasUniqueValues(rules.portableExportForbiddenKeys)
    ) {
      return false;
    }
    const activeContent = catalog.configurationStates.rolledBack.revisions.find(
      (revision) =>
        revision.revisionId ===
        catalog.configurationStates.rolledBack.activePointer?.revisionId,
    )?.content;
    const previewBasis = catalog.preview.basis;
    const previewRevision =
      previewBasis.kind === 'revision'
        ? catalog.configurationStates.secondActivated.revisions.find(
            (revision) => revision.revisionId === previewBasis.revisionId,
          )
        : undefined;
    if (
      activeContent === undefined ||
      previewRevision === undefined ||
      previewBasis.kind !== 'revision' ||
      previewBasis.contentChecksum !== previewRevision.contentChecksum ||
      catalog.portableExport.manifest.configurationRevisionId !==
        catalog.configurationStates.rolledBack.activePointer?.revisionId ||
      catalog.portableExport.manifest.contentChecksum !==
        configurationDigest(activeContent) ||
      Object.values(catalog.configurationStates).some((state) =>
        [...state.drafts, ...state.revisions].some((record) =>
          record.content.sources.some(
            (source) => source.mode !== 'application-managed',
          ),
        ),
      ) ||
      catalog.portableExport.configuration.sources.some(
        (source) => source.mode !== 'application-managed',
      ) ||
      collectPrivacyViolations(catalog, rules).length > 0 ||
      collectPrivacyViolations(catalog.portableExport, rules, true).length > 0
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Executes every versioned scenario through a caller-supplied normalization
 * adapter. Results are exact canonical JSON; actual payloads are never echoed
 * into the report, which keeps failures safe to retain as test evidence.
 */
export async function runCoreGoal1ContractSuite(
  catalog: CoreGoal1FixtureCatalog,
  executor: CoreGoal1ScenarioExecutor,
): Promise<CoreGoal1ContractSuiteReport> {
  if (!isCoreGoal1FixtureCatalog(catalog)) {
    throw new TypeError('Invalid Core Goal 1 fixture catalog.');
  }
  const results: CoreGoal1ScenarioResult[] = [];
  for (const scenario of catalog.expectedScenarios) {
    const diagnostics: string[] = [];
    let observation: CoreGoal1ScenarioObservation | undefined;
    try {
      observation = await executor(
        cloneJsonValue(scenario),
        cloneJsonValue(catalog),
      );
      if (
        !isPlainObject(observation) ||
        !hasExactKeys(observation, ['scenarioId', 'actual']) ||
        observation.scenarioId !== scenario.scenarioId
      ) {
        diagnostics.push('invalid-observation-envelope');
      } else {
        try {
          if (
            canonicalJson(observation.actual) !==
            canonicalJson(scenario.expected)
          ) {
            diagnostics.push('expected-result-mismatch');
          }
        } catch {
          diagnostics.push('non-json-observation');
        }
        if (
          collectPrivacyViolations(observation.actual, catalog.privacyRules)
            .length > 0
        ) {
          diagnostics.push('privacy-rule-violation');
        }
      }
    } catch {
      diagnostics.push('executor-failed');
    }
    results.push({
      scenarioId: scenario.scenarioId,
      status: diagnostics.length === 0 ? 'passed' : 'failed',
      diagnostics,
    });
  }
  return {
    fixtureContractVersion: coreGoal1FixtureContractVersion,
    status: results.every((result) => result.status === 'passed')
      ? 'passed'
      : 'failed',
    results,
  };
}
