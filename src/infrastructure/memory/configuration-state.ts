import {
  isAuditScopeForWorkspace,
  isConfigurationAuditEvent,
  isConfigurationStateSnapshot,
  isExactWorkspace,
  type ConfigurationAuditEvent,
  type ConfigurationStateSnapshot,
} from '../../contracts/v1/index.js';
import type { Workspace } from '../../contracts/v1/workspace.js';
import type {
  ConfigurationStateRepository,
  ConfigurationTransaction,
} from '../../ports/configuration-state.js';
import { configurationAuditEventRetentionLimit } from '../../ports/configuration-state.js';

interface WorkspaceState {
  state: ConfigurationStateSnapshot;
  auditEvents: ConfigurationAuditEvent[];
}

function workspaceKey(workspace: Workspace): string {
  return workspace.kind === 'self-hosted-installation'
    ? `${workspace.kind}:${workspace.workspaceId}:${workspace.installationId}`
    : `${workspace.kind}:${workspace.workspaceId}:${workspace.organizationId}`;
}

function detached<Value>(value: Value): Value {
  return structuredClone(value);
}

/**
 * Deterministic transactional adapter for Core use cases and contract suites.
 * Calls are serialized so two callers cannot both commit the same state
 * version. No production composition root uses this adapter.
 */
export class InMemoryConfigurationStateRepository implements ConfigurationStateRepository {
  readonly #workspaces = new Map<string, WorkspaceState>();
  #transactionTail: Promise<void> = Promise.resolve();

  constructor(states: readonly ConfigurationStateSnapshot[] = []) {
    for (const state of states) {
      if (!isConfigurationStateSnapshot(state)) {
        throw new TypeError('Invalid initial configuration state.');
      }
      const key = workspaceKey(state.workspace);
      if (this.#workspaces.has(key)) {
        throw new TypeError('Duplicate initial configuration workspace.');
      }
      this.#workspaces.set(key, { state: detached(state), auditEvents: [] });
    }
  }

  async read(
    workspace: Workspace,
  ): Promise<ConfigurationStateSnapshot | undefined> {
    await this.#transactionTail;
    const stored = this.#workspaces.get(workspaceKey(workspace));
    return stored === undefined ? undefined : detached(stored.state);
  }

  async readAuditEvents(
    workspace: Workspace,
  ): Promise<readonly ConfigurationAuditEvent[]> {
    await this.#transactionTail;
    const stored = this.#workspaces.get(workspaceKey(workspace));
    return detached(stored?.auditEvents ?? []);
  }

  transact<Result>(
    workspace: Workspace,
    transaction: ConfigurationTransaction<Result>,
  ): Promise<Result> {
    let resolveResult!: (result: Result | PromiseLike<Result>) => void;
    let rejectResult!: (reason?: unknown) => void;
    const result = new Promise<Result>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    const execute = (): void => {
      try {
        const key = workspaceKey(workspace);
        const stored = this.#workspaces.get(key);
        if (stored === undefined) {
          throw new TypeError('Configuration workspace is not initialized.');
        }
        if (!isExactWorkspace(stored.state.workspace, workspace)) {
          throw new TypeError('Configuration workspace mismatch.');
        }
        const decision = transaction(detached(stored.state));
        const transactionResult = detached(decision.result);
        if (
          !isConfigurationStateSnapshot(decision.state) ||
          !isExactWorkspace(decision.state.workspace, workspace)
        ) {
          throw new TypeError(
            'Transaction returned invalid configuration state.',
          );
        }
        if (
          decision.auditEvent !== undefined &&
          (!isConfigurationAuditEvent(decision.auditEvent) ||
            !isAuditScopeForWorkspace(
              decision.auditEvent.auditScope,
              workspace,
            ))
        ) {
          throw new TypeError(
            'Transaction returned invalid configuration audit event.',
          );
        }

        const auditEvents =
          decision.auditEvent === undefined
            ? stored.auditEvents
            : [...stored.auditEvents, detached(decision.auditEvent)].slice(
                -configurationAuditEventRetentionLimit,
              );
        this.#workspaces.set(key, {
          state: detached(decision.state),
          auditEvents,
        });
        resolveResult(transactionResult);
      } catch (error) {
        rejectResult(error);
      }
    };

    this.#transactionTail = this.#transactionTail.then(execute, execute);
    return result;
  }
}
