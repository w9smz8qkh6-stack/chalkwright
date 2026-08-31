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
        : [
            {
              sectionKey: 'capability-summary',
              heading: page.label,
              summary: page.purpose,
              state: available ? ('ready' as const) : ('unavailable' as const),
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
        pageKey === 'planned-display' ? 'preview-only' : 'read-only',
      statusAnnouncement: null,
      readiness,
      sections,
    };
  }
}
