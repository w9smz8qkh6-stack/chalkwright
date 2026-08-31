import { createHash } from 'node:crypto';

import {
  isExactWorkspace,
  type CoreGoal1PlannedFrameFixture,
  type SelfHostedWorkspace,
  type ScreenId,
} from '../../contracts/v1/index.js';
import type { VersionedConfigurationService } from '../configuration/versioned-configuration-service.js';

export type PlannedDisplayProjectionStatus =
  'ready' | 'empty' | 'not-configured' | 'screen-not-found' | 'unavailable';

export interface PlannedDisplayProjection {
  readonly status: PlannedDisplayProjectionStatus;
  readonly schoolDate: string;
  readonly screenId: ScreenId;
  readonly basisRevisionId: string | null;
  readonly inputFingerprint: `sha256:${string}` | null;
  readonly freshness: 'current-revision' | 'not-configured' | 'unavailable';
  readonly cacheDisposition: 'rolling-window' | 'on-demand';
  readonly mutationFree: true;
  readonly frames: readonly CoreGoal1PlannedFrameFixture[];
}

export interface PlannedDisplaySelection {
  readonly schoolDate: string;
  readonly screenId: ScreenId;
}

const rollingDays = 7;
const maximumCachedProjections = 16;

function isoDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function utcDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 86_400_000) : null;
}

function stableFingerprint(value: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

/**
 * C09 projects already-injected, normalized frames only. It cannot acquire
 * source data, construct a provider client, or mutate Calendar/configuration
 * state. The small cache retains only a bounded date/screen view.
 */
export class PlannedDisplayProjectionService {
  #cache = new Map<string, PlannedDisplayProjection>();

  constructor(
    readonly workspace: SelfHostedWorkspace,
    readonly configuration: VersionedConfigurationService,
    readonly frames: readonly CoreGoal1PlannedFrameFixture[],
    readonly now: () => Date = () => new Date(),
    readonly projectionBasisRevisionId: string | null = null,
  ) {}

  defaultSelection(): PlannedDisplaySelection | null {
    const first = [...this.frames]
      .sort((left, right) => left.sequence - right.sequence)
      .at(0);
    return first === undefined
      ? null
      : { schoolDate: first.schoolDate, screenId: first.screenId };
  }

  async project(
    selection: PlannedDisplaySelection,
  ): Promise<PlannedDisplayProjection> {
    const cacheDisposition = this.#cacheDisposition(selection.schoolDate);
    const key = `${selection.schoolDate}\u0000${selection.screenId}`;
    const cached = this.#cache.get(key);
    if (cached !== undefined) return structuredClone(cached);

    const effective = await this.configuration.readEffectiveConfiguration(
      this.workspace,
    );
    if (effective.status === 'not-configured') {
      return this.#remember(key, {
        status: 'not-configured',
        schoolDate: selection.schoolDate,
        screenId: selection.screenId,
        basisRevisionId: null,
        inputFingerprint: null,
        freshness: 'not-configured',
        cacheDisposition,
        mutationFree: true,
        frames: [],
      });
    }
    if (
      effective.status !== 'ready' ||
      !isExactWorkspace(effective.configuration.workspace, this.workspace)
    ) {
      return this.#remember(key, {
        status: 'unavailable',
        schoolDate: selection.schoolDate,
        screenId: selection.screenId,
        basisRevisionId: null,
        inputFingerprint: null,
        freshness: 'unavailable',
        cacheDisposition,
        mutationFree: true,
        frames: [],
      });
    }
    if (
      !effective.configuration.screens.some(
        (screen) => screen.screenId === selection.screenId,
      )
    ) {
      return this.#remember(key, {
        status: 'screen-not-found',
        schoolDate: selection.schoolDate,
        screenId: selection.screenId,
        basisRevisionId: this.projectionBasisRevisionId ?? effective.revisionId,
        inputFingerprint: null,
        freshness: 'current-revision',
        cacheDisposition,
        mutationFree: true,
        frames: [],
      });
    }

    const frames = this.frames
      .filter((frame) => frame.schoolDate === selection.schoolDate)
      .sort((left, right) => left.sequence - right.sequence)
      .map((frame) => structuredClone(frame));
    const inputFingerprint = stableFingerprint({
      revisionId: this.projectionBasisRevisionId ?? effective.revisionId,
      schoolDate: selection.schoolDate,
      screenId: selection.screenId,
      frames,
    });
    return this.#remember(key, {
      status: frames.length === 0 ? 'empty' : 'ready',
      schoolDate: selection.schoolDate,
      screenId: selection.screenId,
      basisRevisionId: this.projectionBasisRevisionId ?? effective.revisionId,
      inputFingerprint,
      freshness: 'current-revision',
      cacheDisposition,
      mutationFree: true,
      frames,
    });
  }

  #cacheDisposition(schoolDate: string): 'rolling-window' | 'on-demand' {
    const selectedDay = utcDay(schoolDate);
    const today = utcDay(isoDate(this.now()));
    return selectedDay !== null &&
      today !== null &&
      selectedDay >= today &&
      selectedDay < today + rollingDays
      ? 'rolling-window'
      : 'on-demand';
  }

  #remember(
    key: string,
    projection: PlannedDisplayProjection,
  ): PlannedDisplayProjection {
    this.#cache.delete(key);
    this.#cache.set(key, structuredClone(projection));
    while (this.#cache.size > maximumCachedProjections) {
      const oldest = this.#cache.keys().next().value;
      if (oldest === undefined) break;
      this.#cache.delete(oldest);
    }
    return structuredClone(projection);
  }
}
