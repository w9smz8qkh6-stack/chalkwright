import {
  contractVersion,
  configurationDigest,
  scopeIdentifier,
  stateIdentifier,
  type AuditScope,
  type ConfigurationStateSnapshot,
  type CoreGoal1ExpectedScenario,
  type CoreGoal1FixtureCatalog,
  type CoreGoal1ScenarioObservation,
} from '../../contracts/v1/index.js';
import { VersionedConfigurationService } from './versioned-configuration-service.js';

export type CoreGoal1ConfigurationServiceFactory = (
  state: ConfigurationStateSnapshot,
) => VersionedConfigurationService;

function auditScope(
  catalog: CoreGoal1FixtureCatalog,
  scenario: CoreGoal1ExpectedScenario,
  suffix: string,
): AuditScope {
  return {
    contractVersion,
    workspaceKind: 'self-hosted-installation',
    workspaceId: catalog.workspace.workspaceId,
    installationId: catalog.workspace.installationId,
    actorId: scopeIdentifier('actor', 'actor-synthetic-c01-operator'),
    actorKind: 'self-hosted-operator',
    capability: scopeIdentifier('capability', 'configuration.write'),
    authority: 'operator-reachability',
    targets: [
      { kind: 'workspace', workspaceId: catalog.workspace.workspaceId },
    ],
    operationId: scopeIdentifier(
      'operation',
      `operation-synthetic-${scenario.scenarioId}-${suffix}`,
    ),
    correlationId: scopeIdentifier(
      'correlation',
      `correlation-synthetic-${scenario.scenarioId}`,
    ),
  };
}

function eventId(scenario: CoreGoal1ExpectedScenario, suffix: string) {
  return stateIdentifier(
    'audit-event',
    `audit-event-synthetic-${scenario.scenarioId}-${suffix}`,
  );
}

function unsupported(
  scenario: CoreGoal1ExpectedScenario,
): CoreGoal1ScenarioObservation {
  return {
    scenarioId: scenario.scenarioId,
    actual: { status: 'unsupported-c01-operation' },
  };
}

/**
 * Maps A08's normalized C01 scenarios to the real application service. It is
 * intentionally not an HTTP, fixture-only transition, or persistence bypass.
 */
export function createCoreGoal1ConfigurationScenarioExecutor(
  createService: CoreGoal1ConfigurationServiceFactory,
) {
  return async (
    scenario: CoreGoal1ExpectedScenario,
    catalog: CoreGoal1FixtureCatalog,
  ): Promise<CoreGoal1ScenarioObservation> => {
    const draft = catalog.configurationStates.firstActivated.drafts[0];
    const firstRevision =
      catalog.configurationStates.firstActivated.revisions[0];
    const secondRevision =
      catalog.configurationStates.secondActivated.revisions[1];
    if (
      draft === undefined ||
      firstRevision === undefined ||
      secondRevision === undefined
    ) {
      return unsupported(scenario);
    }

    if (scenario.operation === 'configuration.save-draft') {
      const service = createService(catalog.configurationStates.fresh);
      const result = await service.execute({
        eventId: eventId(scenario, 'save'),
        command: {
          contractVersion,
          kind: 'save-draft',
          workspace: catalog.workspace,
          workspaceId: catalog.workspace.workspaceId,
          expectedStateVersion: catalog.configurationStates.fresh.stateVersion,
          auditScope: auditScope(catalog, scenario, 'save'),
          draftId: draft.draftId,
          expectedDraftVersion: null,
          content: draft.content,
          savedAt: draft.savedAt,
        },
      });
      return {
        scenarioId: scenario.scenarioId,
        actual:
          result.status === 'applied'
            ? {
                status: result.status,
                stateVersion: result.state.stateVersion,
                draftVersion: result.state.drafts[0]?.draftVersion,
              }
            : { status: result.status },
      };
    }

    if (scenario.operation === 'configuration.create-preview') {
      const state = catalog.configurationStates.secondActivated;
      const service = createService(state);
      const result = await service.createPreview({
        eventId: eventId(scenario, 'preview'),
        request: {
          contractVersion,
          workspace: catalog.workspace,
          workspaceId: catalog.workspace.workspaceId,
          expectedStateVersion: state.stateVersion,
          previewId: catalog.preview.previewId,
          basis: catalog.preview.basis,
          targets: catalog.preview.targets,
          status: catalog.preview.status,
          diagnosticCodes: catalog.preview.diagnosticCodes,
          generatedAt: catalog.preview.generatedAt,
          expiresAt: catalog.preview.expiresAt,
          auditScope: auditScope(catalog, scenario, 'preview'),
        },
      });
      const stored = await service.read(catalog.workspace);
      return {
        scenarioId: scenario.scenarioId,
        actual:
          result.status === 'created'
            ? {
                status: result.status,
                effectiveStateVersion:
                  stored.status === 'ready' ? stored.state.stateVersion : -1,
                mutationFree:
                  stored.status === 'ready' &&
                  configurationDigest(stored.state) ===
                    configurationDigest(state),
                previewStatus: result.snapshot.status,
              }
            : { status: result.status },
      };
    }

    if (scenario.operation === 'configuration.activate-revision') {
      const service = createService(catalog.configurationStates.fresh);
      const saved = await service.execute({
        eventId: eventId(scenario, 'save'),
        command: {
          contractVersion,
          kind: 'save-draft',
          workspace: catalog.workspace,
          workspaceId: catalog.workspace.workspaceId,
          expectedStateVersion: 0,
          auditScope: auditScope(catalog, scenario, 'save'),
          draftId: draft.draftId,
          expectedDraftVersion: null,
          content: draft.content,
          savedAt: draft.savedAt,
        },
      });
      if (saved.status !== 'applied') return unsupported(scenario);
      const validated = await service.execute({
        eventId: eventId(scenario, 'validate'),
        command: {
          contractVersion,
          kind: 'validate-draft',
          workspace: catalog.workspace,
          workspaceId: catalog.workspace.workspaceId,
          expectedStateVersion: saved.state.stateVersion,
          auditScope: auditScope(catalog, scenario, 'validate'),
          draftId: draft.draftId,
          expectedDraftVersion: draft.draftVersion,
          revisionId: firstRevision.revisionId,
          validatedAt: firstRevision.validatedAt,
        },
      });
      if (validated.status !== 'applied') return unsupported(scenario);
      const result = await service.execute({
        eventId: eventId(scenario, 'activate'),
        command: {
          contractVersion,
          kind: 'activate-revision',
          workspace: catalog.workspace,
          workspaceId: catalog.workspace.workspaceId,
          expectedStateVersion: validated.state.stateVersion,
          auditScope: auditScope(catalog, scenario, 'activate'),
          expectedActiveRevisionId: null,
          revisionId: firstRevision.revisionId,
          selectedAt:
            catalog.configurationStates.firstActivated.activePointer!
              .selectedAt,
        },
      });
      return {
        scenarioId: scenario.scenarioId,
        actual:
          result.status === 'applied'
            ? {
                status: result.status,
                stateVersion: result.state.stateVersion,
                activeRevisionId: result.state.activePointer?.revisionId,
              }
            : { status: result.status },
      };
    }

    if (scenario.operation === 'configuration.rollback-revision') {
      const state = catalog.configurationStates.secondActivated;
      const service = createService(state);
      const result = await service.execute({
        eventId: eventId(scenario, 'rollback'),
        command: {
          contractVersion,
          kind: 'rollback-revision',
          workspace: catalog.workspace,
          workspaceId: catalog.workspace.workspaceId,
          expectedStateVersion: state.stateVersion,
          auditScope: auditScope(catalog, scenario, 'rollback'),
          expectedActiveRevisionId: secondRevision.revisionId,
          revisionId: firstRevision.revisionId,
          selectedAt:
            catalog.configurationStates.rolledBack.activePointer!.selectedAt,
        },
      });
      return {
        scenarioId: scenario.scenarioId,
        actual:
          result.status === 'applied'
            ? {
                status: result.status,
                stateVersion: result.state.stateVersion,
                activeRevisionId: result.state.activePointer?.revisionId,
              }
            : { status: result.status },
      };
    }

    if (scenario.operation === 'configuration.export-portable') {
      const state = catalog.configurationStates.rolledBack;
      const service = createService(state);
      const result = await service.exportPortable({
        workspace: catalog.workspace,
        expectedStateVersion: state.stateVersion,
        revisionId: firstRevision.revisionId,
        exportId: catalog.portableExport.manifest.exportId,
        createdAt: catalog.portableExport.manifest.createdAt,
        auditScope: auditScope(catalog, scenario, 'export'),
        eventId: eventId(scenario, 'export'),
      });
      return {
        scenarioId: scenario.scenarioId,
        actual:
          result.status === 'created'
            ? {
                status: result.status,
                configurationChecksum: result.artifact.manifest.contentChecksum,
                containsProtectedState:
                  JSON.stringify(result.artifact).includes(
                    'connectionReference',
                  ) ||
                  JSON.stringify(result.artifact).includes('verifierReference'),
              }
            : { status: result.status },
      };
    }

    if (scenario.operation === 'configuration.recovery-preflight') {
      const state = catalog.configurationStates.rolledBack;
      const service = createService(state);
      const result = await service.preflightRecovery({
        workspace: catalog.workspace,
        expectedStateVersion: state.stateVersion,
        manifest: catalog.recoveryBackup,
        observedChecksum: catalog.recoveryBackup.artifact.checksum,
        occurredAt: catalog.recoveryBackup.createdAt,
        auditScope: auditScope(catalog, scenario, 'recovery'),
        eventId: eventId(scenario, 'recovery'),
      });
      return {
        scenarioId: scenario.scenarioId,
        actual:
          result.status === 'accepted'
            ? {
                status: result.status,
                mode: result.mode,
                currentStatePreservedUntilSuccess:
                  result.currentStatePreservedUntilSuccess,
              }
            : { status: result.status },
      };
    }

    return unsupported(scenario);
  };
}
