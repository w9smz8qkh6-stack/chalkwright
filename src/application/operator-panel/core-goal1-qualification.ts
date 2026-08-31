import {
  configurationDigest,
  contractVersion,
  scopeIdentifier,
  stateIdentifier,
  type AuditScope,
  type CoreGoal1FixtureCatalog,
  type ScreenId,
} from '../../contracts/v1/index.js';
import { VersionedConfigurationService } from '../configuration/versioned-configuration-service.js';
import { InMemoryConfigurationStateRepository } from '../../infrastructure/memory/configuration-state.js';
import { InMemoryDisplayAccessRepository } from '../../infrastructure/memory/display-access.js';
import { DisplayConfigurationService } from './display-configuration-service.js';
import { PlannedDisplayProjectionService } from './planned-display-projection-service.js';
import { SourceRegistryService } from './source-registry-service.js';

export interface CoreGoal1QualificationEvidence {
  readonly status: 'qualified';
  readonly selfHostedOnly: true;
  readonly connectedProviderRequired: false;
  readonly commercialFrameworkRequired: false;
  readonly liveEffects: false;
  readonly operatorBoundary: 'private-reachability';
  readonly draft: {
    readonly timezoneRecorded: true;
    readonly roomAndScreenRecorded: true;
    readonly manualSourceMapped: true;
  };
  readonly preview: {
    readonly status: 'created';
    readonly mutationFree: true;
    readonly frameCount: number;
  };
  readonly activation: {
    readonly activated: true;
    readonly rolledBack: true;
  };
  readonly continuity: {
    readonly portableExportRedacted: true;
    readonly recoveryPreflightAccepted: true;
  };
  readonly displayAccess: {
    readonly classCodeRotated: true;
    readonly publicViewerRouteComposed: false;
  };
}

function auditScope(
  catalog: CoreGoal1FixtureCatalog,
  operation: string,
): AuditScope {
  return {
    contractVersion,
    workspaceKind: 'self-hosted-installation',
    workspaceId: catalog.workspace.workspaceId,
    installationId: catalog.workspace.installationId,
    actorId: scopeIdentifier('actor', 'actor-synthetic-c10-non-creator'),
    actorKind: 'self-hosted-operator',
    capability: scopeIdentifier('capability', 'configuration.write'),
    authority: 'operator-reachability',
    targets: [
      { kind: 'workspace', workspaceId: catalog.workspace.workspaceId },
    ],
    operationId: scopeIdentifier(
      'operation',
      `operation-synthetic-c10-${operation}`,
    ),
    correlationId: scopeIdentifier(
      'correlation',
      `correlation-synthetic-c10-${operation}`,
    ),
  };
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

/**
 * C10's disposable non-creator rehearsal composes the real C01-C04 and C09
 * services. It has no HTTP listener, provider, account, storage, or display
 * route authority; the HTTP isolation assertion belongs to its integration test.
 */
export async function qualifyCoreGoal1NonCreator(
  catalog: CoreGoal1FixtureCatalog,
): Promise<CoreGoal1QualificationEvidence> {
  const now = () => new Date('2035-03-18T10:00:00.000Z');
  const configuration = new VersionedConfigurationService(
    new InMemoryConfigurationStateRepository([
      structuredClone(catalog.configurationStates.firstActivated),
    ]),
  );
  const displays = new DisplayConfigurationService(
    catalog.workspace,
    configuration,
    new InMemoryDisplayAccessRepository(),
    'https://display.synthetic.invalid',
    now,
  );
  const sources = new SourceRegistryService(
    catalog.workspace,
    configuration,
    now,
  );

  const displayDraft = await displays.saveDisplayDraft({
    timeZone: 'Asia/Ho_Chi_Minh',
    roomLabel: 'Synthetic Annex',
    screenLabel: 'Synthetic Annex Display',
  });
  if (displayDraft.status !== 'saved')
    throw new Error('c10-display-draft-failed');

  const source = await sources.saveManualSource({
    stream: 'schedule-bells',
    courseLabel: 'Synthetic Noncreator Planning',
    screenId: catalog.screens[0]!.screenId,
  });
  if (source.status !== 'saved') throw new Error('c10-manual-source-failed');

  const saved = await configuration.read(catalog.workspace);
  if (saved.status !== 'ready') throw new Error('c10-state-unreadable');
  const draft = required(saved.state.drafts.at(-1), 'c10-draft-missing');
  const originalRevision = required(
    saved.state.activePointer?.revisionId,
    'c10-original-revision-missing',
  );
  const annexScreen = required(
    draft.content.screens.find(
      (screen) => screen.label === 'Synthetic Annex Display',
    ),
    'c10-screen-not-recorded',
  );
  if (
    draft.content.timePolicy.timeZone !== 'Asia/Ho_Chi_Minh' ||
    !draft.content.rooms.some((room) => room.label === 'Synthetic Annex') ||
    !draft.content.sources.some(
      (entry) =>
        entry.sourceId === 'source-c04-synthetic-noncreator-planning-1',
    )
  ) {
    throw new Error('c10-draft-content-missing');
  }

  const candidateRevision = stateIdentifier(
    'configuration-revision',
    'revision-synthetic-c10-non-creator',
  );
  const validated = await configuration.execute({
    eventId: stateIdentifier(
      'audit-event',
      'audit-event-synthetic-c10-validate',
    ),
    command: {
      contractVersion,
      kind: 'validate-draft',
      workspace: catalog.workspace,
      workspaceId: catalog.workspace.workspaceId,
      expectedStateVersion: saved.state.stateVersion,
      auditScope: auditScope(catalog, 'validate'),
      draftId: draft.draftId,
      expectedDraftVersion: draft.draftVersion,
      revisionId: candidateRevision,
      validatedAt: now().toISOString() as never,
    },
  });
  if (validated.status !== 'applied') throw new Error('c10-validation-failed');
  const candidate = required(
    validated.state.revisions.find(
      (revision) => revision.revisionId === candidateRevision,
    ),
    'c10-candidate-revision-missing',
  );

  const beforePreview = configurationDigest(validated.state);
  const preview = await configuration.createPreview({
    eventId: stateIdentifier(
      'audit-event',
      'audit-event-synthetic-c10-preview',
    ),
    request: {
      contractVersion,
      workspace: catalog.workspace,
      workspaceId: catalog.workspace.workspaceId,
      expectedStateVersion: validated.state.stateVersion,
      previewId: stateIdentifier(
        'preview',
        'preview-synthetic-c10-non-creator',
      ),
      basis: {
        kind: 'revision',
        revisionId: candidateRevision,
        contentChecksum: candidate.contentChecksum,
      },
      targets: [
        {
          kind: 'screen',
          workspaceId: catalog.workspace.workspaceId,
          roomId: catalog.screens[0]!.roomId,
          screenId: catalog.screens[0]!.screenId,
        },
        {
          kind: 'date',
          workspaceId: catalog.workspace.workspaceId,
          date: catalog.manualSchedule.schoolDate,
        },
      ],
      status: 'ready',
      diagnosticCodes: [],
      generatedAt: now().toISOString() as never,
      expiresAt: '2035-03-18T10:15:00.000Z',
      auditScope: auditScope(catalog, 'preview'),
    },
  });
  const afterPreview = await configuration.read(catalog.workspace);
  if (
    preview.status !== 'created' ||
    afterPreview.status !== 'ready' ||
    configurationDigest(afterPreview.state) !== beforePreview
  ) {
    throw new Error('c10-preview-continuity-failed');
  }

  const activated = await configuration.execute({
    eventId: stateIdentifier(
      'audit-event',
      'audit-event-synthetic-c10-activate',
    ),
    command: {
      contractVersion,
      kind: 'activate-revision',
      workspace: catalog.workspace,
      workspaceId: catalog.workspace.workspaceId,
      expectedStateVersion: afterPreview.state.stateVersion,
      auditScope: auditScope(catalog, 'activate'),
      expectedActiveRevisionId: originalRevision,
      revisionId: candidateRevision,
      selectedAt: now().toISOString() as never,
    },
  });
  if (activated.status !== 'applied') throw new Error('c10-activation-failed');

  const planned = new PlannedDisplayProjectionService(
    catalog.workspace,
    configuration,
    catalog.plannedFrames,
    now,
    candidateRevision,
  );
  const frames = await planned.project({
    schoolDate: catalog.manualSchedule.schoolDate,
    screenId: catalog.screens[0]!.screenId,
  });
  if (frames.status !== 'ready' || !frames.mutationFree) {
    throw new Error('c10-planned-display-failed');
  }

  const rotated = await displays.rotateClassCode(
    annexScreen.screenId as ScreenId,
  );
  if (rotated.status !== 'rotated') throw new Error('c10-class-code-failed');

  const exportResult = await configuration.exportPortable({
    workspace: catalog.workspace,
    expectedStateVersion: activated.state.stateVersion,
    revisionId: candidateRevision,
    exportId: stateIdentifier(
      'portable-export',
      'export-synthetic-c10-non-creator',
    ),
    createdAt: now().toISOString() as never,
    auditScope: auditScope(catalog, 'export'),
    eventId: stateIdentifier('audit-event', 'audit-event-synthetic-c10-export'),
  });
  if (
    exportResult.status !== 'created' ||
    /"(?:classCode|verifierReference|connectionReference)"/u.test(
      JSON.stringify(exportResult.artifact),
    )
  ) {
    throw new Error('c10-export-redaction-failed');
  }

  const recovery = await configuration.preflightRecovery({
    workspace: catalog.workspace,
    expectedStateVersion: activated.state.stateVersion,
    manifest: catalog.recoveryBackup,
    observedChecksum: catalog.recoveryBackup.artifact.checksum,
    occurredAt: now().toISOString() as never,
    auditScope: auditScope(catalog, 'recovery'),
    eventId: stateIdentifier(
      'audit-event',
      'audit-event-synthetic-c10-recovery',
    ),
  });
  if (recovery.status !== 'accepted')
    throw new Error('c10-recovery-preflight-failed');

  const current = await configuration.read(catalog.workspace);
  if (current.status !== 'ready')
    throw new Error('c10-state-before-rollback-unreadable');
  const rolledBack = await configuration.execute({
    eventId: stateIdentifier(
      'audit-event',
      'audit-event-synthetic-c10-rollback',
    ),
    command: {
      contractVersion,
      kind: 'rollback-revision',
      workspace: catalog.workspace,
      workspaceId: catalog.workspace.workspaceId,
      expectedStateVersion: current.state.stateVersion,
      auditScope: auditScope(catalog, 'rollback'),
      expectedActiveRevisionId: candidateRevision,
      revisionId: originalRevision,
      selectedAt: now().toISOString() as never,
    },
  });
  if (
    rolledBack.status !== 'applied' ||
    rolledBack.state.activePointer?.revisionId !== originalRevision
  ) {
    throw new Error('c10-rollback-failed');
  }

  return {
    status: 'qualified',
    selfHostedOnly: true,
    connectedProviderRequired: false,
    commercialFrameworkRequired: false,
    liveEffects: false,
    operatorBoundary: 'private-reachability',
    draft: {
      timezoneRecorded: true,
      roomAndScreenRecorded: true,
      manualSourceMapped: true,
    },
    preview: {
      status: 'created',
      mutationFree: true,
      frameCount: frames.frames.length,
    },
    activation: { activated: true, rolledBack: true },
    continuity: {
      portableExportRedacted: true,
      recoveryPreflightAccepted: true,
    },
    displayAccess: { classCodeRotated: true, publicViewerRouteComposed: false },
  };
}
