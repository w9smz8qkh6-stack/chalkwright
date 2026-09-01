import type { SelfHostedCoreCompositionOptions } from './self-hosted-core-composition.js';
import {
  startCoreOperatorHttpServer,
  type RunningCoreOperatorHttpServer,
} from '../infrastructure/operator-http/index.js';
import { composeSelfHostedCore } from './self-hosted-core-composition.js';

export interface CoreOperatorApplicationOptions extends SelfHostedCoreCompositionOptions {
  readonly host: '127.0.0.1' | '::1';
  readonly port?: number;
}

/**
 * Starts only the private self-hosted operator process. The caller supplies
 * configuration storage; this composition cannot construct display routes.
 */
export function startCoreOperatorApplication(
  options: CoreOperatorApplicationOptions,
): Promise<RunningCoreOperatorHttpServer> {
  const composition = composeSelfHostedCore(options);
  return startCoreOperatorHttpServer({
    controller: composition.controller,
    host: options.host,
    ...(options.port === undefined ? {} : { port: options.port }),
  });
}
