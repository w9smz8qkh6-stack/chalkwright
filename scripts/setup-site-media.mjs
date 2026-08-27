#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const imageLimit = 20_000_000;
const videoLimit = 100_000_000;

export async function buildSiteMedia(
  profilePath,
  outputDirectory,
  fetcher = fetch,
) {
  assertNormalizedAbsolute(profilePath);
  assertNormalizedAbsolute(outputDirectory);
  const parent = dirname(outputDirectory);
  const metadata = lstatSync(profilePath);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.size > 128 * 1024
  )
    throw new Error('site-profile-invalid');
  let profile;
  try {
    profile = JSON.parse(readFileSync(profilePath, 'utf8'));
  } catch {
    throw new Error('site-profile-invalid');
  }
  if (!isSiteProfile(profile)) throw new Error('site-profile-invalid');
  if (realpathSync(parent) !== parent)
    throw new Error('site-media-output-invalid');

  const temporary = join(
    parent,
    `.${basename(outputDirectory)}.tmp-${randomUUID()}`,
  );
  mkdirSync(temporary, { mode: 0o700 });
  try {
    const manifest = { version: 1 };
    if (profile.school !== undefined) {
      const logo = await acquire(
        profile.school.logoUrl,
        temporary,
        'school-logo',
        'image',
        fetcher,
      );
      manifest.school = { name: profile.school.name, logo };
    }
    if (profile.courseCoverArtUrls !== undefined) {
      manifest.courseCoverArt = [];
      for (const [courseLabel, url] of Object.entries(
        profile.courseCoverArtUrls,
      )) {
        const slug = createHash('sha256')
          .update(courseLabel)
          .digest('hex')
          .slice(0, 16);
        const media = await acquire(
          url,
          temporary,
          `course-${slug}`,
          'image',
          fetcher,
        );
        manifest.courseCoverArt.push({ courseLabel, media });
      }
    }
    if (profile.countdownVideoUrl !== undefined) {
      manifest.countdownVideo = await acquire(
        profile.countdownVideoUrl,
        temporary,
        'countdown-video',
        'video',
        fetcher,
      );
    }
    const finalManifest = relocateManifestPaths(
      manifest,
      temporary,
      outputDirectory,
    );
    const manifestPath = join(temporary, 'manifest.json');
    writeFileSync(manifestPath, `${JSON.stringify(finalManifest, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    chmodSync(manifestPath, 0o600);
    renameSync(temporary, outputDirectory);
    return {
      status: 'site-media-ready',
      manifestReference: join(outputDirectory, 'manifest.json'),
      assets: countAssets(finalManifest),
      providerRequests: 0,
    };
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}

async function acquire(url, directory, stem, kind, fetcher) {
  const download = await fetchHttps(url, fetcher);
  const limit = kind === 'image' ? imageLimit : videoLimit;
  let bytes;
  try {
    bytes = await boundedBody(download.response, limit);
  } finally {
    download.clearTimeout();
  }
  const contentType = detectContentType(bytes, kind);
  const extension =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/jpeg'
        ? 'jpg'
        : contentType === 'image/webp'
          ? 'webp'
          : 'mp4';
  const path = join(directory, `${stem}.${extension}`);
  writeFileSync(path, bytes, { flag: 'wx', mode: 0o600 });
  chmodSync(path, 0o600);
  return {
    sourceUrl: url,
    path,
    byteLength: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    contentType,
  };
}

async function fetchHttps(source, fetcher) {
  let current = validateHttpsUrl(source);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let response;
    try {
      response = await fetcher(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': 'Chalkwright site-media setup/1' },
      });
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      clearTimeout(timeout);
      const location = response.headers.get('location');
      if (location === null || redirects === 5)
        throw new Error('site-media-download-invalid');
      current = validateHttpsUrl(new URL(location, current).href);
      continue;
    }
    if (!response.ok || response.body === null) {
      clearTimeout(timeout);
      throw new Error('site-media-download-invalid');
    }
    return { response, clearTimeout: () => clearTimeout(timeout) };
  }
  throw new Error('site-media-download-invalid');
}

async function boundedBody(response, maximumBytes) {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > maximumBytes)
    throw new Error('site-media-download-too-large');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new Error('site-media-download-too-large');
    }
    chunks.push(Buffer.from(value));
  }
  if (total < 12) throw new Error('site-media-download-invalid');
  return Buffer.concat(chunks, total);
}

export function detectContentType(bytes, kind) {
  if (kind === 'image') {
    if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
      return 'image/png';
    if (
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes.at(-2) === 0xff &&
      bytes.at(-1) === 0xd9
    )
      return 'image/jpeg';
    if (
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP'
    )
      return 'image/webp';
  } else if (bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
    return 'video/mp4';
  }
  throw new Error('site-media-type-unsupported');
}

function relocateManifestPaths(value, from, to) {
  return JSON.parse(JSON.stringify(value).replaceAll(`${from}/`, `${to}/`));
}

function countAssets(manifest) {
  return (
    (manifest.school === undefined ? 0 : 1) +
    (manifest.courseCoverArt?.length ?? 0) +
    (manifest.countdownVideo === undefined ? 0 : 1)
  );
}

function validateHttpsUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.hostname.length === 0
  )
    throw new Error('site-media-url-invalid');
  return url.href;
}

function isSiteProfile(value) {
  if (
    !isExactRecord(
      value,
      ['version'],
      ['school', 'courseCoverArtUrls', 'countdownVideoUrl'],
    ) ||
    value.version !== 1
  )
    return false;
  if (
    value.school !== undefined &&
    (!isExactRecord(value.school, ['name', 'logoUrl']) ||
      !isText(value.school.name, 120) ||
      !isHttps(value.school.logoUrl))
  )
    return false;
  if (value.courseCoverArtUrls !== undefined) {
    if (
      !isExactRecord(
        value.courseCoverArtUrls,
        [],
        Object.keys(value.courseCoverArtUrls),
      )
    )
      return false;
    const entries = Object.entries(value.courseCoverArtUrls);
    if (
      entries.length > 64 ||
      entries.some(([label, url]) => !isText(label, 160) || !isHttps(url))
    )
      return false;
  }
  if (
    value.countdownVideoUrl !== undefined &&
    !isHttps(value.countdownVideoUrl)
  )
    return false;
  return (
    value.school !== undefined ||
    value.courseCoverArtUrls !== undefined ||
    value.countdownVideoUrl !== undefined
  );
}

function isHttps(value) {
  if (typeof value !== 'string') return false;
  try {
    validateHttpsUrl(value);
    return true;
  } catch {
    return false;
  }
}

function isText(value, maximum) {
  return (
    typeof value === 'string' &&
    value.trim() === value &&
    value.length > 0 &&
    value.length <= maximum &&
    !/[\0\r\n]/u.test(value)
  );
}

function isExactRecord(value, required, optional = []) {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return false;
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function assertNormalizedAbsolute(path) {
  if (!isAbsolute(path) || resolve(path) !== path || path === '/')
    throw new Error('site-media-path-invalid');
}

async function main() {
  const args = process.argv.slice(2);
  const profileIndex = args.indexOf('--profile');
  const outputIndex = args.indexOf('--output');
  if (
    args.length !== 4 ||
    profileIndex < 0 ||
    outputIndex < 0 ||
    args[profileIndex + 1] === undefined ||
    args[outputIndex + 1] === undefined
  )
    throw new Error(
      'usage: setup-site-media --profile /absolute/site.json --output /absolute/new-directory',
    );
  const result = await buildSiteMedia(
    args[profileIndex + 1],
    args[outputIndex + 1],
  );
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'site-media-setup-failed'}\n`,
    );
    process.exitCode = 1;
  });
}
