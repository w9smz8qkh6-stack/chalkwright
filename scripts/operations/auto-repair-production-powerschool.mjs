import { spawnSync } from 'node:child_process';
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  unlinkSync,
} from 'node:fs';
import { pathToFileURL } from 'node:url';

const planUnit = 'chalkwright-plan-refresh.service';
const downstreamReadUnits = [
  'chalkwright-classroom-refresh.service',
  'chalkwright-glossary-refresh.service',
];
const sessionDirectory = '/var/lib/chalkwright/production-session';
const sessionLock = `${sessionDirectory}/.classroom-hub-session.lock`;
const repairController =
  '/usr/local/lib/chalkwright-production-admin/repair-production-powerschool.sh';
const serviceUid = 972;
const serviceGid = 972;
const minimumSameBootStaleAgeMs = 4 * 60 * 1_000;
const maximumRepairAttempts = 3;
const repairRetryDelayMs = 30 * 1_000;

export function classifyStalePowerSchoolLock(snapshot) {
  if (
    snapshot === null ||
    typeof snapshot !== 'object' ||
    snapshot.isFile !== true ||
    snapshot.isSymbolicLink !== false ||
    snapshot.uid !== serviceUid ||
    snapshot.gid !== serviceGid ||
    snapshot.mode !== 0o600 ||
    snapshot.linkCount !== 1 ||
    !Number.isSafeInteger(snapshot.size) ||
    snapshot.size < 0 ||
    snapshot.size > 32 ||
    !Number.isFinite(snapshot.modifiedAtMs) ||
    !Number.isFinite(snapshot.bootedAtMs) ||
    !Number.isFinite(snapshot.observedAtMs) ||
    snapshot.modifiedAtMs > snapshot.observedAtMs ||
    typeof snapshot.content !== 'string' ||
    Buffer.byteLength(snapshot.content, 'utf8') !== snapshot.size ||
    snapshot.heldOpen !== false
  )
    return undefined;

  const preBoot = snapshot.modifiedAtMs < snapshot.bootedAtMs;
  const oldEnough =
    snapshot.observedAtMs - snapshot.modifiedAtMs >= minimumSameBootStaleAgeMs;
  if (snapshot.content.length === 0)
    return preBoot
      ? 'empty-preboot-lock'
      : oldEnough
        ? 'empty-abandoned-lock'
        : undefined;

  const normalized = snapshot.content.trim();
  if (!/^\d{1,10}$/u.test(normalized)) return undefined;
  if (preBoot) return 'pid-preboot-lock';
  if (snapshot.pidExists === false && oldEnough) return 'dead-pid-lock';
  return undefined;
}

export async function runAutomaticPowerSchoolRecovery(
  dependencies,
  options = {},
) {
  const attempts = options.maximumRepairAttempts ?? maximumRepairAttempts;
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > 3)
    throw new Error('production-powerschool-auto-repair-policy-invalid');

  let planStatus = await dependencies.planExitStatus();
  let staleLockReason;
  let planAttempts = 0;
  if (planStatus === 1) {
    staleLockReason = await dependencies.removeStaleLock();
    if (staleLockReason === undefined)
      return {
        status: 'skipped',
        code: 'plan-failure-not-repairable',
        staleLockRemoved: false,
        repairAttempts: 0,
        planAttempts: 0,
        downstreamReadJobsStarted: 0,
        providerWrites: 0,
      };
    planAttempts += 1;
    if (await dependencies.startPlanRefresh()) {
      const downstreamReadJobsStarted =
        await dependencies.startDownstreamReadJobs();
      return {
        status: 'recovered',
        code: staleLockReason,
        staleLockRemoved: true,
        repairAttempts: 0,
        planAttempts,
        downstreamReadJobsStarted,
        providerWrites: 0,
      };
    }
    planStatus = await dependencies.planExitStatus();
  }

  if (planStatus !== 3)
    return {
      status: planAttempts === 0 ? 'skipped' : 'failed',
      code:
        planAttempts === 0
          ? 'plan-status-not-repairable'
          : 'plan-retry-not-repair-required',
      staleLockRemoved: staleLockReason !== undefined,
      repairAttempts: 0,
      planAttempts,
      downstreamReadJobsStarted: 0,
      providerWrites: 0,
    };

  let repairAttempts = 0;
  let repaired = false;
  while (repairAttempts < attempts && !repaired) {
    repairAttempts += 1;
    repaired = await dependencies.repairAuthentication();
    if (!repaired && repairAttempts < attempts)
      await dependencies.waitBeforeRepairRetry();
  }
  if (!repaired)
    return {
      status: 'failed',
      code: 'authentication-repair-exhausted',
      staleLockRemoved: staleLockReason !== undefined,
      repairAttempts,
      planAttempts,
      downstreamReadJobsStarted: 0,
      providerWrites: 0,
    };

  planAttempts += 1;
  if (!(await dependencies.startPlanRefresh()))
    return {
      status: 'failed',
      code: 'post-repair-plan-refresh-failed',
      staleLockRemoved: staleLockReason !== undefined,
      repairAttempts,
      planAttempts,
      downstreamReadJobsStarted: 0,
      providerWrites: 0,
    };
  const downstreamReadJobsStarted =
    await dependencies.startDownstreamReadJobs();
  return {
    status: 'recovered',
    code: 'authentication-repaired',
    staleLockRemoved: staleLockReason !== undefined,
    repairAttempts,
    planAttempts,
    downstreamReadJobsStarted,
    providerWrites: 0,
  };
}

function command(commandPath, arguments_, timeoutMs) {
  const result = spawnSync(commandPath, arguments_, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs,
    env: {
      PATH: '/usr/sbin:/usr/bin:/sbin:/bin',
    },
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? '',
  };
}

function planExitStatus() {
  const result = command(
    '/usr/bin/systemctl',
    ['show', planUnit, '--property=ExecMainStatus', '--value'],
    10_000,
  );
  const value = Number(result.stdout.trim());
  return result.status === 0 && Number.isSafeInteger(value) ? value : -1;
}

function startPlanRefresh() {
  command('/usr/bin/systemctl', ['reset-failed', planUnit], 10_000);
  return (
    command('/usr/bin/systemctl', ['start', planUnit], 4 * 60 * 1_000)
      .status === 0
  );
}

function startDownstreamReadJobs() {
  let started = 0;
  for (const unit of downstreamReadUnits) {
    if (
      command('/usr/bin/systemctl', ['start', '--no-block', unit], 10_000)
        .status === 0
    )
      started += 1;
  }
  return started;
}

function assertRepairController() {
  const state = lstatSync(repairController);
  if (
    state.isSymbolicLink() ||
    !state.isFile() ||
    state.uid !== 0 ||
    state.gid !== 0 ||
    (state.mode & 0o777) !== 0o700 ||
    state.nlink !== 1 ||
    realpathSync(repairController) !== repairController
  )
    throw new Error('production-powerschool-auto-repair-controller-unsafe');
}

function repairAuthentication() {
  try {
    assertRepairController();
  } catch {
    return false;
  }
  return (
    command('/usr/bin/bash', [repairController], 7 * 60 * 1_000).status === 0
  );
}

function bootedAtMs() {
  const match = readFileSync('/proc/stat', 'utf8').match(/^btime (\d+)$/mu);
  if (match === null)
    throw new Error('production-powerschool-boot-time-invalid');
  const seconds = Number(match[1]);
  if (!Number.isSafeInteger(seconds) || seconds <= 0)
    throw new Error('production-powerschool-boot-time-invalid');
  return seconds * 1_000;
}

function lockHeldOpen() {
  const result = command(
    '/usr/bin/fuser',
    ['--silent', '--', sessionLock],
    10_000,
  );
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error('production-powerschool-session-lock-inspection-failed');
}

function readLockSnapshot() {
  const directory = lstatSync(sessionDirectory);
  if (
    directory.isSymbolicLink() ||
    !directory.isDirectory() ||
    directory.uid !== serviceUid ||
    directory.gid !== serviceGid ||
    (directory.mode & 0o777) !== 0o700 ||
    realpathSync(sessionDirectory) !== sessionDirectory
  )
    throw new Error('production-powerschool-session-directory-unsafe');
  if (!existsSync(sessionLock)) return undefined;
  const before = lstatSync(sessionLock);
  if (before.isSymbolicLink())
    throw new Error('production-powerschool-session-lock-unsafe');
  const descriptor = openSync(
    sessionLock,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  let content;
  let opened;
  try {
    opened = fstatSync(descriptor);
    content = readFileSync(descriptor, 'utf8');
  } finally {
    closeSync(descriptor);
  }
  if (
    opened.dev !== before.dev ||
    opened.ino !== before.ino ||
    opened.size !== before.size
  )
    throw new Error('production-powerschool-session-lock-changed');
  const normalized = content.trim();
  return {
    identity: `${opened.dev}:${opened.ino}`,
    snapshot: {
      isFile: opened.isFile(),
      isSymbolicLink: false,
      uid: opened.uid,
      gid: opened.gid,
      mode: opened.mode & 0o777,
      linkCount: opened.nlink,
      size: opened.size,
      modifiedAtMs: opened.mtimeMs,
      bootedAtMs: bootedAtMs(),
      observedAtMs: Date.now(),
      content,
      heldOpen: lockHeldOpen(),
      pidExists:
        /^\d{1,10}$/u.test(normalized) && existsSync(`/proc/${normalized}`),
    },
  };
}

function removeStaleLock() {
  let current;
  try {
    current = readLockSnapshot();
  } catch {
    return undefined;
  }
  if (current === undefined) return undefined;
  const reason = classifyStalePowerSchoolLock(current.snapshot);
  if (reason === undefined) return undefined;
  try {
    const after = lstatSync(sessionLock);
    if (
      after.isSymbolicLink() ||
      `${after.dev}:${after.ino}` !== current.identity ||
      lockHeldOpen()
    )
      return undefined;
    unlinkSync(sessionLock);
    return reason;
  } catch {
    return undefined;
  }
}

async function waitBeforeRepairRetry() {
  await new Promise((resolve) => setTimeout(resolve, repairRetryDelayMs));
}

async function main() {
  if (process.geteuid?.() !== 0 || process.argv.length !== 2) {
    process.stderr.write(
      '{"status":"rejected","code":"production-powerschool-auto-repair-usage-invalid"}\n',
    );
    process.exitCode = 64;
    return;
  }
  const result = await runAutomaticPowerSchoolRecovery({
    planExitStatus,
    removeStaleLock,
    startPlanRefresh,
    repairAuthentication,
    waitBeforeRepairRetry,
    startDownstreamReadJobs,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === 'failed' ? 1 : 0;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
)
  void main();
