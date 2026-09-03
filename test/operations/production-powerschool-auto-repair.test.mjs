import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  classifyStalePowerSchoolLock,
  runAutomaticPowerSchoolRecovery,
} from '../../scripts/operations/auto-repair-production-powerschool.mjs';

test('automatic recovery rejects a non-root invocation through a release symlink', () => {
  const root = mkdtempSync(join(tmpdir(), 'chalkwright-auto-repair-link-'));
  try {
    const linkedEntrypoint = join(
      root,
      'auto-repair-production-powerschool.mjs',
    );
    symlinkSync(
      join(
        process.cwd(),
        'scripts/operations/auto-repair-production-powerschool.mjs',
      ),
      linkedEntrypoint,
    );
    const result = spawnSync(process.execPath, [linkedEntrypoint], {
      encoding: 'utf8',
      env: {},
    });
    assert.equal(result.status, 64);
    assert.match(
      result.stderr,
      /production-powerschool-auto-repair-usage-invalid/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function lock(overrides = {}) {
  return {
    isFile: true,
    isSymbolicLink: false,
    uid: 972,
    gid: 972,
    mode: 0o600,
    linkCount: 1,
    size: 0,
    modifiedAtMs: 1_000,
    bootedAtMs: 2_000,
    observedAtMs: 10_000,
    content: '',
    heldOpen: false,
    pidExists: false,
    ...overrides,
  };
}

test('classifies only bounded abandoned PowerSchool session locks', () => {
  assert.equal(classifyStalePowerSchoolLock(lock()), 'empty-preboot-lock');
  assert.equal(
    classifyStalePowerSchoolLock(
      lock({
        size: 6,
        content: '12345\n',
        modifiedAtMs: 5_000,
        bootedAtMs: 2_000,
        observedAtMs: 5_000 + 4 * 60 * 1_000,
      }),
    ),
    'dead-pid-lock',
  );
  assert.equal(
    classifyStalePowerSchoolLock(lock({ heldOpen: true })),
    undefined,
  );
  assert.equal(
    classifyStalePowerSchoolLock(
      lock({
        size: 6,
        content: '12345\n',
        pidExists: true,
        modifiedAtMs: 5_000,
        bootedAtMs: 2_000,
        observedAtMs: 5_000 + 4 * 60 * 1_000,
      }),
    ),
    undefined,
  );
  assert.equal(classifyStalePowerSchoolLock(lock({ mode: 0o644 })), undefined);
  assert.equal(
    classifyStalePowerSchoolLock(lock({ content: 'not-a-pid', size: 9 })),
    undefined,
  );
});

test('removes a proven stale lock and retries without credential authority', async () => {
  const calls = [];
  const result = await runAutomaticPowerSchoolRecovery({
    planExitStatus: async () => 1,
    removeStaleLock: async () => {
      calls.push('remove-stale-lock');
      return 'empty-preboot-lock';
    },
    startPlanRefresh: async () => {
      calls.push('start-plan');
      return true;
    },
    repairAuthentication: async () => {
      calls.push('repair');
      return true;
    },
    waitBeforeRepairRetry: async () => calls.push('wait'),
    startDownstreamReadJobs: async () => {
      calls.push('start-downstream-reads');
      return 2;
    },
  });
  assert.deepEqual(calls, [
    'remove-stale-lock',
    'start-plan',
    'start-downstream-reads',
  ]);
  assert.deepEqual(result, {
    status: 'recovered',
    code: 'empty-preboot-lock',
    staleLockRemoved: true,
    repairAttempts: 0,
    planAttempts: 1,
    downstreamReadJobsStarted: 2,
    providerWrites: 0,
  });
});

test('uses the bounded 1Password-backed repair only for exit status three', async () => {
  const calls = [];
  let repairs = 0;
  const result = await runAutomaticPowerSchoolRecovery({
    planExitStatus: async () => 3,
    removeStaleLock: async () => {
      calls.push('remove-stale-lock');
      return undefined;
    },
    startPlanRefresh: async () => {
      calls.push('start-plan');
      return true;
    },
    repairAuthentication: async () => {
      repairs += 1;
      calls.push(`repair-${repairs}`);
      return repairs === 3;
    },
    waitBeforeRepairRetry: async () => calls.push('wait'),
    startDownstreamReadJobs: async () => {
      calls.push('start-downstream-reads');
      return 2;
    },
  });
  assert.deepEqual(calls, [
    'repair-1',
    'wait',
    'repair-2',
    'wait',
    'repair-3',
    'start-plan',
    'start-downstream-reads',
  ]);
  assert.deepEqual(result, {
    status: 'recovered',
    code: 'authentication-repaired',
    staleLockRemoved: false,
    repairAttempts: 3,
    planAttempts: 1,
    downstreamReadJobsStarted: 2,
    providerWrites: 0,
  });
});

test('does not invoke repair for an unrelated plan failure', async () => {
  let repaired = false;
  const result = await runAutomaticPowerSchoolRecovery({
    planExitStatus: async () => 1,
    removeStaleLock: async () => undefined,
    startPlanRefresh: async () => true,
    repairAuthentication: async () => {
      repaired = true;
      return true;
    },
    waitBeforeRepairRetry: async () => undefined,
    startDownstreamReadJobs: async () => 2,
  });
  assert.equal(repaired, false);
  assert.deepEqual(result, {
    status: 'skipped',
    code: 'plan-failure-not-repairable',
    staleLockRemoved: false,
    repairAttempts: 0,
    planAttempts: 0,
    downstreamReadJobsStarted: 0,
    providerWrites: 0,
  });
});

test('a healthy or inactive plan is a provider-free no-op', async () => {
  const calls = [];
  const result = await runAutomaticPowerSchoolRecovery({
    planExitStatus: async () => 0,
    removeStaleLock: async () => calls.push('remove-stale-lock'),
    startPlanRefresh: async () => {
      calls.push('start-plan');
      return true;
    },
    repairAuthentication: async () => {
      calls.push('repair');
      return true;
    },
    waitBeforeRepairRetry: async () => calls.push('wait'),
    startDownstreamReadJobs: async () => {
      calls.push('start-downstream-reads');
      return 2;
    },
  });
  assert.deepEqual(calls, []);
  assert.deepEqual(result, {
    status: 'skipped',
    code: 'plan-status-not-repairable',
    staleLockRemoved: false,
    repairAttempts: 0,
    planAttempts: 0,
    downstreamReadJobsStarted: 0,
    providerWrites: 0,
  });
});

test('stops after three failed authentication repairs', async () => {
  let attempts = 0;
  const result = await runAutomaticPowerSchoolRecovery({
    planExitStatus: async () => 3,
    removeStaleLock: async () => undefined,
    startPlanRefresh: async () => true,
    repairAuthentication: async () => {
      attempts += 1;
      return false;
    },
    waitBeforeRepairRetry: async () => undefined,
    startDownstreamReadJobs: async () => 2,
  });
  assert.equal(attempts, 3);
  assert.deepEqual(result, {
    status: 'failed',
    code: 'authentication-repair-exhausted',
    staleLockRemoved: false,
    repairAttempts: 3,
    planAttempts: 0,
    downstreamReadJobsStarted: 0,
    providerWrites: 0,
  });
});
