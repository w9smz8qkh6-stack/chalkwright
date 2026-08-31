import {
  contractVersion,
  operatorPanelContractVersion,
  operatorRegionStates,
  scopeIdentifier,
  type OperatorActionIntent,
  type OperatorFeatureAction,
  type OperatorFeatureItem,
  type OperatorFeatureRegionModel,
  type OperatorFeatureSection,
  type OperatorPageKey,
  type OperatorReadinessSignal,
  type OperatorRegionState,
  type ScopedTarget,
} from '../../src/contracts/v1/index.js';
import { selfHostedWorkspace } from './configuration-state.js';

const roomId = scopeIdentifier('room', 'room-synthetic-101');
const screenId = scopeIdentifier('screen', 'screen-synthetic-primary');
const workspaceTarget = {
  kind: 'workspace' as const,
  workspaceId: selfHostedWorkspace.workspaceId,
};
const screenTarget = {
  kind: 'screen' as const,
  workspaceId: selfHostedWorkspace.workspaceId,
  roomId,
  screenId,
};
const dateTarget = {
  kind: 'date' as const,
  workspaceId: selfHostedWorkspace.workspaceId,
  date: '2035-04-13',
};

function action(
  actionKey: string,
  label: string,
  intent: OperatorActionIntent,
  targetPage: OperatorPageKey | null = null,
  disabledReason: string | null = null,
  confirmation: OperatorFeatureAction['confirmation'] = 'none',
): OperatorFeatureAction {
  return {
    actionKey,
    label,
    intent,
    targetPage,
    resource: null,
    disabledReason,
    confirmation,
  };
}

function item(
  itemKey: string,
  label: string,
  value: string,
  detail: string | null,
  state: OperatorRegionState = 'ready',
): OperatorFeatureItem {
  return { itemKey, label, value, detail, state };
}

function section(
  sectionKey: string,
  heading: string,
  summary: string,
  state: OperatorRegionState,
  items: readonly OperatorFeatureItem[],
  actions: readonly OperatorFeatureAction[] = [],
): OperatorFeatureSection {
  return { sectionKey, heading, summary, state, items, actions };
}

const readiness: readonly OperatorReadinessSignal[] = [
  {
    signalKey: 'timezone-required',
    level: 'blocker',
    summary: 'Choose the school timezone',
    detail:
      'Dates and bell times cannot be validated until the installation timezone is explicit.',
    blocksActivation: true,
    sourcePage: 'displays',
    nextActionKey: 'review-display-settings',
  },
  {
    signalKey: 'assignment-source-stale',
    level: 'warning',
    summary: 'Assignment source is stale',
    detail:
      'The last verified projection remains available while the shared source is reviewed.',
    blocksActivation: false,
    sourcePage: 'sources',
    nextActionKey: 'review-assignment-source',
  },
  {
    signalKey: 'last-known-good-available',
    level: 'ready',
    summary: 'Last-known-good display is available',
    detail:
      'The active revision and its committed projections remain display-ready.',
    blocksActivation: false,
    sourcePage: 'overview',
    nextActionKey: 'review-effective-configuration',
  },
];

function model(
  pageKey: OperatorPageKey,
  title: string,
  guidance: string,
  mutationBoundary: OperatorFeatureRegionModel['mutationBoundary'],
  targets: readonly ScopedTarget[],
  sections: readonly OperatorFeatureSection[],
  options: {
    readonly state?: OperatorRegionState;
    readonly readiness?: readonly OperatorReadinessSignal[];
    readonly statusAnnouncement?: string | null;
  } = {},
): OperatorFeatureRegionModel {
  return {
    contractVersion,
    operatorPanelContractVersion,
    recordKind: 'operator-feature-region',
    regionKey: 'core-operator-panel',
    workspace: selfHostedWorkspace,
    targets,
    pageKey,
    title,
    guidance,
    state: options.state ?? 'ready',
    mutationBoundary,
    statusAnnouncement: options.statusAnnouncement ?? null,
    readiness: options.readiness ?? [],
    sections,
  };
}

const overview = model(
  'overview',
  'Setup readiness',
  'Resolve blockers in order. Your effective display remains available while draft setup changes are incomplete.',
  'read-only',
  [workspaceTarget],
  [
    section(
      'setup-progress',
      'Continue setup',
      'Two of six setup stages need attention.',
      'partial',
      [
        item(
          'installation-basics',
          'Installation basics',
          'Needs attention',
          'Timezone is not selected.',
          'validation',
        ),
        item(
          'rooms-displays',
          'Rooms and displays',
          'Ready',
          'One enabled synthetic display.',
        ),
        item(
          'sources-mappings',
          'Sources and mappings',
          'Warning',
          'Assignments retain a stale last-known-good projection.',
          'stale',
        ),
        item(
          'planned-review',
          'Planned-display review',
          'Not reviewed',
          'Review the selected school date before activation.',
          'disabled',
        ),
      ],
      [action('continue-setup', 'Continue setup', 'navigate', 'displays')],
    ),
    section(
      'display-continuity',
      'Display continuity',
      'Current blockers do not replace the effective last-known-good state.',
      'ready',
      [
        item(
          'active-revision',
          'Effective revision',
          'Revision 7',
          'Activated from a validated configuration.',
        ),
        item(
          'display-projection',
          'Last successful display',
          'Available',
          'Generated from committed synthetic projections.',
        ),
      ],
      [
        action(
          'review-planned-display',
          'Review planned display',
          'navigate',
          'planned-display',
        ),
      ],
    ),
    section(
      'configuration-boundary',
      'Draft and effective configuration',
      'Draft changes are saved separately and do not affect the active display until explicit activation.',
      'partial',
      [
        item(
          'saved-draft',
          'Saved draft',
          'Version 4',
          'Three changes since Revision 7.',
          'partial',
        ),
        item(
          'effective-state',
          'Effective',
          'Revision 7',
          'Still serving the last-known-good display.',
        ),
      ],
      [
        action(
          'open-configuration',
          'Review configuration',
          'navigate',
          'configuration',
        ),
      ],
    ),
    section(
      'connected-release',
      'Connected data — later release',
      'Provider connections are optional and are not required for the Core operator MVP.',
      'disabled',
      [
        item(
          'google-connection',
          'Google Classroom connection',
          'Reserved',
          'Application-managed, upload, and shared lanes remain available.',
          'disabled',
        ),
      ],
    ),
  ],
  { readiness },
);

const displays = model(
  'displays',
  'Rooms and displays',
  'Screen identity and viewer admission stay scoped to this installation; class codes never grant operator access.',
  'draft-only',
  [workspaceTarget, screenTarget],
  [
    section(
      'screen-registry',
      'Display registry',
      'One room and one enabled display are in the current draft.',
      'partial',
      [
        item(
          'room',
          'Room',
          'Synthetic Room 101',
          'Opaque room identity retained.',
        ),
        item(
          'screen',
          'Display',
          'Front display',
          'Display identity is configured.',
        ),
        item(
          'timezone',
          'School timezone',
          'Required',
          'Choose one IANA timezone before validation.',
          'validation',
        ),
      ],
      [action('save-screen-draft', 'Save display draft', 'draft')],
    ),
    section(
      'viewer-admission',
      'Class-code controls',
      'A class code admits only this display projection.',
      'ready',
      [
        item(
          'class-code-status',
          'Class code',
          'Active',
          'Verifier is held behind a protected reference; plaintext is never shown.',
        ),
        item(
          'viewer-session-effect',
          'Rotation effect',
          'Revokes existing sessions',
          'Rotation is explicit and screen-scoped.',
        ),
      ],
      [
        action(
          'rotate-class-code',
          'Rotate class code',
          'destructive',
          null,
          null,
          'review',
        ),
      ],
    ),
  ],
  { readiness: readiness.slice(0, 1) },
);

const sources = model(
  'sources',
  'Sources and mappings',
  'Use guided non-connected sources first. Only verified projections can replace display data.',
  'draft-only',
  [workspaceTarget],
  [
    section(
      'source-registry',
      'Source registry',
      'Each stream names one closed mode, format, mapping, provenance, and freshness basis.',
      'partial',
      [
        item(
          'managed-schedule',
          'Schedule and bells',
          'Application-managed · current',
          'Validated managed revision observed today.',
        ),
        item(
          'uploaded-vocabulary',
          'Vocabulary and translations',
          'Uploaded snapshot · current',
          'Immutable accepted CSV import with reviewed translations.',
        ),
        item(
          'shared-assignments',
          'Assignments and links',
          'Shared resource · stale',
          'Refresh failed; exact last-known-good projection remains committed.',
          'stale',
        ),
        item(
          'connected-coursework',
          'Connected coursework',
          'Reserved for later release',
          'Not a Core login and not an operator-MVP prerequisite.',
          'disabled',
        ),
      ],
      [action('add-source', 'Add source', 'draft')],
    ),
    section(
      'guided-source-form',
      'Guided shared-source draft',
      'The reference shows copy intent and finite validation without retaining a URL in the Core region model.',
      'validation',
      [
        item(
          'stream-mapping',
          'Stream mapping',
          'Assignments and links',
          'Maps approved columns into the canonical stream.',
        ),
        item(
          'format',
          'Accepted format',
          'UTF-8 CSV v1',
          'Formulas, active content, archives, and external references are rejected.',
        ),
        item(
          'validation-result',
          'Validation',
          '1 issue',
          'A locator reference must be supplied by the shell before validation.',
          'validation',
        ),
      ],
      [
        action(
          'validate-source-draft',
          'Validate source draft',
          'draft',
          null,
          'Complete the required locator reference.',
        ),
      ],
    ),
  ],
  { readiness: readiness.slice(1, 3) },
);

const plannedDisplay = model(
  'planned-display',
  'Planned display',
  'Preview only. Date, contact-sheet, frame, and carousel review cannot activate configuration or invoke provider or Calendar writes.',
  'preview-only',
  [workspaceTarget, screenTarget, dateTarget],
  [
    section(
      'selected-frame',
      'Selected frame — Friday, April 13',
      'Frame 2 of 6 · Web Design objective · 8:00 AM',
      'ready',
      [
        item(
          'frame-content',
          'Display content',
          'Today’s objective',
          'Explain a deterministic state transition.',
        ),
        item(
          'frame-basis',
          'Preview basis',
          'Saved draft version 4',
          'Mutation-free preview; effective Revision 7 remains active.',
          'partial',
        ),
        item(
          'frame-freshness',
          'Freshness',
          'Assignments stale',
          'The frame uses the exact retained last-known-good assignment projection.',
          'stale',
        ),
      ],
      [
        action('previous-frame', 'Previous frame', 'preview'),
        action('next-frame', 'Next frame', 'preview'),
        action('open-frame-review', 'Enlarge frame', 'preview'),
      ],
    ),
    section(
      'contact-sheet',
      'Daily contact sheet',
      'Use arrow keys to change selection, Home/End to jump, and Enter or Space to enlarge.',
      'partial',
      [
        item(
          'frame-1',
          '7:55 AM',
          'Coming up',
          'Web Design starts in 5 minutes.',
        ),
        item('frame-2', '8:00 AM', 'Objective', 'Selected frame.'),
        item(
          'frame-3',
          '8:15 AM',
          'Assignment',
          'Synthetic coursework summary.',
        ),
        item(
          'frame-4',
          '8:30 AM',
          'Vocabulary',
          'Idempotent · reviewed translation.',
        ),
        item('frame-5', '8:55 AM', 'Dismissal', 'Five-minute warning.'),
        item('frame-6', '11:00 AM', 'Day complete', 'Next class day summary.'),
      ],
      [
        action('previous-date', 'Previous school date', 'preview'),
        action('select-date', 'Choose date', 'preview'),
        action('next-date', 'Next school date', 'preview'),
      ],
    ),
  ],
  {
    readiness: readiness.slice(1),
    statusAnnouncement:
      'Preview for Friday, April 13 loaded. Frame 2 of 6 selected.',
  },
);

const presentation = model(
  'presentation',
  'Presentation profile',
  'Presentation changes affect treatment only; they never change schedule or source truth.',
  'draft-only',
  [workspaceTarget, screenTarget],
  [
    section(
      'branding-theme',
      'Branding and theme',
      'Use the existing Chalkwright language with a readable installation fallback.',
      'ready',
      [
        item(
          'brand',
          'Display identity',
          'Chalkwright',
          'Synthetic reference branding.',
        ),
        item('theme', 'Theme', 'Slate · sky · warm', 'Contrast check passed.'),
        item(
          'timing',
          'Timing profile',
          'Calm classroom',
          'Long reading holds and explicit transitions.',
        ),
      ],
      [action('save-presentation-draft', 'Save presentation draft', 'draft')],
    ),
    section(
      'language-motion',
      'Language and motion',
      'Only reviewed text is displayed; reduced motion remains equivalent.',
      'ready',
      [
        item('language', 'Interface language', 'English', 'Reviewed catalog.'),
        item(
          'translations',
          'Source-authored translations',
          'Vietnamese · Korean · Chinese',
          'No automatic translation provider is invoked.',
        ),
        item(
          'motion',
          'Reduced motion',
          'Supported',
          'Cross-fades become immediate state changes.',
        ),
      ],
      [action('preview-presentation', 'Preview reduced motion', 'preview')],
    ),
  ],
);

const configuration = model(
  'configuration',
  'Configuration lifecycle',
  'Draft, preview, validation, activation, and rollback are separate optimistic operations.',
  'effective-change',
  [workspaceTarget],
  [
    section(
      'lifecycle',
      'Draft and effective state',
      'The active pointer remains on Revision 7 until an eligible revision activates atomically.',
      'partial',
      [
        item(
          'browser-edits',
          'Unsaved browser edits',
          '1 field',
          'Not yet part of saved draft version 4.',
          'partial',
        ),
        item(
          'saved-draft',
          'Saved draft',
          'Version 4',
          'Based on active Revision 7.',
        ),
        item(
          'eligible-revision',
          'Eligible revision',
          'None',
          'Validate the exact saved draft first.',
          'disabled',
        ),
        item(
          'active-revision',
          'Effective',
          'Revision 7',
          'Last-known-good remains active.',
        ),
      ],
      [
        action('save-draft', 'Save draft', 'draft'),
        action('preview-draft', 'Preview draft', 'preview'),
        action(
          'activate-revision',
          'Activate revision',
          'activate',
          null,
          'Resolve one blocker and validate the saved draft.',
          'review',
        ),
      ],
    ),
    section(
      'history',
      'Revision history',
      'History is immutable, redacted, and bounded to the current workspace.',
      'ready',
      [
        item('revision-7', 'Revision 7', 'Active', 'Activated 2 hours ago.'),
        item(
          'revision-6',
          'Revision 6',
          'Superseded',
          'Eligible rollback target.',
        ),
        item(
          'revision-5',
          'Revision 5',
          'Rolled back',
          'Retained for audit evidence.',
        ),
      ],
      [
        action(
          'roll-back-revision',
          'Review rollback to Revision 6',
          'recovery',
          null,
          null,
          'type-to-confirm',
        ),
      ],
    ),
  ],
  { readiness },
);

const diagnosticsRecovery = model(
  'diagnostics-recovery',
  'Diagnostics and recovery',
  'Evidence is redacted. Import and restore are validated in isolation before any effective-state change.',
  'recovery',
  [workspaceTarget],
  [
    section(
      'diagnostics',
      'Readiness and audit evidence',
      'Finite codes explain state without payloads, secrets, student data, or private references.',
      'degraded',
      [
        item(
          'source-freshness',
          'SRC-STALE',
          'Warning',
          'Assignments use a retained last-known-good projection.',
          'stale',
        ),
        item(
          'last-backup',
          'Protected backup',
          'Verified',
          'Exact workspace and release pairing; protected bytes are not shown.',
        ),
        item(
          'audit-events',
          'Audit history',
          '12 bounded events',
          'Actor, operation, subject, outcome, revision, and time only.',
        ),
      ],
      [
        action(
          'download-redacted-evidence',
          'Download redacted evidence',
          'preview',
        ),
      ],
    ),
    section(
      'portability-recovery',
      'Export, backup, restore, and recovery',
      'Portable export is redacted; protected backup and restore remain separate workflows.',
      'recovery',
      [
        item(
          'portable-export',
          'Configuration export',
          'Ready',
          'Versioned, checksum-bound, and connection-required where protected.',
        ),
        item(
          'restore-preflight',
          'Restore preflight',
          'Not started',
          'Ownership, scope, integrity, compatibility, and isolated restore are required.',
          'disabled',
        ),
        item(
          'release-compatibility',
          'Release compatibility',
          'Exact pair verified',
          'The self-hosted shell owns install, upgrade, and rollback actions.',
        ),
      ],
      [
        action(
          'export-redacted-configuration',
          'Export configuration',
          'preview',
        ),
        action(
          'create-protected-backup',
          'Create protected backup',
          'recovery',
        ),
        action(
          'review-restore-preflight',
          'Review restore preflight',
          'recovery',
          null,
          null,
          'type-to-confirm',
        ),
      ],
    ),
  ],
  { readiness },
);

export const operatorFeatureRegionFixtures = {
  overview,
  displays,
  sources,
  'planned-display': plannedDisplay,
  presentation,
  configuration,
  'diagnostics-recovery': diagnosticsRecovery,
} as const satisfies Readonly<
  Record<OperatorPageKey, OperatorFeatureRegionModel>
>;

export const operatorStateFixtures: Readonly<
  Record<OperatorRegionState, OperatorFeatureRegionModel>
> = Object.fromEntries(
  operatorRegionStates.map((state) => [
    state,
    {
      ...overview,
      state,
      statusAnnouncement: `Synthetic ${state} reference state.`,
      sections: [
        section(
          `state-${state}`,
          `${state.replaceAll('-', ' ')} state`,
          `Synthetic finite ${state} presentation for A07 reference review.`,
          state,
          [
            item(
              `state-${state}-item`,
              'Representative result',
              state,
              'Status meaning is expressed with text and structure, not color alone.',
              state,
            ),
          ],
          state === 'destructive' || state === 'recovery'
            ? [
                action(
                  `review-${state}`,
                  `Review ${state}`,
                  state,
                  null,
                  null,
                  'type-to-confirm',
                ),
              ]
            : [],
        ),
      ],
    },
  ]),
) as unknown as Readonly<
  Record<OperatorRegionState, OperatorFeatureRegionModel>
>;
