import type {
  CoreGoal1ExpectedScenario,
  CoreGoal1FixtureCatalog,
  CoreGoal1ScenarioObservation,
} from '../../contracts/v1/index.js';
import type { CoreOperatorShellService } from './core-operator-shell-service.js';

/** Maps the exact A08 C02 expectation to the real read-only shell service. */
export function createCoreGoal1OperatorShellScenarioExecutor(
  createShell: (catalog: CoreGoal1FixtureCatalog) => CoreOperatorShellService,
) {
  return async (
    scenario: CoreGoal1ExpectedScenario,
    catalog: CoreGoal1FixtureCatalog,
  ): Promise<CoreGoal1ScenarioObservation> => {
    if (scenario.operation !== 'operator-shell.render') {
      return {
        scenarioId: scenario.scenarioId,
        actual: { status: 'unsupported-c02-operation' },
      };
    }
    const shell = createShell(catalog);
    const readiness = await shell.readiness();
    await shell.page('overview');
    return {
      scenarioId: scenario.scenarioId,
      actual: {
        status: readiness.ready ? 'ready' : 'unavailable',
        authority: readiness.authority,
        accountRequired: false,
        javascriptRequired: false,
      },
    };
  };
}
