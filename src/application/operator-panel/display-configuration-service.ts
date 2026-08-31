import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
  createHash,
} from 'node:crypto';

import {
  contractVersion,
  isExactWorkspace,
  scopeIdentifier,
  stateIdentifier,
  viewerClassCodePolicy,
  type ClassCodeState,
  type EditableConfiguration,
  type AuditScope,
  type IsoInstant,
  type RoomId,
  type ScreenId,
  type SelfHostedWorkspace,
  type Workspace,
} from '../../contracts/v1/index.js';
import type { VersionedConfigurationService } from '../configuration/versioned-configuration-service.js';
import type {
  DisplayAccessRepository,
  DisplayAccessSnapshot,
  ProtectedClassCodeVerifier,
} from '../../ports/display-access.js';

const VIEWER_SESSION_SECONDS =
  viewerClassCodePolicy.maximumViewerSessionLifetimeSeconds;
const ADMISSION_WINDOW_MS = 60_000;
const MAX_ADMISSION_FAILURES_PER_WINDOW = 5;
const DUMMY_VERIFIER: ProtectedClassCodeVerifier = {
  algorithm: 'scrypt-v1',
  salt: 'AAAAAAAAAAAAAAAAAAAAAA',
  digest:
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

function derive(value: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      value,
      salt,
      length,
      { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, derived) => (error === null ? resolve(derived) : reject(error)),
    );
  });
}

export interface DisplayProjection {
  readonly status: 'ready' | 'not-configured' | 'unavailable';
  readonly timeZone: string | null;
  readonly rooms: readonly {
    readonly roomId: RoomId;
    readonly label: string;
    readonly screens: readonly {
      readonly screenId: ScreenId;
      readonly label: string;
      readonly enabled: boolean;
      readonly displayReference: string;
      readonly classCodeState: 'active' | 'revoked' | 'missing';
      readonly verifierVersion: number | null;
    }[];
  }[];
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
}

export type ClassCodeRotationResult =
  | {
      readonly status: 'rotated';
      readonly classCode: string;
      readonly verifierVersion: number;
    }
  | {
      readonly status: 'rejected';
      readonly reason: 'screen-not-found' | 'configuration-unavailable';
    };

export type ViewerAdmissionResult =
  | {
      readonly status: 'admitted';
      readonly sessionToken: string;
      readonly expiresAt: IsoInstant;
    }
  | { readonly status: 'denied' };

export interface SaveDisplayDraftInput {
  readonly timeZone: string;
  readonly roomLabel?: string;
  readonly screenLabel?: string;
}

export type SaveDisplayDraftResult =
  | { readonly status: 'saved'; readonly draftVersion: number }
  | { readonly status: 'rejected'; readonly reason: string }
  | { readonly status: 'conflict' };

function instant(date: Date): IsoInstant {
  return date.toISOString() as IsoInstant;
}

function tokenDigest(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('base64url');
}

async function verifierFor(
  classCode: string,
): Promise<ProtectedClassCodeVerifier> {
  const salt = randomBytes(16);
  const derived = await derive(classCode, salt, 64);
  return {
    algorithm: 'scrypt-v1',
    salt: salt.toString('base64url'),
    digest: derived.toString('base64url'),
  };
}

async function matchesVerifier(
  classCode: string,
  verifier: ProtectedClassCodeVerifier,
): Promise<boolean> {
  const expected = Buffer.from(verifier.digest, 'base64url');
  const actual = await derive(
    classCode,
    Buffer.from(verifier.salt, 'base64url'),
    expected.byteLength,
  );
  return (
    expected.byteLength === actual.byteLength &&
    timingSafeEqual(expected, actual)
  );
}

function activeConfiguration<
  Configuration extends { readonly workspace: Workspace },
>(
  configuration: Configuration,
  workspace: SelfHostedWorkspace,
): Configuration | null {
  return isExactWorkspace(configuration.workspace, workspace)
    ? configuration
    : null;
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48);
}

/**
 * C03 application boundary. Plaintext codes exist only in the rotate response
 * and verification call; persistence receives slow verifiers and token digests.
 */
export class DisplayConfigurationService {
  #sequence = 0;
  constructor(
    readonly workspace: SelfHostedWorkspace,
    readonly configuration: VersionedConfigurationService,
    readonly access: DisplayAccessRepository,
    readonly displayOrigin: string,
    readonly now: () => Date = () => new Date(),
  ) {
    const origin = new URL(displayOrigin);
    if (origin.protocol !== 'https:' || origin.origin !== displayOrigin) {
      throw new TypeError('Display origin must be an exact HTTPS origin.');
    }
  }

  async project(): Promise<DisplayProjection> {
    const effective = await this.configuration.readEffectiveConfiguration(
      this.workspace,
    );
    if (effective.status === 'not-configured') {
      return {
        status: 'not-configured',
        timeZone: null,
        rooms: [],
        blockers: ['timezone-missing', 'room-missing', 'screen-missing'],
        warnings: [],
      };
    }
    if (effective.status !== 'ready') {
      return {
        status: 'unavailable',
        timeZone: null,
        rooms: [],
        blockers: ['configuration-unavailable'],
        warnings: [],
      };
    }
    const content = activeConfiguration(
      effective.configuration,
      this.workspace,
    );
    if (content === null) {
      return {
        status: 'unavailable',
        timeZone: null,
        rooms: [],
        blockers: ['configuration-unavailable'],
        warnings: [],
      };
    }
    const rooms = await Promise.all(
      content.rooms.map(async (room) => ({
        roomId: room.roomId,
        label: room.label,
        screens: await Promise.all(
          content.screens
            .filter((screen) => screen.roomId === room.roomId)
            .map(async (screen) => {
              const access = await this.access.read(
                this.workspace,
                screen.screenId,
              );
              return {
                screenId: screen.screenId,
                label: screen.label,
                enabled: screen.enabled,
                displayReference: `${this.displayOrigin}/screens/${encodeURIComponent(screen.screenId)}`,
                classCodeState: (access.classCodeState?.status ?? 'missing') as
                  'active' | 'revoked' | 'missing',
                verifierVersion: access.classCodeState?.verifierVersion ?? null,
              };
            }),
        ),
      })),
    );
    const warnings = rooms
      .flatMap((room) => room.screens)
      .filter((screen) => screen.enabled && screen.classCodeState !== 'active')
      .map((screen) => `viewer-code-${screen.screenId}`);
    return {
      status: 'ready',
      timeZone: content.timePolicy.timeZone,
      rooms,
      blockers: [],
      warnings,
    };
  }

  async saveDisplayDraft(
    input: SaveDisplayDraftInput,
  ): Promise<SaveDisplayDraftResult> {
    try {
      new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format(0);
    } catch {
      return { status: 'rejected', reason: 'invalid-timezone' };
    }
    const read = await this.configuration.read(this.workspace);
    if (read.status !== 'ready')
      return { status: 'rejected', reason: 'configuration-unavailable' };
    const state = read.state;
    const existingDraft = state.drafts.at(-1);
    const active = state.revisions.find(
      (revision) => revision.revisionId === state.activePointer?.revisionId,
    );
    const base = existingDraft?.content ?? active?.content;
    if (
      base === undefined ||
      !isExactWorkspace(base.workspace, this.workspace)
    ) {
      return { status: 'rejected', reason: 'configuration-unavailable' };
    }
    const roomLabel = input.roomLabel?.trim() ?? '';
    const screenLabel = input.screenLabel?.trim() ?? '';
    if ((roomLabel === '') !== (screenLabel === '')) {
      return {
        status: 'rejected',
        reason: 'room-and-screen-required-together',
      };
    }
    if (roomLabel.length > 120 || screenLabel.length > 120) {
      return { status: 'rejected', reason: 'label-too-long' };
    }
    const suffix =
      roomLabel === '' ? '' : `${slug(roomLabel)}-${this.#sequence + 1}`;
    if (roomLabel !== '' && suffix.startsWith('-')) {
      return { status: 'rejected', reason: 'invalid-label' };
    }
    const roomId =
      roomLabel === '' ? null : scopeIdentifier('room', `room-c03-${suffix}`);
    const screenId =
      screenLabel === ''
        ? null
        : scopeIdentifier(
            'screen',
            `screen-c03-${slug(screenLabel)}-${this.#sequence + 1}`,
          );
    const classCodeStateId =
      screenId === null
        ? null
        : stateIdentifier(
            'class-code-state',
            `class-code-state-c03-${screenId}`,
          );
    const content: EditableConfiguration = {
      ...structuredClone(base),
      timePolicy: {
        ...base.timePolicy,
        timeZone:
          input.timeZone as EditableConfiguration['timePolicy']['timeZone'],
      },
      rooms:
        roomId === null
          ? base.rooms
          : [
              ...base.rooms,
              {
                workspaceId: this.workspace.workspaceId,
                roomId,
                label: roomLabel,
              },
            ].sort((left, right) => left.roomId.localeCompare(right.roomId)),
      screens:
        screenId === null || roomId === null || classCodeStateId === null
          ? base.screens
          : [
              ...base.screens,
              {
                workspaceId: this.workspace.workspaceId,
                screenId,
                roomId,
                label: screenLabel,
                enabled: true,
                classCodeStateId,
              },
            ].sort((left, right) =>
              left.screenId.localeCompare(right.screenId),
            ),
    };
    this.#sequence += 1;
    const stamp = instant(this.now());
    const auditScope: AuditScope = {
      contractVersion,
      workspaceKind: 'self-hosted-installation',
      workspaceId: this.workspace.workspaceId,
      installationId: this.workspace.installationId,
      actorId: scopeIdentifier('actor', 'actor-c03-private-operator'),
      actorKind: 'self-hosted-operator',
      capability: scopeIdentifier('capability', 'configuration.write'),
      authority: 'operator-reachability',
      targets: [{ kind: 'workspace', workspaceId: this.workspace.workspaceId }],
      operationId: scopeIdentifier(
        'operation',
        `operation-c03-save-display-${this.#sequence}`,
      ),
      correlationId: scopeIdentifier(
        'correlation',
        `correlation-c03-save-display-${this.#sequence}`,
      ),
    };
    const result = await this.configuration.execute({
      eventId: stateIdentifier(
        'audit-event',
        `audit-event-c03-save-display-${this.#sequence}`,
      ),
      command: {
        contractVersion,
        kind: 'save-draft',
        workspace: this.workspace,
        workspaceId: this.workspace.workspaceId,
        expectedStateVersion: state.stateVersion,
        auditScope,
        draftId:
          existingDraft?.draftId ??
          stateIdentifier(
            'configuration-draft',
            'configuration-draft-c03-displays',
          ),
        expectedDraftVersion: existingDraft?.draftVersion ?? null,
        content,
        savedAt: stamp,
      },
    });
    if (result.status === 'conflict') return { status: 'conflict' };
    if (result.status === 'rejected')
      return { status: 'rejected', reason: result.reason };
    return {
      status: 'saved',
      draftVersion: result.state.drafts.at(-1)?.draftVersion ?? 0,
    };
  }

  async rotateClassCode(screenId: ScreenId): Promise<ClassCodeRotationResult> {
    const projection = await this.project();
    if (projection.status !== 'ready')
      return { status: 'rejected', reason: 'configuration-unavailable' };
    if (
      !projection.rooms.some((room) =>
        room.screens.some((screen) => screen.screenId === screenId),
      )
    ) {
      return { status: 'rejected', reason: 'screen-not-found' };
    }
    const classCode = randomBytes(16).toString('base64url');
    const verifier = await verifierFor(classCode);
    const rotatedAt = instant(this.now());
    const verifierVersion = await this.access.transact(
      this.workspace,
      screenId,
      (current) => {
        const version = (current.classCodeState?.verifierVersion ?? 0) + 1;
        const classCodeState: ClassCodeState = {
          contractVersion,
          recordKind: 'class-code-state',
          status: 'active',
          workspaceId: this.workspace.workspaceId,
          classCodeStateId: stateIdentifier(
            'class-code-state',
            `class-code-state-c03-${screenId}`,
          ),
          screenId,
          policyVersion: viewerClassCodePolicy.version,
          verifierReference: {
            kind: 'protected-secret-reference',
            referenceId: stateIdentifier(
              'secret-reference',
              `secret-reference-c03-${screenId}-${version}`,
            ),
          },
          verifierVersion: version,
          rotatedAt,
        };
        return {
          result: version,
          state: {
            classCodeState,
            verifier,
            viewerSessions: [],
            admissionFailures: [],
          },
        };
      },
    );
    return { status: 'rotated', classCode, verifierVersion };
  }

  async revokeClassCode(
    screenId: ScreenId,
  ): Promise<'revoked' | 'screen-not-found'> {
    const projection = await this.project();
    if (
      !projection.rooms.some((room) =>
        room.screens.some((screen) => screen.screenId === screenId),
      )
    )
      return 'screen-not-found';
    await this.access.transact(this.workspace, screenId, (current) => ({
      result: undefined,
      state: {
        classCodeState: {
          contractVersion,
          recordKind: 'class-code-state',
          status: 'revoked',
          workspaceId: this.workspace.workspaceId,
          classCodeStateId:
            current.classCodeState?.classCodeStateId ??
            stateIdentifier(
              'class-code-state',
              `class-code-state-c03-${screenId}`,
            ),
          screenId,
          policyVersion: viewerClassCodePolicy.version,
          verifierVersion: current.classCodeState?.verifierVersion ?? 1,
          revokedAt: instant(this.now()),
        },
        verifier: null,
        viewerSessions: [],
        admissionFailures: [],
      },
    }));
    return 'revoked';
  }

  async admitViewer(
    screenId: ScreenId,
    classCode: string,
  ): Promise<ViewerAdmissionResult> {
    if (
      classCode.length < viewerClassCodePolicy.minimumLength ||
      classCode.length > viewerClassCodePolicy.maximumLength
    ) {
      return { status: 'denied' };
    }
    const current = await this.access.read(this.workspace, screenId);
    const attemptTime = this.now();
    const recentFailures = current.admissionFailures.filter(
      (failure) =>
        Date.parse(failure) > attemptTime.getTime() - ADMISSION_WINDOW_MS,
    );
    if (recentFailures.length >= MAX_ADMISSION_FAILURES_PER_WINDOW) {
      return { status: 'denied' };
    }
    const verifier = current.verifier ?? DUMMY_VERIFIER;
    const matches = await matchesVerifier(classCode, verifier);
    if (
      current.classCodeState?.status !== 'active' ||
      current.verifier === null ||
      !matches
    ) {
      await this.access.transact(this.workspace, screenId, (latest) => ({
        result: undefined,
        state: {
          ...latest,
          admissionFailures: [
            ...latest.admissionFailures.filter(
              (failure) =>
                Date.parse(failure) >
                attemptTime.getTime() - ADMISSION_WINDOW_MS,
            ),
            instant(attemptTime),
          ].slice(-MAX_ADMISSION_FAILURES_PER_WINDOW),
        },
      }));
      return { status: 'denied' };
    }
    const admittedVerifierVersion = current.classCodeState.verifierVersion;
    const token = randomBytes(32).toString('base64url');
    const created = this.now();
    const expires = new Date(
      created.getTime() + VIEWER_SESSION_SECONDS * 1_000,
    );
    const admitted = await this.access.transact(
      this.workspace,
      screenId,
      (latest) => {
        if (
          latest.classCodeState?.status !== 'active' ||
          latest.classCodeState.verifierVersion !== admittedVerifierVersion
        ) {
          return { result: false, state: latest };
        }
        return {
          result: true,
          state: {
            ...latest,
            viewerSessions: [
              ...latest.viewerSessions.filter(
                (session) => Date.parse(session.expiresAt) > created.getTime(),
              ),
              {
                workspaceId: this.workspace.workspaceId,
                screenId,
                verifierVersion: latest.classCodeState.verifierVersion,
                tokenDigest: tokenDigest(token),
                createdAt: instant(created),
                expiresAt: instant(expires),
              },
            ],
            admissionFailures: [],
          },
        };
      },
    );
    return admitted
      ? { status: 'admitted', sessionToken: token, expiresAt: instant(expires) }
      : { status: 'denied' };
  }

  async validateViewerSession(
    screenId: ScreenId,
    token: string,
  ): Promise<boolean> {
    const current = await this.access.read(this.workspace, screenId);
    if (current.classCodeState?.status !== 'active') return false;
    const digest = tokenDigest(token);
    const now = this.now().getTime();
    return current.viewerSessions.some(
      (session) =>
        session.screenId === screenId &&
        session.workspaceId === this.workspace.workspaceId &&
        session.verifierVersion === current.classCodeState?.verifierVersion &&
        Date.parse(session.expiresAt) > now &&
        timingSafeEqual(Buffer.from(session.tokenDigest), Buffer.from(digest)),
    );
  }
}
