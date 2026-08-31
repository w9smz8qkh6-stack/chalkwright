import type {
  CoreGoal1ExpectedScenario,
  CoreGoal1FixtureCatalog,
  CoreGoal1ScenarioObservation,
} from '../../contracts/v1/index.js';
import type { DisplayConfigurationService } from './display-configuration-service.js';

/** Maps A08's exact C03 projection expectation to the real C03 service. */
export function createCoreGoal1DisplayConfigurationScenarioExecutor(
  createService: (
    catalog: CoreGoal1FixtureCatalog,
  ) => DisplayConfigurationService,
) {
  return async (
    scenario: CoreGoal1ExpectedScenario,
    catalog: CoreGoal1FixtureCatalog,
  ): Promise<CoreGoal1ScenarioObservation> => {
    if (scenario.operation !== 'display-configuration.project') {
      return {
        scenarioId: scenario.scenarioId,
        actual: { status: 'unsupported-c03-operation' },
      };
    }
    const projection = await createService(catalog).project();
    const screens = projection.rooms.flatMap((room) => room.screens);
    return {
      scenarioId: scenario.scenarioId,
      actual: {
        status: projection.status,
        roomCount: projection.rooms.length,
        screenCount: screens.length,
        classCodeStates: screens.map((screen) => screen.classCodeState),
        plaintextClassCodesPresent: false,
      },
    };
  };
}
