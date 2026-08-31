import type {
  ConfigurationAuditEvent,
  ConfigurationStateSnapshot,
} from '../contracts/v1/index.js';
import type { Workspace } from '../contracts/v1/workspace.js';

/** Core's finite in-process audit window; durable adapters may retain less only by policy. */
export const configurationAuditEventRetentionLimit = 256;

/**
 * One atomic configuration decision. Adapters validate and detach both values
 * before making the state and bounded audit history visible together.
 */
export interface ConfigurationTransactionDecision<Result> {
  readonly result: Result;
  readonly state: ConfigurationStateSnapshot;
  readonly auditEvent?: ConfigurationAuditEvent;
}

export type ConfigurationTransaction<Result> = (
  state: ConfigurationStateSnapshot,
) => ConfigurationTransactionDecision<Result>;

/** Adapter-neutral persistence boundary for C01 configuration use cases. */
export interface ConfigurationStateRepository {
  read(workspace: Workspace): Promise<ConfigurationStateSnapshot | undefined>;

  readAuditEvents(
    workspace: Workspace,
  ): Promise<readonly ConfigurationAuditEvent[]>;

  transact<Result>(
    workspace: Workspace,
    transaction: ConfigurationTransaction<Result>,
  ): Promise<Result>;
}
