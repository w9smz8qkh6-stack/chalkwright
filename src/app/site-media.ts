import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

import { readProtectedJson } from '../infrastructure/filesystem/protected-json.js';
import type { HttpBinaryResource } from '../infrastructure/http/types.js';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
type SiteImageType = (typeof imageTypes)[number];

interface SiteMediaReference {
  readonly sourceUrl: string;
  readonly path: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly contentType: SiteImageType | 'video/mp4';
}

interface SiteMediaManifest {
  readonly version: 1;
  readonly school?: {
    readonly name: string;
    readonly logo: SiteMediaReference;
  };
  readonly courseCoverArt?: readonly {
    readonly courseLabel: string;
    readonly media: SiteMediaReference;
  }[];
  readonly countdownVideo?: SiteMediaReference;
}

export interface SitePresentationCustomization {
  readonly school?: {
    readonly name: string;
    readonly logoPath: string;
  };
  readonly courseBanners: Readonly<Record<string, string>>;
  readonly countdownVideoPath?: '/media/site-countdown-video';
}

export interface LoadedSiteMedia {
  readonly assets: Readonly<Record<string, HttpBinaryResource>>;
  readonly media: Readonly<Record<string, HttpBinaryResource>>;
  readonly presentation: SitePresentationCustomization;
}

const emptySiteMedia: LoadedSiteMedia = {
  assets: {},
  media: {},
  presentation: { courseBanners: {} },
};

export function loadSiteMedia(reference?: string): LoadedSiteMedia {
  if (reference === undefined) return emptySiteMedia;
  let manifest: SiteMediaManifest;
  try {
    manifest = readProtectedJson(reference, isSiteMediaManifest);
  } catch {
    throw new Error('site-media-manifest-invalid');
  }
  const root = dirname(reference);
  const assets: Record<string, HttpBinaryResource> = {};
  const media: Record<string, HttpBinaryResource> = {};
  const courseBanners: Record<string, string> = {};

  if (manifest.school !== undefined) {
    assets['site-school-logo'] = loadReference(
      manifest.school.logo,
      root,
      'image',
    );
  }
  for (const [index, cover] of (manifest.courseCoverArt ?? []).entries()) {
    const routeName = `site-course-cover-${index}`;
    assets[routeName] = loadReference(cover.media, root, 'image');
    courseBanners[cover.courseLabel] = `/assets/${routeName}`;
  }
  if (manifest.countdownVideo !== undefined) {
    media['site-countdown-video'] = loadReference(
      manifest.countdownVideo,
      root,
      'video',
    );
  }

  return {
    assets,
    media,
    presentation: {
      ...(manifest.school === undefined
        ? {}
        : {
            school: {
              name: manifest.school.name,
              logoPath: '/assets/site-school-logo' as const,
            },
          }),
      courseBanners,
      ...(manifest.countdownVideo === undefined
        ? {}
        : { countdownVideoPath: '/media/site-countdown-video' as const }),
    },
  };
}

function loadReference(
  reference: SiteMediaReference,
  root: string,
  kind: 'image' | 'video',
): HttpBinaryResource {
  try {
    if (
      !isAbsolute(reference.path) ||
      resolve(reference.path) !== reference.path ||
      !isChild(root, reference.path)
    )
      throw new Error('invalid');
    const metadata = lstatSync(reference.path);
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      metadata.nlink !== 1 ||
      metadata.size !== reference.byteLength ||
      realpathSync(reference.path) !== reference.path
    )
      throw new Error('invalid');
    const bytes = readFileSync(reference.path);
    if (
      bytes.byteLength !== reference.byteLength ||
      createHash('sha256').update(bytes).digest('hex') !== reference.sha256 ||
      !matchesSignature(bytes, reference.contentType) ||
      (kind === 'image' && !isImageType(reference.contentType)) ||
      (kind === 'video' && reference.contentType !== 'video/mp4')
    )
      throw new Error('invalid');
    return { bytes, contentType: reference.contentType };
  } catch {
    throw new Error('site-media-invalid');
  }
}

function isChild(parent: string, candidate: string): boolean {
  const relation = relative(resolve(parent), candidate);
  return (
    relation.length > 0 && !relation.startsWith('..') && !isAbsolute(relation)
  );
}

function isImageType(value: string): value is SiteImageType {
  return imageTypes.some((type) => type === value);
}

function matchesSignature(bytes: Buffer, contentType: string): boolean {
  if (contentType === 'image/png')
    return bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (contentType === 'image/jpeg')
    return (
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes.at(-2) === 0xff &&
      bytes.at(-1) === 0xd9
    );
  if (contentType === 'image/webp')
    return (
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  return (
    contentType === 'video/mp4' &&
    bytes.subarray(4, 8).toString('ascii') === 'ftyp'
  );
}

function isSiteMediaManifest(value: unknown): value is SiteMediaManifest {
  if (
    !isExactRecord(
      value,
      ['version'],
      ['school', 'courseCoverArt', 'countdownVideo'],
    )
  )
    return false;
  if (value.version !== 1) return false;
  if (
    value.school !== undefined &&
    (!isExactRecord(value.school, ['name', 'logo']) ||
      !isBoundedText(value.school.name, 120) ||
      !isMediaReference(value.school.logo, 'image'))
  )
    return false;
  if (
    value.courseCoverArt !== undefined &&
    (!Array.isArray(value.courseCoverArt) ||
      value.courseCoverArt.length > 64 ||
      value.courseCoverArt.some(
        (entry) =>
          !isExactRecord(entry, ['courseLabel', 'media']) ||
          !isBoundedText(entry.courseLabel, 160) ||
          !isMediaReference(entry.media, 'image'),
      ) ||
      new Set(value.courseCoverArt.map((entry) => entry.courseLabel)).size !==
        value.courseCoverArt.length)
  )
    return false;
  return (
    value.countdownVideo === undefined ||
    isMediaReference(value.countdownVideo, 'video')
  );
}

function isMediaReference(
  value: unknown,
  kind: 'image' | 'video',
): value is SiteMediaReference {
  if (
    !isExactRecord(value, [
      'sourceUrl',
      'path',
      'byteLength',
      'sha256',
      'contentType',
    ])
  )
    return false;
  let url: URL;
  try {
    url = new URL(value.sourceUrl as string);
  } catch {
    return false;
  }
  const contentType = value.contentType;
  const maximumBytes = kind === 'image' ? 20_000_000 : 100_000_000;
  return (
    typeof value.sourceUrl === 'string' &&
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    typeof value.path === 'string' &&
    typeof value.byteLength === 'number' &&
    Number.isSafeInteger(value.byteLength) &&
    value.byteLength >= 12 &&
    value.byteLength <= maximumBytes &&
    typeof value.sha256 === 'string' &&
    /^[a-f0-9]{64}$/u.test(value.sha256) &&
    typeof contentType === 'string' &&
    (kind === 'image' ? isImageType(contentType) : contentType === 'video/mp4')
  );
}

function isExactRecord(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return false;
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function isBoundedText(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim() === value &&
    value.length > 0 &&
    value.length <= maximum &&
    !/[\0\r\n]/u.test(value)
  );
}
