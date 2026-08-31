import {
  isExactWorkspace,
  type ScreenId,
  type Workspace,
} from '../../contracts/v1/index.js';
import type {
  DisplayAccessRepository,
  DisplayAccessSnapshot,
  DisplayAccessTransaction,
} from '../../ports/display-access.js';

interface StoredDisplayAccess {
  readonly workspace: Workspace;
  readonly screenId: ScreenId;
  state: DisplayAccessSnapshot;
}

function key(workspace: Workspace, screenId: ScreenId): string {
  return `${workspace.kind}:${workspace.workspaceId}:${screenId}`;
}

function clone(state: DisplayAccessSnapshot): DisplayAccessSnapshot {
  return structuredClone(state);
}

export class InMemoryDisplayAccessRepository implements DisplayAccessRepository {
  readonly #records = new Map<string, StoredDisplayAccess>();
  readonly #queues = new Map<string, Promise<void>>();

  constructor(
    initial: readonly {
      readonly workspace: Workspace;
      readonly screenId: ScreenId;
      readonly state: DisplayAccessSnapshot;
    }[] = [],
  ) {
    for (const record of initial) {
      this.#records.set(key(record.workspace, record.screenId), {
        workspace: structuredClone(record.workspace),
        screenId: record.screenId,
        state: clone(record.state),
      });
    }
  }

  async read(
    workspace: Workspace,
    screenId: ScreenId,
  ): Promise<DisplayAccessSnapshot> {
    const record = this.#records.get(key(workspace, screenId));
    if (
      record === undefined ||
      !isExactWorkspace(record.workspace, workspace)
    ) {
      return {
        classCodeState: null,
        verifier: null,
        viewerSessions: [],
        admissionFailures: [],
      };
    }
    return clone(record.state);
  }

  async transact<T>(
    workspace: Workspace,
    screenId: ScreenId,
    transition: (current: DisplayAccessSnapshot) => DisplayAccessTransaction<T>,
  ): Promise<T> {
    const recordKey = key(workspace, screenId);
    const previous = this.#queues.get(recordKey) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#queues.set(
      recordKey,
      previous.then(() => current),
    );
    await previous;
    try {
      const stored = this.#records.get(recordKey);
      if (
        stored !== undefined &&
        !isExactWorkspace(stored.workspace, workspace)
      ) {
        throw new TypeError('Display access workspace mismatch.');
      }
      const before = stored?.state ?? {
        classCodeState: null,
        verifier: null,
        viewerSessions: [],
        admissionFailures: [],
      };
      const next = transition(clone(before));
      this.#records.set(recordKey, {
        workspace: structuredClone(workspace),
        screenId,
        state: clone(next.state),
      });
      return structuredClone(next.result);
    } finally {
      release();
      if (this.#queues.get(recordKey) === current)
        this.#queues.delete(recordKey);
    }
  }
}
