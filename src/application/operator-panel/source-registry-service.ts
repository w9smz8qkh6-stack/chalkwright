import {
  contractVersion,
  isExactWorkspace,
  scopeIdentifier,
  stateIdentifier,
  sourceModeAvailability,
  type AuditScope,
  type EditableConfiguration,
  type ScreenId,
  type SelfHostedWorkspace,
  type SourceMode,
  type SourceStream,
  type Workspace,
} from '../../contracts/v1/index.js';
import type { VersionedConfigurationService } from '../configuration/versioned-configuration-service.js';

export interface SourceRegistryEntry {
  readonly sourceId: string;
  readonly stream: SourceStream;
  readonly mode: SourceMode;
  readonly courseLabel: string;
  readonly screenId: ScreenId | null;
  readonly provenance: 'teacher-entered';
  readonly freshness: 'managed-revision';
  readonly validation: 'definition-recorded';
}

export interface SourceRegistryProjection {
  readonly status: 'ready' | 'not-configured' | 'unavailable';
  readonly entries: readonly SourceRegistryEntry[];
  readonly availableModes: readonly {
    readonly stream: SourceStream;
    readonly mode: SourceMode;
    readonly disposition: string;
  }[];
  readonly screens: readonly {
    readonly screenId: ScreenId;
    readonly label: string;
  }[];
}

export type SaveManualSourceResult =
  | { readonly status: 'saved'; readonly draftVersion: number }
  | { readonly status: 'conflict' }
  | { readonly status: 'rejected'; readonly reason: string };

function stamp(now: () => Date): string {
  return now().toISOString();
}
function slug(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48);
}

/**
 * C04 records only teacher-entered source definitions. It deliberately does
 * not fetch, parse, upload, or connect to a provider; those effects begin in
 * C05-C08. The small mapping projection is synthetic/in-memory until a later
 * durable composition task binds it to production storage.
 */
export class SourceRegistryService {
  #sequence = 0;
  #entries = new Map<string, SourceRegistryEntry>();

  constructor(
    readonly workspace: SelfHostedWorkspace,
    readonly configuration: VersionedConfigurationService,
    readonly now: () => Date = () => new Date(),
  ) {}

  async project(): Promise<SourceRegistryProjection> {
    const effective = await this.configuration.readEffectiveConfiguration(
      this.workspace,
    );
    const modes = sourceModeAvailability.flatMap((availability) =>
      (Object.entries(availability.modes) as [SourceMode, string][]).map(
        ([mode, disposition]) => ({
          stream: availability.stream,
          mode,
          disposition,
        }),
      ),
    );
    if (effective.status === 'not-configured')
      return {
        status: 'not-configured',
        entries: [],
        availableModes: modes,
        screens: [],
      };
    if (
      effective.status !== 'ready' ||
      !isExactWorkspace(effective.configuration.workspace, this.workspace)
    ) {
      return {
        status: 'unavailable',
        entries: [],
        availableModes: modes,
        screens: [],
      };
    }
    const screens = effective.configuration.screens.map((screen) => ({
      screenId: screen.screenId,
      label: screen.label,
    }));
    return {
      status: 'ready',
      entries: [...this.#entries.values()],
      availableModes: modes,
      screens,
    };
  }

  async saveManualSource(input: {
    readonly stream: string;
    readonly courseLabel: string;
    readonly screenId?: string;
  }): Promise<SaveManualSourceResult> {
    if (!sourceModeAvailability.some((entry) => entry.stream === input.stream))
      return { status: 'rejected', reason: 'stream-invalid' };
    const stream = input.stream as SourceStream;
    const courseLabel = input.courseLabel.trim();
    if (
      courseLabel.length < 1 ||
      courseLabel.length > 120 ||
      slug(courseLabel) === ''
    )
      return { status: 'rejected', reason: 'course-label-invalid' };
    const read = await this.configuration.read(this.workspace);
    if (read.status !== 'ready')
      return { status: 'rejected', reason: 'configuration-unavailable' };
    const existingDraft = read.state.drafts.at(-1);
    const active = read.state.revisions.find(
      (revision) =>
        revision.revisionId === read.state.activePointer?.revisionId,
    );
    const base = existingDraft?.content ?? active?.content;
    if (base === undefined || !isExactWorkspace(base.workspace, this.workspace))
      return { status: 'rejected', reason: 'configuration-unavailable' };
    const screenId =
      input.screenId === undefined || input.screenId === ''
        ? null
        : (base.screens.find((screen) => screen.screenId === input.screenId)
            ?.screenId ?? null);
    if (
      input.screenId !== undefined &&
      input.screenId !== '' &&
      screenId === null
    )
      return { status: 'rejected', reason: 'screen-not-found' };
    this.#sequence += 1;
    const sourceId = scopeIdentifier(
      'resource',
      `source-c04-${slug(courseLabel)}-${this.#sequence}`,
    );
    const content: EditableConfiguration = {
      ...structuredClone(base),
      sources: [
        ...base.sources,
        {
          workspaceId: this.workspace.workspaceId,
          sourceId,
          sourceKind: scopeIdentifier('resource-kind', `source-kind-${stream}`),
          enabled: true,
          definitionReference: scopeIdentifier(
            'resource',
            `source-definition-c04-${this.#sequence}`,
          ),
          mode: 'application-managed' as const,
        },
      ].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    };
    const auditScope: AuditScope = {
      contractVersion,
      workspaceKind: 'self-hosted-installation',
      workspaceId: this.workspace.workspaceId,
      installationId: this.workspace.installationId,
      actorId: scopeIdentifier('actor', 'actor-c04-private-operator'),
      actorKind: 'self-hosted-operator',
      capability: scopeIdentifier('capability', 'configuration.write'),
      authority: 'operator-reachability',
      targets: [{ kind: 'workspace', workspaceId: this.workspace.workspaceId }],
      operationId: scopeIdentifier(
        'operation',
        `operation-c04-save-source-${this.#sequence}`,
      ),
      correlationId: scopeIdentifier(
        'correlation',
        `correlation-c04-save-source-${this.#sequence}`,
      ),
    };
    const result = await this.configuration.execute({
      eventId: stateIdentifier(
        'audit-event',
        `audit-event-c04-save-source-${this.#sequence}`,
      ),
      command: {
        contractVersion,
        kind: 'save-draft',
        workspace: this.workspace,
        workspaceId: this.workspace.workspaceId,
        expectedStateVersion: read.state.stateVersion,
        auditScope,
        draftId:
          existingDraft?.draftId ??
          stateIdentifier(
            'configuration-draft',
            'configuration-draft-c04-sources',
          ),
        expectedDraftVersion: existingDraft?.draftVersion ?? null,
        content,
        savedAt: stamp(this.now) as never,
      },
    });
    if (result.status === 'conflict') return { status: 'conflict' };
    if (result.status === 'rejected')
      return { status: 'rejected', reason: result.reason };
    this.#entries.set(sourceId, {
      sourceId,
      stream,
      mode: 'application-managed',
      courseLabel,
      screenId,
      provenance: 'teacher-entered',
      freshness: 'managed-revision',
      validation: 'definition-recorded',
    });
    return {
      status: 'saved',
      draftVersion: result.state.drafts.at(-1)?.draftVersion ?? 0,
    };
  }
}
