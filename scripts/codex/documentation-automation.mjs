import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const unitRoot = join(repositoryRoot, 'systemd', 'codex');
const unitNames = [
  'chalkwright-documentation-sync.service',
  'chalkwright-documentation-sync.path',
  'chalkwright-documentation-sync.timer',
];

function systemctl(args, { quiet = false } = {}) {
  const result = spawnSync('systemctl', ['--user', ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    timeout: 20_000,
  });
  if (result.error || result.status !== 0) {
    const detail = quiet ? result.stderr.trim() : '';
    throw new Error(
      `systemctl --user ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`,
    );
  }
  return result.stdout?.trim() ?? '';
}

function install() {
  for (const name of unitNames) {
    systemctl(['link', '--force', join(unitRoot, name)]);
  }
  systemctl(['daemon-reload']);
  systemctl([
    'enable',
    '--now',
    'chalkwright-documentation-sync.path',
    'chalkwright-documentation-sync.timer',
  ]);
  systemctl(['start', 'chalkwright-documentation-sync.service']);
}

function verify() {
  for (const name of unitNames) {
    const fragment = systemctl(
      ['show', name, '--property=FragmentPath', '--value'],
      {
        quiet: true,
      },
    );
    const expected = join(unitRoot, name);
    const resolved = fragment ? realpathSync(fragment) : '';
    if (resolved !== expected) {
      throw new Error(
        `${name} loads ${resolved || 'no fragment'}; expected ${expected}`,
      );
    }
  }
  for (const name of [
    'chalkwright-documentation-sync.path',
    'chalkwright-documentation-sync.timer',
  ]) {
    if (systemctl(['is-enabled', name], { quiet: true }) !== 'enabled') {
      throw new Error(`${name} is not enabled`);
    }
    if (systemctl(['is-active', name], { quiet: true }) !== 'active') {
      throw new Error(`${name} is not active`);
    }
  }
  const serviceResult = systemctl(
    [
      'show',
      'chalkwright-documentation-sync.service',
      '--property=Result',
      '--value',
    ],
    { quiet: true },
  );
  if (serviceResult !== 'success') {
    throw new Error(
      `chalkwright-documentation-sync.service last result is ${serviceResult}`,
    );
  }
  process.stdout.write(
    'Chalkwright documentation path watcher and periodic backstop are active; the last refresh succeeded.\n',
  );
}

if (process.argv.includes('--install')) install();
verify();
