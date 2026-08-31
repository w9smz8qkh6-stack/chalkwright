import type {
  ClassCodeState,
  IsoInstant,
  ScreenId,
  Workspace,
  WorkspaceId,
} from '../contracts/v1/index.js';

export interface ProtectedClassCodeVerifier {
  readonly algorithm: 'scrypt-v1';
  readonly salt: string;
  readonly digest: string;
}

export interface ViewerSessionRecord {
  readonly workspaceId: WorkspaceId;
  readonly screenId: ScreenId;
  readonly verifierVersion: number;
  readonly tokenDigest: string;
  readonly createdAt: IsoInstant;
  readonly expiresAt: IsoInstant;
}

export interface DisplayAccessSnapshot {
  readonly classCodeState: ClassCodeState | null;
  readonly verifier: ProtectedClassCodeVerifier | null;
  readonly viewerSessions: readonly ViewerSessionRecord[];
  readonly admissionFailures: readonly IsoInstant[];
}

export interface DisplayAccessTransaction<T> {
  readonly result: T;
  readonly state: DisplayAccessSnapshot;
}

/** Protected adapter boundary; no plaintext class code or session token crosses it. */
export interface DisplayAccessRepository {
  read(
    workspace: Workspace,
    screenId: ScreenId,
  ): Promise<DisplayAccessSnapshot>;
  transact<T>(
    workspace: Workspace,
    screenId: ScreenId,
    transition: (current: DisplayAccessSnapshot) => DisplayAccessTransaction<T>,
  ): Promise<T>;
}
