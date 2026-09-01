import type {
  CoreGoal1PlannedFrameFixture,
  SelfHostedWorkspace,
} from '../contracts/v1/index.js';
import { CoreOperatorShellService } from '../application/operator-panel/core-operator-shell-service.js';
import type { VersionedConfigurationService } from '../application/configuration/versioned-configuration-service.js';
import {
  startCoreOperatorHttpServer,
  type RunningCoreOperatorHttpServer,
} from '../infrastructure/operator-http/index.js';
import { SelfHostedCoreOperatorController } from './core-operator-controller.js';
import { DisplayConfigurationService } from '../application/operator-panel/display-configuration-service.js';
import { InMemoryDisplayAccessRepository } from '../infrastructure/memory/display-access.js';
import type { DisplayAccessRepository } from '../ports/display-access.js';
import { SourceRegistryService } from '../application/operator-panel/source-registry-service.js';
import { PlannedDisplayProjectionService } from '../application/operator-panel/planned-display-projection-service.js';
import { PresentationProfileService } from '../application/operator-panel/presentation-profile-service.js';

export interface CoreOperatorApplicationOptions {
  readonly host: '127.0.0.1' | '::1';
  readonly port?: number;
  readonly workspace: SelfHostedWorkspace;
  readonly configuration: VersionedConfigurationService;
  readonly displayAccess?: DisplayAccessRepository;
  readonly displayOrigin?: string;
  readonly plannedFrames?: readonly CoreGoal1PlannedFrameFixture[];
  readonly plannedDisplayBasisRevisionId?: string;
}

/**
 * Starts only the private self-hosted operator process. The caller supplies
 * configuration storage; this composition cannot construct display routes.
 */
export function startCoreOperatorApplication(
  options: CoreOperatorApplicationOptions,
): Promise<RunningCoreOperatorHttpServer> {
  const displays = new DisplayConfigurationService(
    options.workspace,
    options.configuration,
    options.displayAccess ?? new InMemoryDisplayAccessRepository(),
    options.displayOrigin ?? 'https://display.synthetic.invalid',
  );
  const sources = new SourceRegistryService(
    options.workspace,
    options.configuration,
  );
  const plannedDisplays = new PlannedDisplayProjectionService(
    options.workspace,
    options.configuration,
    options.plannedFrames ?? [],
    undefined,
    options.plannedDisplayBasisRevisionId ?? null,
  );
  const presentation = new PresentationProfileService(options.workspace);
  const shell = new CoreOperatorShellService(
    options.workspace,
    options.configuration,
    displays,
    sources,
    plannedDisplays,
  );
  return startCoreOperatorHttpServer({
    controller: new SelfHostedCoreOperatorController(
      shell,
      displays,
      sources,
      plannedDisplays,
      presentation,
    ),
    host: options.host,
    ...(options.port === undefined ? {} : { port: options.port }),
  });
}
