import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { verifyRepositorySafety } from '../../scripts/operations/verify-repository-safety.mjs';

const adapterPath = 'src/infrastructure/operations/telegram-alert-transport.ts';
const exactAdapter = `import { request as httpsRequest } from 'node:https';
const telegramHost = 'api.telegram.org';
const requestTimeoutMs = 10_000;
const maximumResponseBytes = 16 * 1024;
interface Request { readonly method: 'POST'; }
const request = {
  hostname: telegramHost,
  path: \`/bot\${token}/sendMessage\`,
  method: 'POST',
  agent: false,
  maxHeaderSize: 8 * 1024,
};
`;
const autoRepairPath =
  'scripts/operations/auto-repair-production-powerschool.mjs';
const exactAutoRepair = readFileSync(
  new URL(`../../${autoRepairPath}`, import.meta.url),
  'utf8',
);

test('permits only the exact unwired offline Telegram adapter', () => {
  const fixture = createFixture();
  try {
    write(fixture, adapterPath, exactAdapter);
    assert.deepEqual(verifyRepositorySafety(fixture), { candidates: 1 });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('rejects broadened alert transport authority and runtime wiring', () => {
  for (const mutate of [
    (source) => source.replace('api.telegram.org', 'example.test'),
    (source) => source.replace('sendMessage', 'sendDocument'),
    (source) => `${source}\nimport 'node:http';\n`,
  ]) {
    const fixture = createFixture();
    try {
      write(fixture, adapterPath, mutate(exactAdapter));
      assert.throws(
        () => verifyRepositorySafety(fixture),
        /forbidden operational dependency/u,
      );
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  }

  const fixture = createFixture();
  try {
    write(fixture, adapterPath, exactAdapter);
    write(
      fixture,
      'src/application/operations/wired.ts',
      "import '../../infrastructure/operations/telegram-alert-transport.js';\n",
    );
    assert.throws(
      () => verifyRepositorySafety(fixture),
      /offline alert authority must remain unwired/u,
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('permits only the bounded production PowerSchool recovery controller', () => {
  const fixture = createFixture();
  try {
    write(fixture, autoRepairPath, exactAutoRepair);
    assert.deepEqual(verifyRepositorySafety(fixture), { candidates: 1 });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  for (const broaden of [
    (source) =>
      source.replace(
        "'chalkwright-glossary-refresh.service',",
        "'chalkwright-calendar-sync.service',",
      ),
    (source) =>
      source.replace(
        'const maximumRepairAttempts = 3;',
        'const maximumRepairAttempts = 4;',
      ),
    (source) => `${source}\nconst leaked = 'OP_SERVICE_ACCOUNT_TOKEN';\n`,
  ]) {
    const broadened = createFixture();
    try {
      write(broadened, autoRepairPath, broaden(exactAutoRepair));
      assert.throws(
        () => verifyRepositorySafety(broadened),
        /forbidden operational dependency/u,
      );
    } finally {
      rmSync(broadened, { recursive: true, force: true });
    }
  }
});

function createFixture() {
  return mkdtempSync(join(tmpdir(), 'classroom-hub-repository-safety-'));
}

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content, 'utf8');
}
