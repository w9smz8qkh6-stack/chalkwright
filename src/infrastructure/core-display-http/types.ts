import type { ScreenId } from '../../core/contracts.js';

/** Narrow display-process capability: it cannot save configuration or rotate codes. */
export interface CoreDisplayViewerAdmission {
  admitViewer(
    screenId: ScreenId,
    classCode: string,
  ): Promise<
    | { readonly status: 'admitted'; readonly sessionToken: string }
    | { readonly status: 'denied' }
  >;
  validateViewerSession(screenId: ScreenId, token: string): Promise<boolean>;
}

/** A committed display projection rendered after viewer admission succeeds. */
export interface CoreDisplayProjectionRenderer {
  renderCommittedScreen(screenId: ScreenId): Promise<string> | string;
  readiness(): Promise<unknown> | unknown;
}

export interface CoreDisplayHttpServerOptions {
  readonly host: '127.0.0.1' | '::1';
  readonly port?: number;
  readonly admission: CoreDisplayViewerAdmission;
  readonly renderer: CoreDisplayProjectionRenderer;
}

export interface RunningCoreDisplayHttpServer {
  readonly host: '127.0.0.1' | '::1';
  readonly port: number;
  readonly origin: string;
  close(): Promise<void>;
}
