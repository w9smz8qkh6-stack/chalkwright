import {
  contractVersion,
  type ContractEnvelope,
  type IsoDate,
} from './common.js';
import {
  isScopedTarget,
  isWorkspace,
  type ScopedTarget,
  type Workspace,
} from './workspace.js';

/** A07 contract version for Core operator information architecture. */
export const operatorPanelContractVersion = '1.0.0' as const;

export const operatorPageKeys = [
  'overview',
  'displays',
  'sources',
  'planned-display',
  'presentation',
  'configuration',
  'diagnostics-recovery',
] as const;
export type OperatorPageKey = (typeof operatorPageKeys)[number];

export const operatorRegionStates = [
  'ready',
  'loading',
  'empty',
  'validation',
  'conflict',
  'success',
  'partial',
  'degraded',
  'stale',
  'disabled',
  'unavailable',
  'destructive',
  'recovery',
] as const;
export type OperatorRegionState = (typeof operatorRegionStates)[number];

export const readinessLevels = [
  'blocker',
  'warning',
  'information',
  'ready',
] as const;
export type ReadinessLevel = (typeof readinessLevels)[number];

export const coreMvpFeatureIds = [
  'PANEL-01',
  'PANEL-02',
  'CFG-01',
  'CFG-02',
  'SCREEN-01',
  'VIEW-01',
  'SRC-01',
  'SRC-02',
  'SRC-03',
  'PLAN-01',
  'PLAN-02',
  'PRES-01',
  'LANG-01',
  'DIAG-01',
  'PORT-01',
  'DIST-01',
  'COMPAT-01',
  'DISPLAY-01',
  'SCOPE-01',
] as const;
export type CoreMvpFeatureId = (typeof coreMvpFeatureIds)[number];

export type OperatorScopeRequirement =
  'workspace' | 'workspace-screen' | 'workspace-screen-date';

export interface OperatorPageSpecification {
  readonly key: OperatorPageKey;
  readonly label: string;
  readonly purpose: string;
  readonly requiredScope: OperatorScopeRequirement;
  readonly informationHierarchy: readonly string[];
  readonly primaryActions: readonly string[];
  readonly secondaryActions: readonly string[];
  readonly guidanceIntent: string;
  readonly readinessEffects: readonly string[];
  readonly applicableStates: readonly OperatorRegionState[];
  readonly coreMvpFeatures: readonly CoreMvpFeatureId[];
}

/**
 * Route-independent A07 page catalog. Labels describe semantic actions; shells
 * bind authorized URLs and form targets after fixing workspace/actor scope.
 */
export const operatorPageCatalog = [
  {
    key: 'overview',
    label: 'Overview',
    purpose:
      'Explain installation readiness, setup progression, active continuity, and the next safe operator action.',
    requiredScope: 'workspace',
    informationHierarchy: [
      'Overall readiness and ordered blockers',
      'Last-known-good display continuity',
      'Setup progression',
      'Screen and source summary',
      'Draft versus effective configuration',
      'Reserved connected-data release notice',
    ],
    primaryActions: ['continue-setup', 'review-planned-display'],
    secondaryActions: ['review-readiness', 'open-effective-configuration'],
    guidanceIntent:
      'State what is safe now, what blocks activation, and where to resolve each issue without implying a login or provider prerequisite.',
    readinessEffects: [
      'Aggregates workspace, screen, source, preview, and configuration signals.',
      'Never hides last-known-good availability behind a current blocker.',
    ],
    applicableStates: [
      'ready',
      'loading',
      'empty',
      'partial',
      'degraded',
      'stale',
      'unavailable',
      'recovery',
    ],
    coreMvpFeatures: ['PANEL-01', 'DISPLAY-01', 'SCOPE-01'],
  },
  {
    key: 'displays',
    label: 'Displays',
    purpose:
      'Manage rooms, screens, timezone, display identity, and low-privilege class-code controls.',
    requiredScope: 'workspace-screen',
    informationHierarchy: [
      'Room and screen registry',
      'Selected screen identity and timezone',
      'Display readiness and last successful projection',
      'Class-code state, rotation, revocation, and viewer-session effect',
      'Shell-resolved opaque display and viewer references',
    ],
    primaryActions: ['save-screen-draft', 'rotate-class-code'],
    secondaryActions: [
      'add-room',
      'add-screen',
      'revoke-class-code',
      'review-selected-screen',
    ],
    guidanceIntent:
      'Explain that class codes admit only the selected display projection and never grant operator or account authority.',
    readinessEffects: [
      'Missing room, screen, timezone, or display identity blocks activation.',
      'Missing class code warns when viewer admission is intended but does not block the classroom display.',
    ],
    applicableStates: [
      'ready',
      'loading',
      'empty',
      'validation',
      'conflict',
      'success',
      'disabled',
      'destructive',
    ],
    coreMvpFeatures: ['SCREEN-01', 'VIEW-01', 'DISPLAY-01', 'SCOPE-01'],
  },
  {
    key: 'sources',
    label: 'Sources',
    purpose:
      'Configure the source registry, guided non-connected lanes, stream mappings, validation, provenance, freshness, and retained projections.',
    requiredScope: 'workspace',
    informationHierarchy: [
      'Source registry grouped by stream',
      'Application-managed, uploaded snapshot, and shared-resource guided forms',
      'Stream mappings and closed accepted formats',
      'Validation and bounded acquisition evidence',
      'Provenance, freshness, last attempt, and last-known-good projection',
      'Connected-account release reservation',
    ],
    primaryActions: ['add-source', 'validate-source-draft'],
    secondaryActions: [
      'edit-stream-mapping',
      'replace-upload',
      'retry-refresh',
      'disable-source',
    ],
    guidanceIntent:
      'Offer a complete application-managed/manual path first; describe connected data as a later optional capability, not Core authentication or an MVP prerequisite.',
    readinessEffects: [
      'A required stream without a committed projection blocks activation.',
      'A failed refresh warns or becomes stale while the exact last-known-good projection remains identified.',
      'Invalid or unverified input never replaces committed display data.',
    ],
    applicableStates: [
      'ready',
      'loading',
      'empty',
      'validation',
      'conflict',
      'success',
      'partial',
      'degraded',
      'stale',
      'disabled',
      'unavailable',
      'destructive',
      'recovery',
    ],
    coreMvpFeatures: ['SRC-01', 'SRC-02', 'SRC-03', 'DISPLAY-01', 'SCOPE-01'],
  },
  {
    key: 'planned-display',
    label: 'Planned display',
    purpose:
      'Review mutation-free, date-bound display projections through contact sheets and enlarged frames before activation.',
    requiredScope: 'workspace-screen-date',
    informationHierarchy: [
      'Persistent preview-only and configuration-basis signal',
      'Screen and selected school date',
      'Daily contact sheet in chronological order',
      'Selected enlarged frame with provenance and freshness',
      'Day carousel and frame position',
      'Preview diagnostics and last-known-good continuity',
    ],
    primaryActions: ['select-date', 'open-frame-review'],
    secondaryActions: [
      'previous-date',
      'next-date',
      'previous-frame',
      'next-frame',
      'close-frame-review',
    ],
    guidanceIntent:
      'Repeat that preview is mutation-free, may differ from effective output until activation, and has no provider or Calendar write capability.',
    readinessEffects: [
      'A preview generation error blocks activation only when no valid reviewable basis exists.',
      'Partial, degraded, or stale inputs remain visible with their exact retained last-known-good basis.',
    ],
    applicableStates: [
      'ready',
      'loading',
      'empty',
      'validation',
      'partial',
      'degraded',
      'stale',
      'unavailable',
    ],
    coreMvpFeatures: ['PLAN-01', 'PLAN-02', 'DISPLAY-01', 'SCOPE-01'],
  },
  {
    key: 'presentation',
    label: 'Presentation',
    purpose:
      'Configure branding, theme, timing, language, motion, and reduced-motion-safe presentation with reversible preview.',
    requiredScope: 'workspace-screen',
    informationHierarchy: [
      'Branding and display identity',
      'Theme and contrast-safe palette',
      'Timing and transition profile',
      'Interface language and reviewed source-authored translations',
      'Motion and reduced-motion behavior',
      'Mutation-free before/after preview',
    ],
    primaryActions: ['save-presentation-draft', 'preview-presentation'],
    secondaryActions: ['reset-profile-draft', 'compare-effective-profile'],
    guidanceIntent:
      'Explain that presentation settings change display treatment, not schedule/content truth, and that reduced motion remains a first-class preview.',
    readinessEffects: [
      'Missing readable branding fallback or contrast failure blocks activation.',
      'Unreviewed translation and unsupported motion choices produce explicit warnings or validation errors.',
    ],
    applicableStates: [
      'ready',
      'loading',
      'empty',
      'validation',
      'conflict',
      'success',
      'disabled',
    ],
    coreMvpFeatures: ['PRES-01', 'LANG-01', 'DISPLAY-01', 'SCOPE-01'],
  },
  {
    key: 'configuration',
    label: 'Configuration',
    purpose:
      'Make the versioned draft, validation, preview, activation, history, rollback, and conflict boundaries inspectable.',
    requiredScope: 'workspace',
    informationHierarchy: [
      'Unsaved browser edits and saved draft version',
      'Validation result and eligible immutable revision',
      'Effective active revision and last activation',
      'Revision history, provenance, and bounded audit attribution',
      'Rollback eligibility and last-known-good active pointer',
    ],
    primaryActions: ['save-draft', 'validate-draft', 'activate-revision'],
    secondaryActions: [
      'discard-unsaved-edits',
      'preview-draft',
      'compare-revisions',
      'roll-back-revision',
    ],
    guidanceIntent:
      'Keep draft, preview, eligible revision, active revision, and rollback distinct; explain optimistic conflicts without offering last-write-wins.',
    readinessEffects: [
      'Unsaved edits are information and cannot be activated.',
      'Validation errors block revision eligibility.',
      'A revision conflict preserves the prior active state and requires review.',
      'Activation is disabled until readiness blockers are cleared and a reviewed eligible revision is selected.',
    ],
    applicableStates: [
      'ready',
      'loading',
      'empty',
      'validation',
      'conflict',
      'success',
      'disabled',
      'destructive',
      'recovery',
    ],
    coreMvpFeatures: ['CFG-01', 'CFG-02', 'SCOPE-01'],
  },
  {
    key: 'diagnostics-recovery',
    label: 'Diagnostics & recovery',
    purpose:
      'Explain readiness and freshness safely, expose bounded audit/history, and guide redacted export, import, backup, restore, rollback, and recovery.',
    requiredScope: 'workspace',
    informationHierarchy: [
      'Readiness and freshness explanations',
      'Redacted diagnostics and support-safe evidence',
      'Bounded audit history',
      'Redacted configuration export and validated import',
      'Protected backup status and isolated restore preflight',
      'Recovery, compatibility, release, and rollback evidence',
    ],
    primaryActions: [
      'export-redacted-configuration',
      'create-protected-backup',
    ],
    secondaryActions: [
      'validate-import',
      'review-restore-preflight',
      'download-redacted-evidence',
      'review-release-compatibility',
    ],
    guidanceIntent:
      'State what is redacted, what remains protected, why destructive recovery needs an explicit preflight/confirmation, and which last-known-good state remains available.',
    readinessEffects: [
      'Failed backup or incompatible restore warns without replacing current state.',
      'Corrupt, cross-workspace, or unsupported artifacts are unavailable for restore.',
      'Recovery never hides the currently active last-known-good revision.',
    ],
    applicableStates: [
      'ready',
      'loading',
      'empty',
      'validation',
      'conflict',
      'success',
      'partial',
      'degraded',
      'stale',
      'disabled',
      'unavailable',
      'destructive',
      'recovery',
    ],
    coreMvpFeatures: [
      'PANEL-02',
      'CFG-02',
      'DIAG-01',
      'PORT-01',
      'DIST-01',
      'COMPAT-01',
      'DISPLAY-01',
      'SCOPE-01',
    ],
  },
] as const satisfies readonly OperatorPageSpecification[];

export const setupProgression = [
  {
    key: 'installation',
    label: 'Installation basics',
    completion: 'Workspace identity, timezone, and date policy are valid.',
  },
  {
    key: 'displays',
    label: 'Rooms and displays',
    completion:
      'At least one room and screen have display identity and readiness.',
  },
  {
    key: 'sources',
    label: 'Sources and mappings',
    completion:
      'Required streams have verified committed projections through non-connected lanes.',
  },
  {
    key: 'presentation',
    label: 'Presentation',
    completion:
      'Branding, language, timing, contrast, and reduced-motion preview validate.',
  },
  {
    key: 'review',
    label: 'Planned-display review',
    completion:
      'The selected screen/date contact sheet and representative frames are reviewed.',
  },
  {
    key: 'activate',
    label: 'Validate and activate',
    completion:
      'A reviewed eligible revision has no readiness blockers and is activated explicitly.',
  },
] as const;

export const configurationBoundaries = [
  {
    key: 'save-draft',
    effect: 'draft-only',
    rule: 'Saves the next optimistic draft version; effective display state is unchanged.',
  },
  {
    key: 'preview-draft',
    effect: 'mutation-free',
    rule: 'Generates an expiring preview bound to the exact draft without activation or provider/Calendar mutation authority.',
  },
  {
    key: 'validate-draft',
    effect: 'revision-only',
    rule: 'Creates an immutable eligible revision when the exact draft validates; the active pointer is unchanged.',
  },
  {
    key: 'activate-revision',
    effect: 'effective-state',
    rule: 'Atomically selects one eligible revision after readiness review; conflict preserves the prior active revision.',
  },
  {
    key: 'roll-back-revision',
    effect: 'effective-state',
    rule: 'Selects an eligible prior revision through exact optimistic evidence; the last-known-good pointer remains until success.',
  },
  {
    key: 'discard-unsaved-edits',
    effect: 'destructive-local',
    rule: 'Requires explicit confirmation and discards only unsaved browser edits, never a saved draft or active revision.',
  },
] as const;

export const plannedDisplayKeyboardContract = {
  contactSheet: {
    ArrowLeft: 'Select the previous frame without opening it.',
    ArrowRight: 'Select the next frame without opening it.',
    Home: 'Select the first frame for the date.',
    End: 'Select the last frame for the date.',
    Enter: 'Open the selected frame in enlarged review.',
    Space: 'Open the selected frame in enlarged review.',
  },
  enlargedReview: {
    ArrowLeft: 'Review the previous frame and keep focus in the dialog.',
    ArrowRight: 'Review the next frame and keep focus in the dialog.',
    Escape:
      'Close enlarged review and return focus to the contact-sheet trigger that opened it.',
  },
  dateSelection:
    'Previous/next-date actions move by school date, while the date picker selects an explicit date; date changes restore focus to the page heading after the announced result loads.',
  mutationBoundary:
    'Frame, carousel, and date review are preview-only and cannot activate configuration, refresh a provider, or invoke Calendar writes.',
} as const;

export const operatorAccessibilityAcceptance = {
  viewports: [
    { width: 390, height: 844, label: 'mobile-portrait' },
    { width: 768, height: 1024, label: 'tablet-portrait' },
    { width: 1366, height: 768, label: 'desktop-compact' },
    { width: 1920, height: 1080, label: 'desktop-wide' },
  ],
  zoom: 'At 200% zoom, content reflows with no horizontal clipping and all actions remain reachable.',
  structure: [
    'Shell document exposes skip navigation, banner, navigation, and main landmarks.',
    'The Core feature region has one labelled region, one page heading, and labelled sections and controls.',
    'DOM and focus order follow reading order; mobile reflow does not reorder meaning.',
  ],
  input: [
    'Every workflow can be completed with keyboard only.',
    'Focus is visible, predictable, and returned to the opener after modal review.',
    'Interactive targets are at least 44 by 44 CSS pixels where space permits and never below 24 by 24 CSS pixels.',
  ],
  communication: [
    'Blocker, warning, information, success, selection, and disabled meaning use text or icon plus text, never color alone.',
    'Status changes use polite live regions; destructive/recovery confirmations take focus and are not live-region-only.',
    'Loading preserves context; validation errors are summarized and associated with their fields.',
  ],
  motion:
    'Reduced motion removes non-essential animation and preserves state changes without motion-dependent meaning.',
} as const;

/**
 * Delivery rules for the future Core shell. JavaScript may improve interaction,
 * but it is never the only way to complete an operator task or understand the
 * result of a server-side action.
 */
export const operatorDeliveryAcceptance = {
  strategy:
    'Existing TypeScript with complete server-rendered HTML and CSS; no client framework or bundler is required.',
  forms: [
    'The owning shell binds each semantic Core action key to an ordinary form or safe navigation after fixing workspace, actor, target, and capability scope server-side.',
    'State-changing actions use non-GET form submission, explicit intent, optimistic evidence where required, and server-side validation before any effect.',
    'A validation failure returns a complete page with an error summary, field associations, preserved non-secret input, the unchanged effective state, and a safe next action.',
  ],
  noJavaScript: [
    'Every Core MVP workflow remains operable when JavaScript is unavailable: ordinary forms and complete server-rendered responses provide the authoritative path.',
    'Planned-display date and frame selection submit through the shell and return a complete selected-frame review; JavaScript may enhance Arrow-key selection and dialog review but may not be the only review path.',
    'Readiness, loading completion, success, conflicts, and errors remain present in page text and focusable structure without relying on client-side status updates.',
  ],
  reducedMotion:
    'The no-JavaScript path is motion-free, and enhanced behavior honors reduced motion while preserving the same state and action semantics.',
  selfHostedAuthorityWarning: {
    placement:
      'The self-hosted shell renders this persistent warning on every operator page before page-specific actions.',
    text: 'Private operator access: anyone who can reach this panel can administer this installation. Do not expose it publicly.',
    behavior:
      'The warning is server-rendered, non-dismissible, and must not be replaced by a Core login or account affordance.',
  },
  hostedExclusion:
    'The hosted shell uses authenticated account authorization and does not present the self-hosted reachability warning as its authority model.',
} as const;

export type OperatorActionIntent =
  'navigate' | 'draft' | 'preview' | 'activate' | 'destructive' | 'recovery';

export interface OperatorFeatureAction {
  readonly actionKey: string;
  readonly label: string;
  readonly intent: OperatorActionIntent;
  readonly targetPage: OperatorPageKey | null;
  readonly resource: ScopedTarget | null;
  readonly disabledReason: string | null;
  readonly confirmation: 'none' | 'review' | 'type-to-confirm';
}

export interface OperatorReadinessSignal {
  readonly signalKey: string;
  readonly level: ReadinessLevel;
  readonly summary: string;
  readonly detail: string;
  readonly blocksActivation: boolean;
  readonly sourcePage: OperatorPageKey;
  readonly nextActionKey: string | null;
}

export interface OperatorFeatureItem {
  readonly itemKey: string;
  readonly label: string;
  readonly value: string;
  readonly detail: string | null;
  readonly state: OperatorRegionState;
}

export interface OperatorFeatureSection {
  readonly sectionKey: string;
  readonly heading: string;
  readonly summary: string;
  readonly state: OperatorRegionState;
  readonly items: readonly OperatorFeatureItem[];
  readonly actions: readonly OperatorFeatureAction[];
}

/**
 * Inert Core feature-region model. It deliberately has no URL, cookie,
 * account, membership, billing, raw HTML, form target, or authorization field.
 */
export interface OperatorFeatureRegionModel extends ContractEnvelope {
  readonly operatorPanelContractVersion: typeof operatorPanelContractVersion;
  readonly recordKind: 'operator-feature-region';
  readonly regionKey: 'core-operator-panel';
  readonly workspace: Workspace;
  readonly targets: readonly ScopedTarget[];
  readonly pageKey: OperatorPageKey;
  readonly title: string;
  readonly guidance: string;
  readonly state: OperatorRegionState;
  readonly mutationBoundary:
    | 'read-only'
    | 'preview-only'
    | 'draft-only'
    | 'effective-change'
    | 'recovery';
  readonly statusAnnouncement: string | null;
  readonly readiness: readonly OperatorReadinessSignal[];
  readonly sections: readonly OperatorFeatureSection[];
}

export const forbiddenOperatorFeatureRegionFields = [
  'url',
  'href',
  'action',
  'route',
  'routeTable',
  'cookie',
  'session',
  'account',
  'membership',
  'organizationSelector',
  'role',
  'billing',
  'authorization',
  'rawHtml',
  'providerPayload',
] as const;

export const operatorShellObligations = {
  core: [
    'Require explicit workspace and target scope.',
    'Expose inert route-independent feature-region models and escaped region renderers.',
    'Use opaque scoped resource identities and semantic action keys.',
    'Never choose a tenant, authenticate an actor, emit document chrome, or bind a URL/action target.',
  ],
  selfHosted: [
    'Construct the one fixed installation workspace and operator-reachability authority.',
    'Own the complete document, Core-global navigation, private operator ingress, URLs, action binding, CSP, cookies, caching, and error routing.',
    'Keep operator and display route tables, document wrappers, services, and capabilities separate.',
  ],
  hosted: [
    'Authenticate the account, check organization membership/role, and fix workspace/actor scope server-side before invoking Core.',
    'Own hosted document chrome, account navigation, organization context, URLs, actions, CSP, cookies, billing/support context, and error routing.',
    'Consume only supported Core feature-region exports; never import or expose the self-hosted route table or document wrapper.',
  ],
  conformance: [
    'Render identical Core fixtures inside synthetic self-hosted and hosted wrappers.',
    'Reject forbidden fields, raw markup, wrong-workspace targets, and shell-owned authority in Core models.',
    'Verify escaping, landmark composition, keyboard order, responsive reflow, reduced motion, and finite states.',
  ],
} as const;

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return Reflect.ownKeys(value).every((key) => {
      if (typeof key !== 'string') return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        descriptor !== undefined &&
        'value' in descriptor &&
        descriptor.enumerable
      );
    });
  } catch {
    return false;
  }
}

function hasExactKeys(value: PlainObject, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key) && value[key] !== undefined)
  );
}

function isDenseArray(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value)) return false;
  try {
    const ownKeys = Reflect.ownKeys(value);
    return (
      ownKeys.length === value.length + 1 &&
      ownKeys.every((key) => {
        if (key === 'length') return true;
        if (typeof key !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(key)) {
          return false;
        }
        const index = Number(key);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return (
          Number.isSafeInteger(index) &&
          index < value.length &&
          descriptor !== undefined &&
          'value' in descriptor &&
          descriptor.enumerable
        );
      }) &&
      Array.from({ length: value.length }, (_, index) => index).every((index) =>
        Object.hasOwn(value, index),
      )
    );
  } catch {
    return false;
  }
}

function isBoundedText(value: unknown, maximum = 2_000): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= maximum
  );
}

function isStableKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 128 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)
  );
}

function hasUniqueKeys<
  Value extends Record<Key, string>,
  Key extends PropertyKey,
>(values: readonly Value[], key: Key): boolean {
  return new Set(values.map((value) => value[key])).size === values.length;
}

function scopedTargetIdentity(target: ScopedTarget): string {
  switch (target.kind) {
    case 'workspace':
      return `workspace:${target.workspaceId}`;
    case 'room':
      return `room:${target.workspaceId}:${target.roomId}`;
    case 'screen':
      return `screen:${target.workspaceId}:${target.roomId}:${target.screenId}`;
    case 'date':
      return `date:${target.workspaceId}:${target.date}`;
    case 'resource':
      return `resource:${target.workspaceId}:${target.resourceKind}:${target.resourceId}`;
  }
}

function isOperatorFeatureAction(
  value: unknown,
): value is OperatorFeatureAction {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'actionKey',
      'label',
      'intent',
      'targetPage',
      'resource',
      'disabledReason',
      'confirmation',
    ]) &&
    isStableKey(value.actionKey) &&
    isBoundedText(value.label, 160) &&
    [
      'navigate',
      'draft',
      'preview',
      'activate',
      'destructive',
      'recovery',
    ].includes(value.intent as string) &&
    (value.targetPage === null ||
      operatorPageKeys.includes(value.targetPage as OperatorPageKey)) &&
    (value.resource === null || isScopedTarget(value.resource)) &&
    (value.disabledReason === null ||
      isBoundedText(value.disabledReason, 500)) &&
    ['none', 'review', 'type-to-confirm'].includes(value.confirmation as string)
  );
}

function isOperatorReadinessSignal(
  value: unknown,
): value is OperatorReadinessSignal {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'signalKey',
      'level',
      'summary',
      'detail',
      'blocksActivation',
      'sourcePage',
      'nextActionKey',
    ]) &&
    isStableKey(value.signalKey) &&
    readinessLevels.includes(value.level as ReadinessLevel) &&
    isBoundedText(value.summary, 240) &&
    isBoundedText(value.detail) &&
    typeof value.blocksActivation === 'boolean' &&
    (value.level === 'blocker'
      ? value.blocksActivation === true
      : value.blocksActivation === false) &&
    operatorPageKeys.includes(value.sourcePage as OperatorPageKey) &&
    (value.nextActionKey === null || isStableKey(value.nextActionKey))
  );
}

function isOperatorFeatureItem(value: unknown): value is OperatorFeatureItem {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['itemKey', 'label', 'value', 'detail', 'state']) &&
    isStableKey(value.itemKey) &&
    isBoundedText(value.label, 240) &&
    isBoundedText(value.value) &&
    (value.detail === null || isBoundedText(value.detail)) &&
    operatorRegionStates.includes(value.state as OperatorRegionState)
  );
}

function isOperatorFeatureSection(
  value: unknown,
): value is OperatorFeatureSection {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      'sectionKey',
      'heading',
      'summary',
      'state',
      'items',
      'actions',
    ]) &&
    isStableKey(value.sectionKey) &&
    isBoundedText(value.heading, 240) &&
    isBoundedText(value.summary) &&
    operatorRegionStates.includes(value.state as OperatorRegionState) &&
    isDenseArray(value.items) &&
    value.items.length <= 64 &&
    value.items.every(isOperatorFeatureItem) &&
    isDenseArray(value.actions) &&
    value.actions.length <= 16 &&
    value.actions.every(isOperatorFeatureAction)
  );
}

export function isOperatorFeatureRegionModel(
  value: unknown,
): value is OperatorFeatureRegionModel {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      'contractVersion',
      'operatorPanelContractVersion',
      'recordKind',
      'regionKey',
      'workspace',
      'targets',
      'pageKey',
      'title',
      'guidance',
      'state',
      'mutationBoundary',
      'statusAnnouncement',
      'readiness',
      'sections',
    ]) ||
    value.contractVersion !== contractVersion ||
    value.operatorPanelContractVersion !== operatorPanelContractVersion ||
    value.recordKind !== 'operator-feature-region' ||
    value.regionKey !== 'core-operator-panel' ||
    !isWorkspace(value.workspace) ||
    !isDenseArray(value.targets) ||
    value.targets.length === 0 ||
    value.targets.length > 8 ||
    !value.targets.every(isScopedTarget) ||
    !operatorPageKeys.includes(value.pageKey as OperatorPageKey) ||
    !isBoundedText(value.title, 240) ||
    !isBoundedText(value.guidance) ||
    !operatorRegionStates.includes(value.state as OperatorRegionState) ||
    ![
      'read-only',
      'preview-only',
      'draft-only',
      'effective-change',
      'recovery',
    ].includes(value.mutationBoundary as string) ||
    (value.statusAnnouncement !== null &&
      !isBoundedText(value.statusAnnouncement, 500)) ||
    !isDenseArray(value.readiness) ||
    value.readiness.length > 64 ||
    !value.readiness.every(isOperatorReadinessSignal) ||
    !isDenseArray(value.sections) ||
    value.sections.length === 0 ||
    value.sections.length > 32 ||
    !value.sections.every(isOperatorFeatureSection)
  ) {
    return false;
  }

  const workspace = value.workspace;
  const targets = value.targets as readonly ScopedTarget[];
  const readiness = value.readiness as readonly OperatorReadinessSignal[];
  const sections = value.sections as readonly OperatorFeatureSection[];
  if (
    !isWorkspace(workspace) ||
    targets.some((target) => target.workspaceId !== workspace.workspaceId) ||
    new Set(targets.map(scopedTargetIdentity)).size !== targets.length ||
    !hasUniqueKeys(readiness, 'signalKey') ||
    !hasUniqueKeys(sections, 'sectionKey') ||
    !hasUniqueKeys(
      sections.flatMap((section) => section.actions),
      'actionKey',
    ) ||
    sections.some(
      (section) =>
        !hasUniqueKeys(section.items, 'itemKey') ||
        section.actions.some(
          (action) =>
            action.resource !== null &&
            action.resource.workspaceId !== workspace.workspaceId,
        ),
    )
  ) {
    return false;
  }

  return !forbiddenOperatorFeatureRegionFields.some((field) =>
    Object.hasOwn(value, field),
  );
}

/** School-date selection is explicit and route-independent. */
export interface PlannedDisplayDateSelection {
  readonly pageKey: 'planned-display';
  readonly date: IsoDate;
}
