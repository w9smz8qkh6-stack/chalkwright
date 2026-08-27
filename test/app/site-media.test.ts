import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { loadSiteMedia } from '../../src/app/site-media.js';
import { writeNewProtectedJson } from '../../src/infrastructure/filesystem/protected-json.js';

const png = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63600000020001e221bc330000000049454e44ae426082',
  'hex',
);

test('loads digest-pinned school branding and course cover art from one local manifest', () => {
  const root = mkdtempSync(join(tmpdir(), 'chalkwright-site-media-'));
  try {
    chmodSync(root, 0o700);
    const logoPath = join(root, 'school-logo.png');
    const coverPath = join(root, 'course-cover.png');
    writeFileSync(logoPath, png, { mode: 0o600 });
    writeFileSync(coverPath, png, { mode: 0o600 });
    const reference = (path: string, sourceUrl: string) => ({
      sourceUrl,
      path,
      byteLength: png.byteLength,
      sha256: createHash('sha256').update(png).digest('hex'),
      contentType: 'image/png',
    });
    const manifest = join(root, 'manifest.json');
    writeNewProtectedJson(manifest, {
      version: 1,
      school: {
        name: 'Example Academy',
        logo: reference(logoPath, 'https://school.example/logo.png'),
      },
      courseCoverArt: [
        {
          courseLabel: 'Robotics',
          media: reference(coverPath, 'https://school.example/robotics.png'),
        },
      ],
    });

    const loaded = loadSiteMedia(manifest);
    assert.equal(loaded.presentation.school?.name, 'Example Academy');
    assert.equal(
      loaded.presentation.courseBanners.Robotics,
      '/assets/site-course-cover-0',
    );
    assert.equal(loaded.assets['site-school-logo']?.contentType, 'image/png');
    assert.deepEqual(
      Buffer.from(loaded.assets['site-course-cover-0']?.bytes ?? []),
      png,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects digest drift and media outside the manifest directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'chalkwright-site-media-'));
  try {
    chmodSync(root, 0o700);
    const outside = mkdtempSync(
      join(tmpdir(), 'chalkwright-site-media-outside-'),
    );
    chmodSync(outside, 0o700);
    const path = join(outside, 'logo.png');
    writeFileSync(path, png, { mode: 0o600 });
    const manifest = join(root, 'manifest.json');
    writeNewProtectedJson(manifest, {
      version: 1,
      school: {
        name: 'Example Academy',
        logo: {
          sourceUrl: 'https://school.example/logo.png',
          path,
          byteLength: png.byteLength,
          sha256: '0'.repeat(64),
          contentType: 'image/png',
        },
      },
    });
    assert.throws(() => loadSiteMedia(manifest), /site-media-invalid/u);
    rmSync(outside, { recursive: true, force: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
