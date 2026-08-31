import {
  contractVersion,
  createConfigurationPreview,
  createPortableConfigurationExport,
  evaluateProtectedRestore,
  isAuditScope,
  isAuditScopeForWorkspace,
  isConfigurationStateSnapshot,
  isExactWorkspace,
  scopeIdentifier,
  stateIdentifier,
  transitionConfigurationState,
  type ConfigurationAuditAction,
  type ConfigurationAuditEvent,
  type ConfigurationAuditEventId,
  type ConfigurationCommand,
  type ConfigurationPreviewResult,
  type ConfigurationRevisionId,
  type ConfigurationStateSnapshot,
  type ConfigurationTransitionResult,
  type CreateConfigurationPreviewRequest,
  type IsoInstant,
  type PortableConfigurationContent,
  type PortableConfigurationExport,
  type PortableExportId,
  type ProtectedBackupManifest,
  type Sha256Digest,
  type Workspace,
  type WorkspaceId,
} from '../../contracts/v1/index.js';
import type { AuditScope, ResourceId } from '../../contracts/v1/workspace.js';
import type { ConfigurationStateRepository } from '../../ports/configuration-state.js';

export type ConfigurationReadResult =
  | {
      readonly status: 'ready';
      readonly state: ConfigurationStateSnapshot;
    }
  | { readonly status: 'not-found' }
  | { readonly status: 'rejected'; readonly reason: 'invalid-stored-state' };

export type EffectiveConfigurationResult =
  | {
      readonly status: 'ready';
      readonly stateVersion: number;
      readonly revisionId: ConfigurationRevisionId;
      readonly contentChecksum: Sha256Digest;
      readonly configuration: PortableConfigurationContent;
    }
  | { readonly status: 'not-configured'; readonly stateVersion: number }
  | { readonly status: 'not-found' }
  | { readonly status: 'rejected'; readonly reason: 'invalid-stored-state' };

export interface AuditedConfigurationCommand {
  readonly eventId: ConfigurationAuditEventId;
  readonly command: ConfigurationCommand;
}

export interface AuditedConfigurationPreview {
  readonly eventId: ConfigurationAuditEventId;
  readonly request: CreateConfigurationPreviewRequest;
}

export interface PortableConfigurationExportRequest {
  readonly workspace: Workspace;
  readonly expectedStateVersion: number;
  readonly revisionId: ConfigurationRevisionId;
  readonly exportId: PortableExportId;
  readonly createdAt: IsoInstant;
  readonly auditScope: AuditScope;
  readonly eventId: ConfigurationAuditEventId;
}

export type PortableConfigurationExportResult =
  | {
      readonly status: 'created';
      readonly state: ConfigurationStateSnapshot;
      readonly artifact: PortableConfigurationExport;
    }
  | {
      readonly status: 'conflict';
      readonly reason: 'state-version-changed';
      readonly state: ConfigurationStateSnapshot;
    }
  | {
      readonly status: 'rejected';
      readonly reason:
        | 'invalid-request'
        | 'workspace-mismatch'
        | 'revision-not-found'
        | 'revision-not-active';
      readonly state: ConfigurationStateSnapshot;
    };

export interface ConfigurationRecoveryPreflightRequest {
  readonly workspace: Workspace;
  readonly expectedStateVersion: number;
  readonly manifest: ProtectedBackupManifest;
  readonly observedChecksum: Sha256Digest;
  readonly occurredAt: IsoInstant;
  readonly auditScope: AuditScope;
  readonly eventId: ConfigurationAuditEventId;
}

export type ConfigurationRecoveryPreflightResult =
  | {
      readonly status: 'accepted';
      readonly workspaceId: WorkspaceId;
      readonly state: ConfigurationStateSnapshot;
      readonly mode: 'exact-workspace-isolated';
      readonly currentStatePreservedUntilSuccess: true;
    }
  | {
      readonly status: 'conflict';
      readonly reason: 'state-version-changed';
      readonly state: ConfigurationStateSnapshot;
    }
  | {
      readonly status: 'rejected';
      readonly reason:
        | 'invalid-request'
        | 'invalid-artifact'
        | 'workspace-mismatch'
        | 'checksum-mismatch';
      readonly state: ConfigurationStateSnapshot;
    };

function subjectReference(value: string): ResourceId {
  return scopeIdentifier('resource', value);
}

function commandOccurredAt(command: ConfigurationCommand): IsoInstant {
  if (command.kind === 'save-draft') return command.savedAt;
  if (command.kind === 'validate-draft') return command.validatedAt;
  return command.selectedAt;
}

function commandAuditFields(command: ConfigurationCommand): {
  action: ConfigurationAuditAction;
  subjectKind: ConfigurationAuditEvent['subjectKind'];
  subjectReference: ResourceId;
  revisionId: ConfigurationRevisionId | null;
} {
  switch (command.kind) {
    case 'save-draft':
      return {
        action: 'draft-saved',
        subjectKind: 'draft',
        subjectReference: subjectReference(command.draftId),
        revisionId: null,
      };
    case 'validate-draft':
      return {
        action: 'draft-validated',
        subjectKind: 'revision',
        subjectReference: subjectReference(command.revisionId),
        revisionId: command.revisionId,
      };
    case 'activate-revision':
      return {
        action: 'revision-activated',
        subjectKind: 'revision',
        subjectReference: subjectReference(command.revisionId),
        revisionId: command.revisionId,
      };
    case 'rollback-revision':
      return {
        action: 'revision-rolled-back',
        subjectKind: 'revision',
        subjectReference: subjectReference(command.revisionId),
        revisionId: command.revisionId,
      };
  }
}

function auditOutcome(
  status: 'applied' | 'created' | 'accepted' | 'conflict' | 'rejected',
): ConfigurationAuditEvent['outcome'] {
  if (status === 'conflict') return 'conflict';
  if (status === 'rejected') return 'rejected';
  return 'succeeded';
}

function auditEvent(options: {
  eventId: ConfigurationAuditEventId;
  auditScope: AuditScope;
  action: ConfigurationAuditAction;
  outcome: ConfigurationAuditEvent['outcome'];
  subjectKind: ConfigurationAuditEvent['subjectKind'];
  subjectReference: ResourceId;
  stateVersionBefore: number;
  stateVersionAfter: number;
  configurationRevisionId: ConfigurationRevisionId | null;
  occurredAt: IsoInstant;
}): ConfigurationAuditEvent {
  return {
    contractVersion,
    recordKind: 'configuration-audit-event',
    ...options,
  };
}

function portableContent(
  artifact: PortableConfigurationExport,
): PortableConfigurationContent {
  return structuredClone(artifact.configuration);
}

/** C01 application boundary. HTTP, operator presentation, and storage choice are separate. */
export class VersionedConfigurationService {
  constructor(readonly repository: ConfigurationStateRepository) {}

  async read(workspace: Workspace): Promise<ConfigurationReadResult> {
    const state = await this.repository.read(workspace);
    if (state === undefined) return { status: 'not-found' };
    if (
      !isConfigurationStateSnapshot(state) ||
      !isExactWorkspace(state.workspace, workspace)
    ) {
      return { status: 'rejected', reason: 'invalid-stored-state' };
    }
    return { status: 'ready', state: structuredClone(state) };
  }

  async readEffectiveConfiguration(
    workspace: Workspace,
  ): Promise<EffectiveConfigurationResult> {
    const read = await this.read(workspace);
    if (read.status !== 'ready') return read;
    const pointer = read.state.activePointer;
    if (pointer === null) {
      return {
        status: 'not-configured',
        stateVersion: read.state.stateVersion,
      };
    }
    const revision = read.state.revisions.find(
      (candidate) =>
        candidate.revisionId === pointer.revisionId &&
        candidate.lifecycle === 'active',
    );
    if (revision === undefined) {
      return { status: 'rejected', reason: 'invalid-stored-state' };
    }
    const artifact = createPortableConfigurationExport({
      exportId: stateIdentifier(
        'portable-export',
        'effective-configuration-redaction',
      ),
      revisionId: revision.revisionId,
      configuration: revision.content,
      createdAt: pointer.selectedAt,
    });
    return {
      status: 'ready',
      stateVersion: read.state.stateVersion,
      revisionId: revision.revisionId,
      contentChecksum: revision.contentChecksum,
      configuration: portableContent(artifact),
    };
  }

  execute(
    request: AuditedConfigurationCommand,
  ): Promise<ConfigurationTransitionResult> {
    return this.repository.transact(request.command.workspace, (state) => {
      const result = transitionConfigurationState(state, request.command);
      const fields = commandAuditFields(request.command);
      const canAudit =
        isAuditScope(request.command.auditScope) &&
        isAuditScopeForWorkspace(
          request.command.auditScope,
          request.command.workspace,
        );
      return {
        result,
        state: result.state,
        ...(canAudit
          ? {
              auditEvent: auditEvent({
                eventId: request.eventId,
                auditScope: request.command.auditScope,
                action: fields.action,
                subjectKind: fields.subjectKind,
                subjectReference: fields.subjectReference,
                outcome: auditOutcome(result.status),
                stateVersionBefore: state.stateVersion,
                stateVersionAfter: result.state.stateVersion,
                configurationRevisionId: fields.revisionId,
                occurredAt: commandOccurredAt(request.command),
              }),
            }
          : {}),
      };
    });
  }

  createPreview(
    request: AuditedConfigurationPreview,
  ): Promise<ConfigurationPreviewResult> {
    return this.repository.transact(request.request.workspace, (state) => {
      const result = createConfigurationPreview(state, request.request);
      const canAudit =
        isAuditScope(request.request.auditScope) &&
        isAuditScopeForWorkspace(
          request.request.auditScope,
          request.request.workspace,
        );
      return {
        result,
        state: result.state,
        ...(canAudit
          ? {
              auditEvent: auditEvent({
                eventId: request.eventId,
                auditScope: request.request.auditScope,
                action: 'preview-created',
                outcome: auditOutcome(result.status),
                subjectKind: 'preview',
                subjectReference: subjectReference(request.request.previewId),
                stateVersionBefore: state.stateVersion,
                stateVersionAfter: result.state.stateVersion,
                configurationRevisionId:
                  request.request.basis.kind === 'revision'
                    ? request.request.basis.revisionId
                    : null,
                occurredAt: request.request.generatedAt,
              }),
            }
          : {}),
      };
    });
  }

  exportPortable(
    request: PortableConfigurationExportRequest,
  ): Promise<PortableConfigurationExportResult> {
    return this.repository.transact(request.workspace, (state) => {
      let result: PortableConfigurationExportResult;
      const canAudit =
        !isAuditScope(request.auditScope) ||
        !isAuditScopeForWorkspace(request.auditScope, request.workspace)
          ? false
          : true;
      if (!canAudit) {
        result = { status: 'rejected', reason: 'invalid-request', state };
      } else if (!isExactWorkspace(state.workspace, request.workspace)) {
        result = { status: 'rejected', reason: 'workspace-mismatch', state };
      } else if (state.stateVersion !== request.expectedStateVersion) {
        result = { status: 'conflict', reason: 'state-version-changed', state };
      } else {
        const revision = state.revisions.find(
          (candidate) => candidate.revisionId === request.revisionId,
        );
        if (revision === undefined) {
          result = { status: 'rejected', reason: 'revision-not-found', state };
        } else if (
          revision.lifecycle !== 'active' ||
          state.activePointer?.revisionId !== revision.revisionId
        ) {
          result = { status: 'rejected', reason: 'revision-not-active', state };
        } else {
          try {
            result = {
              status: 'created',
              state,
              artifact: createPortableConfigurationExport({
                exportId: request.exportId,
                revisionId: revision.revisionId,
                configuration: revision.content,
                createdAt: request.createdAt,
              }),
            };
          } catch {
            result = { status: 'rejected', reason: 'invalid-request', state };
          }
        }
      }
      return {
        result,
        state,
        ...(canAudit
          ? {
              auditEvent: auditEvent({
                eventId: request.eventId,
                auditScope: request.auditScope,
                action: 'portable-export-created',
                outcome: auditOutcome(result.status),
                subjectKind: 'export',
                subjectReference: subjectReference(request.exportId),
                stateVersionBefore: state.stateVersion,
                stateVersionAfter: state.stateVersion,
                configurationRevisionId: request.revisionId,
                occurredAt: request.createdAt,
              }),
            }
          : {}),
      };
    });
  }

  preflightRecovery(
    request: ConfigurationRecoveryPreflightRequest,
  ): Promise<ConfigurationRecoveryPreflightResult> {
    return this.repository.transact(request.workspace, (state) => {
      let result: ConfigurationRecoveryPreflightResult;
      const canAudit =
        !isAuditScope(request.auditScope) ||
        !isAuditScopeForWorkspace(request.auditScope, request.workspace)
          ? false
          : true;
      if (!canAudit) {
        result = { status: 'rejected', reason: 'invalid-request', state };
      } else if (state.stateVersion !== request.expectedStateVersion) {
        result = { status: 'conflict', reason: 'state-version-changed', state };
      } else {
        const admission = evaluateProtectedRestore(
          request.workspace,
          request.manifest,
          request.observedChecksum,
        );
        result =
          admission.status === 'accepted'
            ? {
                ...admission,
                state,
                mode: 'exact-workspace-isolated',
                currentStatePreservedUntilSuccess: true,
              }
            : { ...admission, state };
      }
      return {
        result,
        state,
        ...(canAudit
          ? {
              auditEvent: auditEvent({
                eventId: request.eventId,
                auditScope: request.auditScope,
                action: 'restore-validated',
                outcome: auditOutcome(result.status),
                subjectKind: 'backup',
                subjectReference: subjectReference(request.manifest.backupId),
                stateVersionBefore: state.stateVersion,
                stateVersionAfter: state.stateVersion,
                configurationRevisionId:
                  state.activePointer?.revisionId ?? null,
                occurredAt: request.occurredAt,
              }),
            }
          : {}),
      };
    });
  }
}
