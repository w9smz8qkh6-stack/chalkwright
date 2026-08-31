import {
  contractVersion,
  operatorPanelContractVersion,
  operatorPageCatalog,
  setupProgression,
  type OperatorFeatureAction,
  type OperatorFeatureItem,
  type OperatorFeatureRegionModel,
  type OperatorPageKey,
  type OperatorReadinessSignal,
  type SelfHostedWorkspace,
} from '../../contracts/v1/index.js';
import type { VersionedConfigurationService } from '../configuration/versioned-configuration-service.js';
import type { DisplayConfigurationService } from './display-configuration-service.js';
import type { SourceRegistryService } from './source-registry-service.js';
import type { PlannedDisplayProjectionService } from './planned-display-projection-service.js';

export type CoreOperatorCapabilityStatus = 'available' | 'planned';

export interface CoreOperatorCapability {
  readonly pageKey: OperatorPageKey;
  readonly label: string;
  readonly status: CoreOperatorCapabilityStatus;
  readonly implementationTask: 'C01' | 'C02' | 'C03' | 'C04' | 'C09';
}

export interface CoreOperatorReadiness {
  readonly ready: boolean;
  readonly authority: 'private-reachability';
  readonly workspaceId: string;
  readonly configuration: 'ready' | 'not-configured' | 'unavailable';
}

const implementationTaskByPage = {
  overview: 'C02',
  displays: 'C03',
  sources: 'C04',
  'planned-display': 'C09',
  presentation: 'C02',
  configuration: 'C01',
  'diagnostics-recovery': 'C02',
} as const satisfies Record<
  OperatorPageKey,
  CoreOperatorCapability['implementationTask']
>;

const implementedTasks = new Set<CoreOperatorCapability['implementationTask']>([
  'C01',
  'C02',
  'C03',
  'C04',
  'C09',
]);

function sentenceLabel(value: string): string {
  const sentence = value.replaceAll('-', ' ');
  return `${sentence.slice(0, 1).toUpperCase()}${sentence.slice(1)}`;
}

function item(
  itemKey: string,
  label: string,
  value: string,
  detail: string | null,
  state: OperatorFeatureItem['state'] = 'ready',
): OperatorFeatureItem {
  return { itemKey, label, value, detail, state };
}

function disabledAction(
  actionKey: string,
  reason: string,
): OperatorFeatureAction {
  return {
    actionKey,
    label: sentenceLabel(actionKey),
    intent: 'navigate',
    targetPage: null,
    resource: null,
    disabledReason: reason,
    confirmation: 'none',
  };
}

/**
 * Read-only C02 application boundary. It consumes C01 state and A07 contracts,
 * but contains no HTTP routes, document markup, account authority, or adapters.
 */
export class CoreOperatorShellService {
  constructor(
    readonly workspace: SelfHostedWorkspace,
    readonly configuration: VersionedConfigurationService,
    readonly displays: DisplayConfigurationService,
    readonly sources?: SourceRegistryService,
    readonly plannedDisplays?: PlannedDisplayProjectionService,
  ) {}

  discoverCapabilities(): readonly CoreOperatorCapability[] {
    return operatorPageCatalog.map((page) => {
      const implementationTask = implementationTaskByPage[page.key];
      return {
        pageKey: page.key,
        label: page.label,
        status: implementedTasks.has(implementationTask)
          ? ('available' as const)
          : ('planned' as const),
        implementationTask,
      };
    });
  }

  async readiness(): Promise<CoreOperatorReadiness> {
    const effective = await this.configuration.readEffectiveConfiguration(
      this.workspace,
    );
    if (effective.status === 'ready') {
      return {
        ready: true,
        authority: 'private-reachability',
        workspaceId: this.workspace.workspaceId,
        configuration: 'ready',
      };
    }
    if (effective.status === 'not-configured') {
      return {
        ready: true,
        authority: 'private-reachability',
        workspaceId: this.workspace.workspaceId,
        configuration: 'not-configured',
      };
    }
    return {
      ready: false,
      authority: 'private-reachability',
      workspaceId: this.workspace.workspaceId,
      configuration: 'unavailable',
    };
  }

  async page(pageKey: OperatorPageKey): Promise<OperatorFeatureRegionModel> {
    const page = operatorPageCatalog.find(
      (candidate) => candidate.key === pageKey,
    );
    if (page === undefined) throw new TypeError('Unknown operator page.');
    const read = await this.configuration.read(this.workspace);
    const implementationTask = implementationTaskByPage[pageKey];
    const available = implementedTasks.has(implementationTask);
    const stateVersion =
      read.status === 'ready' ? read.state.stateVersion : null;
    const activeRevision =
      read.status === 'ready'
        ? (read.state.activePointer?.revisionId ?? null)
        : null;
    const displayProjection =
      pageKey === 'displays' ? await this.displays.project() : null;
    const sourceProjection =
      pageKey === 'sources' && this.sources !== undefined
        ? await this.sources.project()
        : null;
    const plannedSelection =
      pageKey === 'planned-display'
        ? (this.plannedDisplays?.defaultSelection() ?? null)
        : null;
    const plannedProjection =
      plannedSelection !== null && this.plannedDisplays !== undefined
        ? await this.plannedDisplays.project(plannedSelection)
        : null;
    const readiness: OperatorReadinessSignal[] = [
      {
        signalKey: 'private-operator-boundary',
        level: 'ready',
        summary: 'Private operator boundary active',
        detail:
          'Reachability grants operator authority for this installation; no account or login is involved.',
        blocksActivation: false,
        sourcePage: 'overview',
        nextActionKey: null,
      },
      ...(read.status === 'ready'
        ? [
            {
              signalKey: 'configuration-state-readable',
              level: 'ready' as const,
              summary: 'Configuration state is readable',
              detail:
                activeRevision === null
                  ? 'The versioned store is available; no revision is active yet.'
                  : 'The active last-known-good revision remains available.',
              blocksActivation: false,
              sourcePage: 'configuration' as const,
              nextActionKey: null,
            },
          ]
        : [
            {
              signalKey: 'configuration-state-unavailable',
              level: 'blocker' as const,
              summary: 'Configuration state is unavailable',
              detail:
                'The operator shell remains isolated, but configuration state cannot be safely read.',
              blocksActivation: true,
              sourcePage: 'configuration' as const,
              nextActionKey: null,
            },
          ]),
      ...(!available
        ? [
            {
              signalKey: `${pageKey}-implementation-planned`,
              level: 'information' as const,
              summary: `${page.label} capability is planned`,
              detail: `${implementationTask} owns this capability; C02 exposes its stable location without implementing it early.`,
              blocksActivation: false,
              sourcePage: pageKey,
              nextActionKey: null,
            },
          ]
        : []),
      ...(displayProjection === null
        ? []
        : displayProjection.blockers.length === 0
          ? [
              {
                signalKey: 'display-configuration-ready',
                level: 'ready' as const,
                summary: 'Display configuration is ready',
                detail:
                  'Timezone, rooms, screens, and display references are available from the active last-known-good revision.',
                blocksActivation: false,
                sourcePage: 'displays' as const,
                nextActionKey: null,
              },
              ...displayProjection.warnings.map((code) => ({
                signalKey: code,
                level: 'warning' as const,
                summary: 'Viewer admission is not active',
                detail:
                  'The screen remains configured, but viewers need a newly rotated class code before admission is available.',
                blocksActivation: false,
                sourcePage: 'displays' as const,
                nextActionKey: 'rotate-class-code',
              })),
            ]
          : displayProjection.blockers.map((code) => ({
              signalKey: code,
              level: 'blocker' as const,
              summary: 'Display configuration needs attention',
              detail:
                'A required timezone, room, screen, or display reference is unavailable. The active revision is unchanged.',
              blocksActivation: true,
              sourcePage: 'displays' as const,
              nextActionKey: 'save-screen-draft',
            }))),
    ];

    const sections =
      pageKey === 'overview'
        ? [
            {
              sectionKey: 'setup-progress',
              heading: 'Setup progression',
              summary:
                'The stable Core sequence remains visible while later capabilities are implemented.',
              state: 'partial' as const,
              items: setupProgression.map((stage, index) =>
                item(
                  stage.key,
                  stage.label,
                  index === 0 ? 'Available' : 'Planned',
                  stage.completion,
                  index === 0 ? 'ready' : 'disabled',
                ),
              ),
              actions: [],
            },
            {
              sectionKey: 'configuration-continuity',
              heading: 'Configuration continuity',
              summary:
                'C01 state is inspected without changing the active revision.',
              state:
                read.status === 'ready'
                  ? ('ready' as const)
                  : ('unavailable' as const),
              items: [
                item(
                  'state-version',
                  'State version',
                  stateVersion === null ? 'Unavailable' : String(stateVersion),
                  'Reading the shell does not advance this version.',
                  stateVersion === null ? 'unavailable' : 'ready',
                ),
                item(
                  'active-revision',
                  'Effective revision',
                  activeRevision ?? 'Not configured',
                  'Draft and preview work cannot replace this pointer.',
                  activeRevision === null ? 'empty' : 'ready',
                ),
              ],
              actions: [],
            },
          ]
        : pageKey === 'displays' && displayProjection !== null
          ? [
              {
                sectionKey: 'installation-timezone',
                heading: 'Installation timezone',
                summary:
                  'School-day calculations use the timezone in the active last-known-good revision.',
                state:
                  displayProjection.timeZone === null
                    ? ('unavailable' as const)
                    : ('ready' as const),
                items: [
                  item(
                    'timezone',
                    'IANA timezone',
                    displayProjection.timeZone ?? 'Not configured',
                    'Draft changes do not affect the display until an eligible revision is activated.',
                    displayProjection.timeZone === null ? 'empty' : 'ready',
                  ),
                ],
                actions: [],
              },
              ...displayProjection.rooms.map((room) => ({
                sectionKey: `room-${room.roomId}`,
                heading: room.label,
                summary: `${room.screens.length} configured screen${room.screens.length === 1 ? '' : 's'} in this room.`,
                state: 'ready' as const,
                items: room.screens.flatMap((screen) => [
                  item(
                    `screen-${screen.screenId}`,
                    screen.label,
                    screen.enabled ? 'Enabled' : 'Disabled',
                    `Screen reference: ${screen.screenId}`,
                    screen.enabled ? 'ready' : 'disabled',
                  ),
                  item(
                    `display-reference-${screen.screenId}`,
                    'Display URL',
                    screen.displayReference,
                    'This low-privilege ingress is separate from the private operator listener.',
                  ),
                  item(
                    `class-code-${screen.screenId}`,
                    'Viewer class code',
                    screen.classCodeState === 'active'
                      ? `Active · verifier ${screen.verifierVersion}`
                      : screen.classCodeState === 'revoked'
                        ? `Revoked · verifier ${screen.verifierVersion}`
                        : 'Not configured',
                    'The verifier is slowly hashed. A plaintext code is shown only once after rotation.',
                    screen.classCodeState === 'active' ? 'ready' : 'recovery',
                  ),
                ]),
                actions: [],
              })),
            ]
          : pageKey === 'sources' && sourceProjection !== null
            ? [
                {
                  sectionKey: 'manual-source-registry',
                  heading: 'Manual source registry',
                  summary:
                    'Teacher-entered source definitions are saved as a draft. No upload, URL fetch, provider connection, or parser runs here.',
                  state:
                    sourceProjection.status === 'ready'
                      ? ('ready' as const)
                      : ('unavailable' as const),
                  items:
                    sourceProjection.entries.length === 0
                      ? [
                          item(
                            'manual-source-empty',
                            'No manual sources recorded',
                            'Start with a course and stream',
                            'Choose an application-managed stream below; the form can optionally map it to one configured screen.',
                            'empty',
                          ),
                        ]
                      : sourceProjection.entries.map((entry) =>
                          item(
                            `source-${entry.sourceId}`,
                            `${entry.courseLabel} · ${entry.stream}`,
                            'Application-managed',
                            `Provenance: ${entry.provenance}; freshness: ${entry.freshness}; validation: ${entry.validation}.${entry.screenId === null ? ' No screen mapping.' : ` Mapped to ${entry.screenId}.`}`,
                          ),
                        ),
                  actions: [],
                },
              ]
            : pageKey === 'planned-display'
              ? [
                  {
                    sectionKey: 'projection-basis',
                    heading: 'Planned-display projection',
                    summary:
                      'This review is derived only from the selected configuration basis and injected normalized frames. It cannot acquire data or change configuration, Calendar, or provider state.',
                    state:
                      plannedProjection?.status === 'ready'
                        ? ('ready' as const)
                        : plannedProjection?.status === 'empty'
                          ? ('empty' as const)
                          : ('unavailable' as const),
                    items:
                      plannedProjection === null
                        ? [
                            item(
                              'planned-display-empty',
                              'No projected frame set is available',
                              'Select a configured screen and date once a normalized fixture set is supplied.',
                              'C09 does not fetch or create display content; C10 will add review controls around accepted projections.',
                              'empty',
                            ),
                          ]
                        : [
                            item(
                              'projection-status',
                              'Projection status',
                              plannedProjection.status,
                              `Basis revision: ${plannedProjection.basisRevisionId ?? 'not configured'}; freshness: ${plannedProjection.freshness}; cache: ${plannedProjection.cacheDisposition}.`,
                              plannedProjection.status === 'ready'
                                ? 'ready'
                                : plannedProjection.status === 'empty'
                                  ? 'empty'
                                  : 'unavailable',
                            ),
                            ...plannedProjection.frames.map((frame) =>
                              item(
                                `planned-frame-${frame.frameId}`,
                                `Frame ${frame.sequence} · ${frame.state}`,
                                frame.screenId === plannedProjection.screenId
                                  ? 'Selected screen'
                                  : 'Same school-date review',
                                `Date: ${frame.schoolDate}; media references: ${frame.mediaIds.length}; projection is mutation-free.`,
                              ),
                            ),
                          ],
                    actions: [],
                  },
                ]
              : [
                  {
                    sectionKey: 'capability-summary',
                    heading: page.label,
                    summary: page.purpose,
                    state: available
                      ? ('ready' as const)
                      : ('unavailable' as const),
                    items: page.informationHierarchy.map((heading, index) =>
                      item(
                        `capability-${index + 1}`,
                        heading,
                        available
                          ? 'Available in this shell'
                          : `Planned in ${implementationTask}`,
                        available
                          ? 'Rendered from the accepted Core contract without account or provider authority.'
                          : 'The stable page is present, but this capability remains intentionally inactive.',
                        available ? 'ready' : 'disabled',
                      ),
                    ),
                    actions: available
                      ? []
                      : page.primaryActions.map((actionKey) =>
                          disabledAction(
                            actionKey,
                            `${implementationTask} must be completed before this action is available.`,
                          ),
                        ),
                  },
                ];

    return {
      contractVersion,
      operatorPanelContractVersion,
      recordKind: 'operator-feature-region',
      regionKey: 'core-operator-panel',
      workspace: this.workspace,
      targets: [{ kind: 'workspace', workspaceId: this.workspace.workspaceId }],
      pageKey,
      title: page.label,
      guidance: page.guidanceIntent,
      state:
        read.status !== 'ready'
          ? 'unavailable'
          : available
            ? pageKey === 'overview'
              ? 'partial'
              : 'ready'
            : 'disabled',
      mutationBoundary:
        pageKey === 'planned-display'
          ? 'preview-only'
          : pageKey === 'displays'
            ? 'draft-only'
            : pageKey === 'sources'
              ? 'draft-only'
              : 'read-only',
      statusAnnouncement: null,
      readiness,
      sections,
    };
  }
}
