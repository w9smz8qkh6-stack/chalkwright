import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildSiteMedia,
  detectContentType,
} from '../../scripts/setup-site-media.mjs';

const png = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63600000020001e221bc330000000049454e44ae426082',
  'hex',
);

test('downloads one site profile into a local digest-pinned manifest', async () => {
  const root = mkdtempSync(join(tmpdir(), 'chalkwright-site-setup-'));
  try {
    chmodSync(root, 0o700);
    const profile = join(root, 'site.json');
    const output = join(root, 'media');
    writeFileSync(
      profile,
      JSON.stringify({
        version: 1,
        school: {
          name: 'Example Academy',
          logoUrl: 'https://school.example/logo.png',
        },
        courseCoverArtUrls: {
          Robotics: 'https://school.example/robotics.png',
        },
      }),
      { mode: 0o600 },
    );
    const result = await buildSiteMedia(
      profile,
      output,
      async () => new Response(png, { status: 200 }),
    );
    assert.equal(result.assets, 2);
    const manifest = JSON.parse(
      readFileSync(join(output, 'manifest.json'), 'utf8'),
    );
    assert.equal(manifest.school.name, 'Example Academy');
    assert.equal(manifest.school.logo.contentType, 'image/png');
    assert.match(manifest.school.logo.path, /\/media\/school-logo\.png$/u);
    assert.equal(manifest.courseCoverArt[0].courseLabel, 'Robotics');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('recognizes only supported image signatures', () => {
  assert.equal(detectContentType(png, 'image'), 'image/png');
  assert.throws(
    () => detectContentType(Buffer.alloc(20), 'image'),
    /site-media-type-unsupported/u,
  );
});
