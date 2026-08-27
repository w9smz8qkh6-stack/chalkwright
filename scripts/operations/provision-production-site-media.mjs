#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import {
  chmodSync,
  chownSync,
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSiteMedia } from '../setup-site-media.mjs';

const defaultRequestPath = '/tmp/chalkwright-site-profile.json';
const defaultServerConfigPath = '/etc/chalkwright/production/server.json';

export async function provisionProductionSiteMedia(options = {}) {
  if ((options.effectiveUid ?? process.geteuid()) !== 0)
    throw new Error('production-site-media-root-required');
  const requestPath = options.requestPath ?? defaultRequestPath;
  const serverConfigPath = options.serverConfigPath ?? defaultServerConfigPath;
  const requesterUid = Number(options.requesterUid ?? process.env.SUDO_UID);
  if (!Number.isSafeInteger(requesterUid) || requesterUid < 1)
    throw new Error('production-site-media-requester-invalid');
  const request = readOwnedFile(requestPath, requesterUid, 128 * 1024);
  const server = readOwnerOnlyJson(serverConfigPath);
  if (
    server.value.version !== 1 ||
    typeof server.value.managedRoot !== 'string' ||
    !isAbsolute(server.value.managedRoot) ||
    resolve(server.value.managedRoot) !== server.value.managedRoot ||
    !/(?:^|[-_/])production(?:[-_/]|$)/u.test(server.value.managedRoot)
  )
    throw new Error('production-site-media-config-invalid');
  const managed = lstatSync(server.value.managedRoot);
  if (
    !managed.isDirectory() ||
    managed.isSymbolicLink() ||
    managed.uid !== server.uid ||
    realpathSync(server.value.managedRoot) !== server.value.managedRoot
  )
    throw new Error('production-site-media-root-invalid');

  const profileHash = createHash('sha256').update(request.bytes).digest('hex');
  const outputDirectory = join(
    server.value.managedRoot,
    `site-media-${profileHash.slice(0, 16)}`,
  );
  const backupPath = `${serverConfigPath}.before-site-media-${profileHash.slice(0, 12)}`;
  let outputCreated = false;
  let backupCreated = false;
  try {
    const result = await buildSiteMedia(requestPath, outputDirectory);
    outputCreated = true;
    setTreeOwnership(outputDirectory, server.uid, server.gid);
    writeOwnerOnlyFile(backupPath, server.bytes, server.uid, server.gid);
    backupCreated = true;
    const next = {
      ...server.value,
      siteMediaManifestReference: result.manifestReference,
    };
    replaceOwnerOnlyJson(serverConfigPath, next, server.uid, server.gid);
    rmSync(requestPath);
    return {
      status: 'production-site-media-provisioned',
      assets: result.assets,
      schoolLogo: next.siteMediaManifestReference !== undefined,
      configBackupsCreated: 1,
      providerRequests: 0,
      servicesStarted: 0,
    };
  } catch (error) {
    if (outputCreated && !backupCreated)
      rmSync(outputDirectory, { recursive: true, force: true });
    throw error;
  }
}

function readOwnedFile(path, uid, maximumBytes) {
  const metadata = lstatSync(path);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.nlink !== 1 ||
    metadata.uid !== uid ||
    (metadata.mode & 0o077) !== 0 ||
    metadata.size < 2 ||
    metadata.size > maximumBytes ||
    realpathSync(path) !== path
  )
    throw new Error('production-site-media-request-invalid');
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(descriptor);
    if (opened.dev !== metadata.dev || opened.ino !== metadata.ino)
      throw new Error('production-site-media-request-invalid');
    return { bytes: readFileSync(descriptor) };
  } finally {
    closeSync(descriptor);
  }
}

function readOwnerOnlyJson(path) {
  const metadata = lstatSync(path);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.nlink !== 1 ||
    (metadata.mode & 0o077) !== 0 ||
    metadata.size < 2 ||
    metadata.size > 128 * 1024 ||
    realpathSync(path) !== path
  )
    throw new Error('production-site-media-config-invalid');
  const bytes = readFileSync(path);
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error('production-site-media-config-invalid');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new Error('production-site-media-config-invalid');
  return { value, bytes, uid: metadata.uid, gid: metadata.gid };
}

function setTreeOwnership(path, uid, gid) {
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink())
    throw new Error('production-site-media-output-invalid');
  chownSync(path, uid, gid);
  chmodSync(path, metadata.isDirectory() ? 0o700 : 0o600);
  if (metadata.isDirectory())
    for (const name of readdirSync(path))
      setTreeOwnership(join(path, name), uid, gid);
}

function writeOwnerOnlyFile(path, bytes, uid, gid) {
  const descriptor = openSync(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    chownSync(path, uid, gid);
    chmodSync(path, 0o600);
  } finally {
    closeSync(descriptor);
  }
}

function replaceOwnerOnlyJson(path, value, uid, gid) {
  const candidate = join(dirname(path), `.site-media-${randomUUID()}`);
  try {
    writeOwnerOnlyFile(
      candidate,
      Buffer.from(`${JSON.stringify(value, null, 2)}\n`),
      uid,
      gid,
    );
    renameSync(candidate, path);
  } finally {
    rmSync(candidate, { force: true });
  }
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  provisionProductionSiteMedia()
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : 'production-site-media-failed'}\n`,
      );
      process.exitCode = 1;
    });
}
