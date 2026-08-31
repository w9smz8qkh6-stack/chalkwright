import type { OperatorPageKey } from '../../contracts/v1/index.js';

export interface CoreOperatorHttpController {
  renderPage(pageKey: OperatorPageKey): string | Promise<string>;
  capabilities(): unknown | Promise<unknown>;
  readiness(): unknown | Promise<unknown>;
}

export interface CoreOperatorHttpServerOptions {
  readonly controller: CoreOperatorHttpController;
  /** Required: C02 never relies on Node's omitted-host bind behavior. */
  readonly host: '127.0.0.1' | '::1';
  readonly port?: number;
  readonly requestTimeoutMs?: number;
  readonly gracefulCloseTimeoutMs?: number;
}

export interface RunningCoreOperatorHttpServer {
  readonly host: '127.0.0.1' | '::1';
  readonly port: number;
  readonly origin: string;
  close(): Promise<void>;
}
