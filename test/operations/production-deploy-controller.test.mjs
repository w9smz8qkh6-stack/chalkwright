import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const deploy = readFileSync(
  'scripts/operations/deploy-production-from-main.sh',
  'utf8',
);
const sudoPolicy = readFileSync(
  'scripts/operations/install-chalkwright-production-sudo-policy.sh',
  'utf8',
);
const repair = readFileSync(
  'scripts/operations/repair-production-powerschool.sh',
  'utf8',
);
const repairUnit = readFileSync(
  'systemd/production/chalkwright-powerschool-repair.service.in',
  'utf8',
);
const autoRepair = readFileSync(
  'scripts/operations/auto-repair-production-powerschool.mjs',
  'utf8',
);
const autoRepairInstaller = readFileSync(
  'scripts/operations/install-production-powerschool-auto-repair.sh',
  'utf8',
);
const autoRepairUnit = readFileSync(
  'systemd/production/chalkwright-powerschool-auto-repair.service.in',
  'utf8',
);
const planRefreshUnit = readFileSync(
  'systemd/production/chalkwright-plan-refresh.service.in',
  'utf8',
);
const activation = readFileSync(
  'scripts/operations/activate-production.sh',
  'utf8',
);
const releaseBuilder = readFileSync(
  'scripts/operations/build-production-release.sh',
  'utf8',
);
const releaseInstaller = readFileSync(
  'scripts/operations/install-production-release.sh',
  'utf8',
);

test('production deploy waits for restarted display liveness before rollback', () => {
  const restart = deploy.indexOf('systemctl restart chalkwright.service');
  const waitLoop = deploy.indexOf('for _ in {1..20}; do');
  const sleep = deploy.indexOf('/usr/bin/sleep 0.25');
  const finalHealthGate = deploy.indexOf(
    'reject production-deploy-health-failed',
  );

  assert.ok(restart > 0, 'deploy must restart the display service');
  assert.ok(
    waitLoop > restart,
    'deploy must wait only after attempting the service restart',
  );
  assert.ok(sleep > waitLoop, 'deploy liveness loop must be bounded');
  assert.ok(
    finalHealthGate > sleep,
    'deploy must rollback only after the bounded liveness wait',
  );
});

test('production deploy defers plan-dependent readiness to activation', () => {
  assert.doesNotMatch(deploy, /\$health_url\/ready/u);
});

test('production deploy defers Calendar preflight until activation establishes a canonical plan', () => {
  assert.doesNotMatch(deploy, /production-calendar-sync\.js" --preflight/u);
  assert.match(
    deploy,
    /calendarPreflight\\?":\\?"deferred-until-canonical-plan/u,
  );
});

test('production sudo policy pins the current deploy controller digest', () => {
  const expected = createHash('sha256').update(deploy).digest('hex');
  assert.match(
    sudoPolicy,
    new RegExp(`^deploy_digest=${expected}$`, 'mu'),
    'sudo policy must pin the checked-in deploy script exactly',
  );
});

test('production startup command is constrained to the checked activation sequence', () => {
  assert.match(
    sudoPolicy,
    /start-all\) exec \/opt\/chalkwright\/current\/scripts\/operations\/activate-production\.sh/u,
  );
  assert.match(sudoPolicy, /chalkwright-production-admin start-all/u);
  assert.match(sudoPolicy, /"commands":11/u);
});

test('production activation keeps the display and timers online when provider refresh fails', () => {
  const displayStart = activation.indexOf(
    '/usr/bin/systemctl start chalkwright.service',
  );
  const planRefresh = activation.indexOf(
    '/usr/bin/systemctl start chalkwright-plan-refresh.service',
  );
  const timerStart = activation.indexOf('/usr/bin/systemctl start "$timer"');
  assert.ok(displayStart >= 0 && displayStart < planRefresh);
  assert.ok(timerStart > planRefresh);
  assert.match(activation, /plan_refreshed=false/u);
  assert.match(activation, /calendar-sync-skipped-plan-refresh-failed/u);
  assert.doesNotMatch(activation, /stop_permanent/u);
});

test('production plan failures invoke one rate-limited automatic repair unit', () => {
  assert.match(
    planRefreshUnit,
    /^OnFailure=chalkwright-powerschool-auto-repair\.service$/mu,
  );
  assert.match(planRefreshUnit, /^OnFailureJobMode=replace$/mu);
  assert.match(autoRepairUnit, /^StartLimitIntervalSec=30min$/mu);
  assert.match(autoRepairUnit, /^StartLimitBurst=1$/mu);
  assert.match(autoRepairUnit, /^TimeoutStartSec=30min$/mu);
  assert.match(autoRepairUnit, /auto-repair-production-powerschool\.mjs/u);
  assert.doesNotMatch(autoRepairUnit, /calendar-sync|EnvironmentFile=/iu);
});

test('automatic PowerSchool recovery is bounded and never starts Calendar', () => {
  assert.match(autoRepair, /maximumRepairAttempts = 3/u);
  assert.match(autoRepair, /repairRetryDelayMs = 30 \* 1_000/u);
  assert.match(autoRepair, /providerWrites: 0/gu);
  assert.match(autoRepair, /chalkwright-classroom-refresh\.service/u);
  assert.match(autoRepair, /chalkwright-glossary-refresh\.service/u);
  assert.doesNotMatch(autoRepair, /chalkwright-calendar-sync/u);
  assert.match(autoRepair, /ExecMainStatus/u);
});

test('automatic repair unit installation snapshots, verifies, and restores units', () => {
  assert.match(autoRepairInstaller, /systemd-analyze verify/u);
  assert.match(autoRepairInstaller, /plan\.previous/u);
  assert.match(autoRepairInstaller, /auto\.previous/u);
  assert.match(autoRepairInstaller, /restore/u);
  assert.match(autoRepairInstaller, /systemctl daemon-reload/u);
  assert.doesNotMatch(autoRepairInstaller, /systemctl (?:start|enable)/u);
});

test('production activation consumes only the fixed protected site-media request before restart', () => {
  const request = activation.indexOf('/tmp/chalkwright-site-profile.json');
  const provision = activation.indexOf(
    'scripts/operations/provision-production-site-media.mjs',
    request,
  );
  const restart = activation.indexOf(
    '/usr/bin/systemctl restart chalkwright.service',
  );
  assert.ok(request > 0 && provision > request && restart > provision);
  assert.match(activation, /site_media=not-requested/u);
  assert.match(activation, /site_media=applied/u);
});

test('production releases contain and validate the complete site-media import path', () => {
  for (const required of [
    'scripts/setup-site-media.mjs',
    'scripts/operations/provision-production-site-media.mjs',
  ]) {
    assert.match(
      releaseBuilder,
      new RegExp(required.replaceAll('/', '\\/'), 'u'),
    );
    assert.match(
      releaseInstaller,
      new RegExp(required.replaceAll('/', '\\/'), 'u'),
    );
    assert.match(activation, new RegExp(required.replaceAll('/', '\\/'), 'u'));
  }
});

test('production releases contain the complete automatic PowerSchool recovery path', () => {
  for (const required of [
    'scripts/operations/auto-repair-production-powerschool.mjs',
    'scripts/operations/install-production-powerschool-auto-repair.sh',
  ]) {
    assert.match(
      releaseBuilder,
      new RegExp(required.replaceAll('/', '\\/'), 'u'),
    );
    assert.match(
      releaseInstaller,
      new RegExp(required.replaceAll('/', '\\/'), 'u'),
    );
  }
  assert.match(
    releaseInstaller,
    /systemd\/production\/chalkwright-powerschool-auto-repair\.service\.in/u,
  );
  assert.match(releaseBuilder, /systemd\/production/u);
  assert.equal(
    statSync('scripts/operations/install-production-powerschool-auto-repair.sh')
      .mode & 0o777,
    0o755,
  );
  assert.match(activation, /chalkwright-powerschool-auto-repair\.service\.in/u);
});

test('headed PowerSchool repair uses the desktop owner user manager', () => {
  assert.match(repair, /desktop_user=bren/u);
  assert.match(repair, /desktop_profile=\$runtime\/profile/u);
  assert.match(repair, /production-powerschool-repair-session/u);
  assert.match(repair, /desktop_provider=\$runtime\/provider/u);
  assert.match(repair, /CHALKWRIGHT_M17_REPAIR_DATE/u);
  assert.match(repair, /^HOME="\$desktop_profile"$/mu);
  assert.match(repair, /\/etc\/systemd\/user\/\$unit/u);
  assert.match(repair, /\/usr\/bin\/systemctl --user/u);
  assert.match(repair, /"\$\{user_systemctl\[@\]\}" start "\$unit"/u);
  assert.match(repair, /desktop_xauthority == "\$desktop_runtime"\/\*/u);
  assert.match(
    repair,
    /if \(!\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(date\)\)/u,
  );
  assert.doesNotMatch(repair, /if \(!\/\^\\\\d/u);
  assert.match(repair, /state_file=\.classroom-hub-auth-state\.json/u);
  assert.match(repair, /source_state=\$desktop_session\/\$state_file/u);
  assert.match(repair, /target_state=\$routine_session\/\$state_file/u);
  assert.doesNotMatch(repair, /powerschool-session\.json/u);
  assert.doesNotMatch(repair, /^XAUTHORITY=/mu);
  assert.doesNotMatch(
    repair,
    /Xvfb|xhost|\/usr\/bin\/xauth|--no-sandbox|openclaw/iu,
  );
});

test('headed PowerSchool repair inherits the user manager desktop with dedicated paths', () => {
  assert.doesNotMatch(repairUnit, /^(?:User|Group|Environment=DISPLAY)=/mu);
  assert.match(
    repairUnit,
    /EnvironmentFile=%t\/chalkwright-production-repair\/desktop-repair\.env/u,
  );
  assert.doesNotMatch(repairUnit, /^Environment=HOME=/mu);
  assert.match(repairUnit, /^UnsetEnvironment=.*OP_SERVICE_ACCOUNT_TOKEN/mu);
  assert.doesNotMatch(
    repairUnit,
    /^(?:NoNewPrivileges|PrivateDevices|ProtectHome|ProtectSystem|RestrictNamespaces|RestrictSUIDSGID)=/mu,
  );
  assert.match(repairUnit, /^MemoryMax=768M$/mu);
  assert.match(repairUnit, /^TasksMax=192$/mu);
});

test('production sudo policy pins the current PowerSchool repair controller digest', () => {
  const expected = createHash('sha256').update(repair).digest('hex');
  assert.match(
    sudoPolicy,
    new RegExp(`^repair_digest=${expected}$`, 'mu'),
    'sudo policy must pin the checked-in repair script exactly',
  );
});
