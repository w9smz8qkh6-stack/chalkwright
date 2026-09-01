import type { ScreenId, Workspace } from '../contracts/v1/index.js';
import type { DisplayAccessRepository } from '../ports/display-access.js';
import {
  runCoreConformanceSuite,
  type CoreConformanceReport,
} from './contract-test-kit.js';

/** Conformance checks for the protected class-code/session persistence boundary. */
export function runDisplayAccessRepositoryConformance(
  repository: DisplayAccessRepository,
  workspace: Workspace,
  screenId: ScreenId,
  foreignWorkspace: Workspace,
): Promise<CoreConformanceReport> {
  return runCoreConformanceSuite(repository, [
    {
      id: 'detaches-display-access-read',
      async run(adapter) {
        const first = await adapter.read(workspace, screenId);
        (first.admissionFailures as unknown as Array<string>).push('altered');
        const second = await adapter.read(workspace, screenId);
        if (second.admissionFailures.includes('altered' as never)) {
          throw new Error('display-access-aliased');
        }
      },
    },
    {
      id: 'isolates-exact-workspace',
      async run(adapter) {
        const local = await adapter.read(workspace, screenId);
        const foreign = await adapter.read(foreignWorkspace, screenId);
        if (local.classCodeState !== null && foreign.classCodeState !== null) {
          throw new Error('display-access-cross-workspace');
        }
      },
    },
  ]);
}
