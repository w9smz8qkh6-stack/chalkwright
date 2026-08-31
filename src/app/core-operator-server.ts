import type { SelfHostedWorkspace } from '../contracts/v1/index.js';
import { CoreOperatorShellService } from '../application/operator-panel/core-operator-shell-service.js';
import type { VersionedConfigurationService } from '../application/configuration/versioned-configuration-service.js';
import {
  startCoreOperatorHttpServer,
  type RunningCoreOperatorHttpServer,
} from '../infrastructure/operator-http/index.js';
import { SelfHostedCoreOperatorController } from './core-operator-controller.js';

export interface CoreOperatorApplicationOptions {
  readonly host: '127.0.0.1' | '::1';
  readonly port?: number;
  readonly workspace: SelfHostedWorkspace;
  readonly configuration: VersionedConfigurationService;
}

/**
 * Starts only the private self-hosted operator process. The caller supplies
 * configuration storage; this composition cannot construct display routes.
 */
export function startCoreOperatorApplication(
  options: CoreOperatorApplicationOptions,
): Promise<RunningCoreOperatorHttpServer> {
  const shell = new CoreOperatorShellService(
    options.workspace,
    options.configuration,
  );
  return startCoreOperatorHttpServer({
    controller: new SelfHostedCoreOperatorController(shell),
    host: options.host,
    ...(options.port === undefined ? {} : { port: options.port }),
  });
}
