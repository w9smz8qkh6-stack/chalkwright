import type { SelfHostedWorkspace } from '../contracts/v1/index.js';
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

export interface CoreOperatorApplicationOptions {
  readonly host: '127.0.0.1' | '::1';
  readonly port?: number;
  readonly workspace: SelfHostedWorkspace;
  readonly configuration: VersionedConfigurationService;
  readonly displayAccess?: DisplayAccessRepository;
  readonly displayOrigin?: string;
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
  const shell = new CoreOperatorShellService(
    options.workspace,
    options.configuration,
    displays,
  );
  return startCoreOperatorHttpServer({
    controller: new SelfHostedCoreOperatorController(shell, displays),
    host: options.host,
    ...(options.port === undefined ? {} : { port: options.port }),
  });
}
