import type { Workspace } from '../contracts/v1/workspace.js';
import type { ConfigurationStateRepository } from '../ports/configuration-state.js';
import {
  runCoreConformanceSuite,
  type CoreConformanceReport,
} from './contract-test-kit.js';

/**
 * Minimum adapter contract shared by self-hosted and future hosted
 * configuration persistence. Reads must return detached state and preserve the
 * exact workspace boundary; mutations are tested by the lifecycle suites.
 */
export function runConfigurationStateRepositoryConformance(
  repository: ConfigurationStateRepository,
  workspace: Workspace,
): Promise<CoreConformanceReport> {
  return runCoreConformanceSuite(repository, [
    {
      id: 'reads-initialized-workspace',
      async run(adapter) {
        if ((await adapter.read(workspace)) === undefined) {
          throw new Error('configuration-state-missing');
        }
      },
    },
    {
      id: 'detaches-read-state',
      async run(adapter) {
        const first = await adapter.read(workspace);
        if (first === undefined) throw new Error('configuration-state-missing');
        const altered = first as unknown as { stateVersion: number };
        altered.stateVersion = -1;
        const second = await adapter.read(workspace);
        if (second === undefined || second.stateVersion === -1) {
          throw new Error('configuration-state-aliased');
        }
      },
    },
    {
      id: 'returns-detached-audit-history',
      async run(adapter) {
        const first = await adapter.readAuditEvents(workspace);
        const altered = first as unknown as Array<unknown>;
        altered.push({ unexpected: true });
        const second = await adapter.readAuditEvents(workspace);
        if (second.some((event) => 'unexpected' in event)) {
          throw new Error('configuration-audit-aliased');
        }
      },
    },
  ]);
}
