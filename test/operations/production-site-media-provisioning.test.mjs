import assert from 'node:assert/strict';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { provisionProductionSiteMedia } from '../../scripts/operations/provision-production-site-media.mjs';

test('atomically provisions a local logo and updates the protected server reference', async () => {
  const root = mkdtempSync(
    join(tmpdir(), 'chalkwright-production-site-media-'),
  );
  try {
    chmodSync(root, 0o700);
    const managedRoot = join(root, 'runtime-production');
    const configDirectory = join(root, 'config');
    mkdirSync(managedRoot, { mode: 0o700 });
    mkdirSync(configDirectory, { mode: 0o700 });
    const logo = join(root, 'legacy-logo.webp');
    writeFileSync(
      logo,
      Buffer.concat([
        Buffer.from('RIFF'),
        Buffer.alloc(4),
        Buffer.from('WEBPVP8 '),
        Buffer.alloc(12),
      ]),
      { mode: 0o600 },
    );
    const requestPath = join(root, 'request.json');
    writeFileSync(
      requestPath,
      JSON.stringify({
        version: 1,
        school: { name: 'Example Academy', logoFile: logo },
      }),
      { mode: 0o600 },
    );
    const serverConfigPath = join(configDirectory, 'server.json');
    writeFileSync(
      serverConfigPath,
      `${JSON.stringify({ version: 1, managedRoot }, null, 2)}\n`,
      { mode: 0o600 },
    );
    const uid = process.geteuid();
    const result = await provisionProductionSiteMedia({
      effectiveUid: 0,
      requesterUid: uid,
      requestPath,
      serverConfigPath,
    });
    assert.equal(result.status, 'production-site-media-provisioned');
    assert.equal(result.providerRequests, 0);
    const config = JSON.parse(readFileSync(serverConfigPath, 'utf8'));
    assert.match(
      config.siteMediaManifestReference,
      /site-media-[a-f0-9]{16}\/manifest\.json$/u,
    );
    assert.equal(lstatSync(config.siteMediaManifestReference).mode & 0o077, 0);
    assert.equal(lstatSync(requestPath, { throwIfNoEntry: false }), undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('production importer executes when invoked through the current-release symlink', () => {
  const root = mkdtempSync(join(tmpdir(), 'chalkwright-site-media-link-'));
  try {
    const linkedEntrypoint = join(root, 'provision-production-site-media.mjs');
    symlinkSync(
      join(
        process.cwd(),
        'scripts/operations/provision-production-site-media.mjs',
      ),
      linkedEntrypoint,
    );
    const result = spawnSync(process.execPath, [linkedEntrypoint], {
      encoding: 'utf8',
      env: {},
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /production-site-media-root-required/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
