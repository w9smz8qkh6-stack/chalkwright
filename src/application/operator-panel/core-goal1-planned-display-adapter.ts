import type {
  CoreGoal1ExpectedScenario,
  CoreGoal1FixtureCatalog,
  CoreGoal1ScenarioObservation,
} from '../../contracts/v1/index.js';
import type { PlannedDisplayProjectionService } from './planned-display-projection-service.js';

/** Maps A08's C09 projection expectation to the bounded read-only service. */
export function createCoreGoal1PlannedDisplayScenarioExecutor(
  createService: (
    catalog: CoreGoal1FixtureCatalog,
  ) => PlannedDisplayProjectionService,
) {
  return async (
    scenario: CoreGoal1ExpectedScenario,
    catalog: CoreGoal1FixtureCatalog,
  ): Promise<CoreGoal1ScenarioObservation> => {
    if (scenario.operation !== 'planned-display.project') {
      return {
        scenarioId: scenario.scenarioId,
        actual: { status: 'unsupported-c09-operation' },
      };
    }
    const input = scenario.input as {
      readonly schoolDate: string;
      readonly screenId: string;
    };
    const projection = await createService(catalog).project({
      schoolDate: input.schoolDate,
      screenId: input.screenId as never,
    });
    return {
      scenarioId: scenario.scenarioId,
      actual: {
        status: projection.status,
        frameCount: projection.frames.length,
        basisRevisionId: projection.basisRevisionId,
        mutationFree: projection.mutationFree,
      },
    };
  };
}
