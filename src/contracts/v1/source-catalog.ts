import { contractVersion, type ContractEnvelope } from './common.js';
import {
  hasExactKeys,
  isDenseArray,
  isPlainObject,
} from './state-contract-validation.js';

export const sourceContractVersion = 1 as const;

export const sourceModes = [
  'application-managed',
  'uploaded-snapshot',
  'shared-resource',
  'connected-account',
] as const;
export type SourceMode = (typeof sourceModes)[number];

export const sourceStreams = [
  'identity-presentation',
  'course-catalog-mapping',
  'schedule-bells',
  'calendar-exceptions',
  'assignments-links',
  'objectives-lessons',
  'vocabulary-translations-pronunciation',
  'branding-display-media',
  'attendance-destination',
  'presentation-controls',
] as const;
export type SourceStream = (typeof sourceStreams)[number];

export type SourceReleaseDisposition =
  'first-release' | 'later' | 'not-applicable';

export interface SourceModeAvailability extends ContractEnvelope {
  readonly sourceContractVersion: typeof sourceContractVersion;
  readonly stream: SourceStream;
  readonly modes: Readonly<Record<SourceMode, SourceReleaseDisposition>>;
}

export const sourceModeAvailability: readonly SourceModeAvailability[] = [
  {
    contractVersion,
    sourceContractVersion,
    stream: 'identity-presentation',
    modes: {
      'application-managed': 'first-release',
      'uploaded-snapshot': 'later',
      'shared-resource': 'not-applicable',
      'connected-account': 'later',
    },
  },
  {
    contractVersion,
    sourceContractVersion,
    stream: 'course-catalog-mapping',
    modes: {
      'application-managed': 'first-release',
      'uploaded-snapshot': 'first-release',
      'shared-resource': 'first-release',
      'connected-account': 'later',
    },
  },
  {
    contractVersion,
    sourceContractVersion,
    stream: 'schedule-bells',
    modes: {
      'application-managed': 'first-release',
      'uploaded-snapshot': 'first-release',
      'shared-resource': 'first-release',
      'connected-account': 'later',
    },
  },
  {
    contractVersion,
    sourceContractVersion,
    stream: 'calendar-exceptions',
    modes: {
      'application-managed': 'first-release',
      'uploaded-snapshot': 'first-release',
      'shared-resource': 'first-release',
      'connected-account': 'later',
    },
  },
  {
    contractVersion,
    sourceContractVersion,
    stream: 'assignments-links',
    modes: {
      'application-managed': 'first-release',
      'uploaded-snapshot': 'first-release',
      'shared-resource': 'first-release',
      'connected-account': 'later',
    },
  },
  {
    contractVersion,
    sourceContractVersion,
    stream: 'objectives-lessons',
    modes: {
      'application-managed': 'first-release',
      'uploaded-snapshot': 'first-release',
      'shared-resource': 'first-release',
      'connected-account': 'later',
    },
  },
  {
    contractVersion,
    sourceContractVersion,
    stream: 'vocabulary-translations-pronunciation',
    modes: {
      'application-managed': 'first-release',
      'uploaded-snapshot': 'first-release',
      'shared-resource': 'first-release',
      'connected-account': 'later',
    },
  },
  {
    contractVersion,
    sourceContractVersion,
    stream: 'branding-display-media',
    modes: {
      'application-managed': 'first-release',
      'uploaded-snapshot': 'first-release',
      'shared-resource': 'later',
      'connected-account': 'later',
    },
  },
  {
    contractVersion,
    sourceContractVersion,
    stream: 'attendance-destination',
    modes: {
      'application-managed': 'first-release',
      'uploaded-snapshot': 'not-applicable',
      'shared-resource': 'not-applicable',
      'connected-account': 'later',
    },
  },
  {
    contractVersion,
    sourceContractVersion,
    stream: 'presentation-controls',
    modes: {
      'application-managed': 'first-release',
      'uploaded-snapshot': 'not-applicable',
      'shared-resource': 'not-applicable',
      'connected-account': 'not-applicable',
    },
  },
] as const;

export const logicalSourceFormats = [
  'canonical-records-v1',
  'utf8-csv-v1',
  'utf8-icalendar-v1',
  'reviewed-https-reference-v1',
  'raster-png-v1',
  'raster-jpeg-v1',
  'raster-webp-v1',
  'display-mp4-v1',
  'provider-projection-v1',
] as const;
export type LogicalSourceFormat = (typeof logicalSourceFormats)[number];

export interface TextFormatBudget {
  readonly kind: 'records';
  readonly maximumBytes: number;
  readonly maximumRecords: number;
  readonly maximumFieldsPerRecord: number;
  readonly maximumFieldBytes: number;
  readonly maximumProcessingMilliseconds: number;
}

export interface RasterFormatBudget {
  readonly kind: 'raster';
  readonly maximumBytes: number;
  readonly maximumWidth: number;
  readonly maximumHeight: number;
  readonly maximumPixels: number;
  readonly maximumFrames: 1;
  readonly maximumProcessingMilliseconds: number;
  readonly derivedArtifactPolicy: 'reencode-required';
}

export interface VideoFormatBudget {
  readonly kind: 'video';
  readonly maximumBytes: number;
  readonly maximumWidth: number;
  readonly maximumHeight: number;
  readonly maximumDurationMilliseconds: number;
  readonly maximumFrameRate: number;
  readonly maximumProcessingMilliseconds: number;
  readonly derivedArtifactPolicy: 'transcode-required';
}

export interface ReferenceFormatBudget {
  readonly kind: 'reference';
  readonly maximumBytes: number;
  readonly maximumProcessingMilliseconds: number;
}

export type SourceFormatBudget =
  | TextFormatBudget
  | RasterFormatBudget
  | VideoFormatBudget
  | ReferenceFormatBudget;

export const sourceFormatBudgets: Readonly<
  Record<LogicalSourceFormat, SourceFormatBudget>
> = {
  'canonical-records-v1': {
    kind: 'records',
    maximumBytes: 262_144,
    maximumRecords: 2_000,
    maximumFieldsPerRecord: 64,
    maximumFieldBytes: 4_096,
    maximumProcessingMilliseconds: 2_000,
  },
  'utf8-csv-v1': {
    kind: 'records',
    maximumBytes: 1_048_576,
    maximumRecords: 5_000,
    maximumFieldsPerRecord: 64,
    maximumFieldBytes: 4_096,
    maximumProcessingMilliseconds: 3_000,
  },
  'utf8-icalendar-v1': {
    kind: 'records',
    maximumBytes: 524_288,
    maximumRecords: 2_000,
    maximumFieldsPerRecord: 64,
    maximumFieldBytes: 4_096,
    maximumProcessingMilliseconds: 3_000,
  },
  'reviewed-https-reference-v1': {
    kind: 'reference',
    maximumBytes: 2_048,
    maximumProcessingMilliseconds: 250,
  },
  'raster-png-v1': {
    kind: 'raster',
    maximumBytes: 8_388_608,
    maximumWidth: 8_192,
    maximumHeight: 8_192,
    maximumPixels: 40_000_000,
    maximumFrames: 1,
    maximumProcessingMilliseconds: 5_000,
    derivedArtifactPolicy: 'reencode-required',
  },
  'raster-jpeg-v1': {
    kind: 'raster',
    maximumBytes: 8_388_608,
    maximumWidth: 8_192,
    maximumHeight: 8_192,
    maximumPixels: 40_000_000,
    maximumFrames: 1,
    maximumProcessingMilliseconds: 5_000,
    derivedArtifactPolicy: 'reencode-required',
  },
  'raster-webp-v1': {
    kind: 'raster',
    maximumBytes: 8_388_608,
    maximumWidth: 8_192,
    maximumHeight: 8_192,
    maximumPixels: 40_000_000,
    maximumFrames: 1,
    maximumProcessingMilliseconds: 5_000,
    derivedArtifactPolicy: 'reencode-required',
  },
  'display-mp4-v1': {
    kind: 'video',
    maximumBytes: 67_108_864,
    maximumWidth: 3_840,
    maximumHeight: 2_160,
    maximumDurationMilliseconds: 120_000,
    maximumFrameRate: 60,
    maximumProcessingMilliseconds: 10_000,
    derivedArtifactPolicy: 'transcode-required',
  },
  'provider-projection-v1': {
    kind: 'records',
    maximumBytes: 1_048_576,
    maximumRecords: 5_000,
    maximumFieldsPerRecord: 64,
    maximumFieldBytes: 4_096,
    maximumProcessingMilliseconds: 3_000,
  },
} as const;

export const sourceTransactionBudget = {
  maximumDefinitions: 32,
  maximumTotalBytes: 67_108_864,
  maximumTotalRecords: 10_000,
  maximumProcessingMilliseconds: 15_000,
} as const;

export const sourceStreamFormats: Readonly<
  Record<
    SourceStream,
    Readonly<Partial<Record<SourceMode, readonly LogicalSourceFormat[]>>>
  >
> = {
  'identity-presentation': {
    'application-managed': ['canonical-records-v1'],
  },
  'course-catalog-mapping': {
    'application-managed': ['canonical-records-v1'],
    'uploaded-snapshot': ['utf8-csv-v1'],
    'shared-resource': ['utf8-csv-v1'],
    'connected-account': ['provider-projection-v1'],
  },
  'schedule-bells': {
    'application-managed': ['canonical-records-v1'],
    'uploaded-snapshot': ['utf8-csv-v1'],
    'shared-resource': ['utf8-icalendar-v1'],
    'connected-account': ['provider-projection-v1'],
  },
  'calendar-exceptions': {
    'application-managed': ['canonical-records-v1'],
    'uploaded-snapshot': ['utf8-csv-v1', 'utf8-icalendar-v1'],
    'shared-resource': ['utf8-icalendar-v1'],
    'connected-account': ['provider-projection-v1'],
  },
  'assignments-links': {
    'application-managed': ['canonical-records-v1'],
    'uploaded-snapshot': ['utf8-csv-v1'],
    'shared-resource': ['utf8-csv-v1'],
    'connected-account': ['provider-projection-v1'],
  },
  'objectives-lessons': {
    'application-managed': ['canonical-records-v1'],
    'uploaded-snapshot': ['utf8-csv-v1'],
    'shared-resource': ['utf8-csv-v1'],
    'connected-account': ['provider-projection-v1'],
  },
  'vocabulary-translations-pronunciation': {
    'application-managed': ['canonical-records-v1'],
    'uploaded-snapshot': ['utf8-csv-v1'],
    'shared-resource': ['utf8-csv-v1'],
    'connected-account': ['provider-projection-v1'],
  },
  'branding-display-media': {
    'application-managed': ['canonical-records-v1'],
    'uploaded-snapshot': [
      'raster-png-v1',
      'raster-jpeg-v1',
      'raster-webp-v1',
      'display-mp4-v1',
    ],
  },
  'attendance-destination': {
    'application-managed': ['reviewed-https-reference-v1'],
  },
  'presentation-controls': {
    'application-managed': ['canonical-records-v1'],
  },
} as const;

export const deferredSourceBoundaries = [
  'rosters-deferred',
  'attendance-administration-deferred',
  'hosted-powerschool-browser-profile-excluded',
  'automatic-translation-deferred',
  'hosted-calendar-write-not-a-source-and-unapproved',
] as const;
export type DeferredSourceBoundary = (typeof deferredSourceBoundaries)[number];

export function isSourceStream(value: unknown): value is SourceStream {
  return sourceStreams.includes(value as SourceStream);
}

export function isSourceMode(value: unknown): value is SourceMode {
  return sourceModes.includes(value as SourceMode);
}

export function isLogicalSourceFormat(
  value: unknown,
): value is LogicalSourceFormat {
  return logicalSourceFormats.includes(value as LogicalSourceFormat);
}

export function isFormatAllowedForSource(
  stream: SourceStream,
  mode: SourceMode,
  format: LogicalSourceFormat,
): boolean {
  return sourceStreamFormats[stream][mode]?.includes(format) ?? false;
}

export function isSourceModeAvailabilityMatrix(
  value: unknown,
): value is readonly SourceModeAvailability[] {
  if (!isDenseArray(value) || value.length !== sourceStreams.length) {
    return false;
  }
  const seen = new Set<SourceStream>();
  for (const entry of value) {
    if (
      !isPlainObject(entry) ||
      !hasExactKeys(entry, [
        'contractVersion',
        'sourceContractVersion',
        'stream',
        'modes',
      ]) ||
      entry.contractVersion !== contractVersion ||
      entry.sourceContractVersion !== sourceContractVersion ||
      !isSourceStream(entry.stream) ||
      seen.has(entry.stream) ||
      !isPlainObject(entry.modes) ||
      !hasExactKeys(entry.modes, [...sourceModes])
    ) {
      return false;
    }
    const stream = entry.stream;
    const modes = entry.modes;
    const expected = sourceModeAvailability.find(
      (candidate) => candidate.stream === stream,
    );
    if (expected === undefined) return false;
    seen.add(stream);
    for (const mode of sourceModes) {
      if (
        !['first-release', 'later', 'not-applicable'].includes(
          modes[mode] as string,
        ) ||
        modes[mode] !== expected.modes[mode]
      ) {
        return false;
      }
    }
    if (
      !(
        ['application-managed', 'uploaded-snapshot', 'shared-resource'] as const
      ).some((mode) => modes[mode] === 'first-release')
    ) {
      return false;
    }
  }
  return seen.size === sourceStreams.length;
}
