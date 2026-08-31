import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const serviceSource = readFileSync(
  'src/application/configuration/versioned-configuration-service.ts',
  'utf8',
);
const portSource = readFileSync('src/ports/configuration-state.ts', 'utf8');

test('keeps the C01 service below routes, frameworks, providers, and adapters', () => {
  assert.match(serviceSource, /ports\/configuration-state\.js/u);
  assert.match(serviceSource, /contracts\/v1\/index\.js/u);
  assert.doesNotMatch(
    serviceSource,
    /from\s+['"][^'"]*(?:app\/|entrypoints\/|infrastructure\/|presentation\/|http|express|fastify|oauth|google|account|authentication|billing)/iu,
  );
});

test('keeps the configuration repository port adapter-neutral and narrowly transactional', () => {
  assert.match(portSource, /interface ConfigurationStateRepository/u);
  assert.match(portSource, /readAuditEvents/u);
  assert.match(portSource, /transact/u);
  assert.doesNotMatch(
    portSource,
    /(?:infrastructure|sqlite|filesystem|http|provider|account|authentication|framework|token|secret value)/iu,
  );
});
