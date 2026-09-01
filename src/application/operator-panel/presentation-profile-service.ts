import type { SelfHostedWorkspace } from '../../contracts/v1/index.js';

export const presentationThemes = ['slate', 'daylight'] as const;
export const presentationTransitions = ['gentle', 'snappy', 'none'] as const;
export const presentationLanguages = ['en', 'vi'] as const;

export interface PresentationProfile {
  readonly theme: (typeof presentationThemes)[number];
  readonly transition: (typeof presentationTransitions)[number];
  readonly dwellSeconds: number;
  readonly language: (typeof presentationLanguages)[number];
  readonly reducedMotion: 'respect-preference' | 'always';
}

export interface PresentationProfileProjection {
  readonly workspaceId: string;
  readonly revision: number;
  readonly profile: PresentationProfile;
  readonly previewOnly: true;
  readonly contentTruthUnchanged: true;
  readonly persistence: 'in-memory-synthetic';
}

export type SavePresentationProfileResult =
  | {
      readonly status: 'saved';
      readonly projection: PresentationProfileProjection;
    }
  | { readonly status: 'rejected'; readonly reason: string };

const defaultProfile: PresentationProfile = {
  theme: 'slate',
  transition: 'gentle',
  dwellSeconds: 12,
  language: 'en',
  reducedMotion: 'respect-preference',
};

function oneOf<Value extends string>(
  value: string | undefined,
  values: readonly Value[],
): Value | null {
  return value !== undefined && (values as readonly string[]).includes(value)
    ? (value as Value)
    : null;
}

/**
 * C12's bounded Core presentation seam. It deliberately keeps profile state
 * separate from configuration/content truth and does not acquire translations,
 * media, provider data, or a public viewer route. A durable adapter follows in
 * the later Core distribution work.
 */
export class PresentationProfileService {
  #revision = 1;
  #profile: PresentationProfile = structuredClone(defaultProfile);

  constructor(readonly workspace: SelfHostedWorkspace) {}

  project(): PresentationProfileProjection {
    return {
      workspaceId: this.workspace.workspaceId,
      revision: this.#revision,
      profile: structuredClone(this.#profile),
      previewOnly: true,
      contentTruthUnchanged: true,
      persistence: 'in-memory-synthetic',
    };
  }

  save(
    fields: Readonly<Record<string, string>>,
  ): SavePresentationProfileResult {
    const theme = oneOf(fields.theme, presentationThemes);
    const transition = oneOf(fields.transition, presentationTransitions);
    const language = oneOf(fields.language, presentationLanguages);
    const reducedMotion = oneOf(fields.reducedMotion, [
      'respect-preference',
      'always',
    ] as const);
    const dwellSeconds = Number(fields.dwellSeconds);
    if (
      theme === null ||
      transition === null ||
      language === null ||
      reducedMotion === null ||
      !Number.isInteger(dwellSeconds) ||
      dwellSeconds < 5 ||
      dwellSeconds > 60
    ) {
      return { status: 'rejected', reason: 'invalid-presentation-profile' };
    }
    this.#profile = {
      theme,
      transition,
      language,
      reducedMotion,
      dwellSeconds,
    };
    this.#revision += 1;
    return { status: 'saved', projection: this.project() };
  }

  reset(): PresentationProfileProjection {
    this.#profile = structuredClone(defaultProfile);
    this.#revision += 1;
    return this.project();
  }
}
