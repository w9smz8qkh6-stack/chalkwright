import { startCoreOperatorApplication } from '../app/core-operator-server.js';
import { VersionedConfigurationService } from '../application/configuration/versioned-configuration-service.js';
import {
  contractVersion,
  scopeIdentifier,
  type ConfigurationStateSnapshot,
  type SelfHostedWorkspace,
} from '../contracts/v1/index.js';
import { InMemoryConfigurationStateRepository } from '../infrastructure/memory/configuration-state.js';
import { isDirectEntrypoint } from './direct-invocation.js';

export interface CoreOperatorEntrypointConfig {
  readonly host: '127.0.0.1' | '::1';
  readonly port: number;
}

export function loadCoreOperatorEntrypointConfig(
  environment: NodeJS.ProcessEnv,
): CoreOperatorEntrypointConfig {
  if (environment.CHALKWRIGHT_CORE_OPERATOR_SYNTHETIC !== '1') {
    throw new Error('core-operator-synthetic-acknowledgement-required');
  }
  const host = environment.CHALKWRIGHT_CORE_OPERATOR_HOST;
  if (host !== '127.0.0.1' && host !== '::1') {
    throw new Error('core-operator-explicit-loopback-host-required');
  }
  const portText = environment.CHALKWRIGHT_CORE_OPERATOR_PORT;
  if (portText === undefined || !/^[1-9][0-9]{0,4}$/u.test(portText)) {
    throw new Error('core-operator-explicit-port-required');
  }
  const port = Number(portText);
  if (!Number.isSafeInteger(port) || port > 65_535) {
    throw new Error('core-operator-explicit-port-required');
  }
  return { host, port };
}

function syntheticWorkspace(): SelfHostedWorkspace {
  return {
    contractVersion,
    kind: 'self-hosted-installation',
    workspaceId: scopeIdentifier(
      'workspace',
      'workspace-synthetic-core-operator-c02',
    ),
    installationId: scopeIdentifier(
      'installation',
      'installation-synthetic-core-operator-c02',
    ),
  };
}

function syntheticState(
  workspace: SelfHostedWorkspace,
): ConfigurationStateSnapshot {
  return {
    contractVersion,
    stateSchemaVersion: 1,
    workspace,
    stateVersion: 0,
    drafts: [],
    revisions: [],
    activePointer: null,
  };
}

export async function runCoreOperatorServerEntrypoint(
  signal: AbortSignal,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const config = loadCoreOperatorEntrypointConfig(environment);
  const workspace = syntheticWorkspace();
  const configuration = new VersionedConfigurationService(
    new InMemoryConfigurationStateRepository([syntheticState(workspace)]),
  );
  const running = await startCoreOperatorApplication({
    ...config,
    workspace,
    configuration,
  });
  process.stdout.write(
    `Chalkwright synthetic Core operator panel is listening privately at ${running.origin}.\n`,
  );
  if (signal.aborted) {
    await running.close();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const stop = (): void => {
      signal.removeEventListener('abort', stop);
      void running.close().then(resolve, reject);
    };
    signal.addEventListener('abort', stop, { once: true });
  });
}

const invokedPath = process.argv[1];
if (isDirectEntrypoint(import.meta.url, invokedPath)) {
  const controller = new AbortController();
  const interrupt = (): void => controller.abort('process-signal');
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  void runCoreOperatorServerEntrypoint(controller.signal, process.env)
    .catch(() => {
      process.stderr.write(
        'Chalkwright Core operator startup failed safely.\n',
      );
      process.exitCode = 1;
    })
    .finally(() => {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    });
}
