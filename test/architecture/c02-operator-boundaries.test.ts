import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const applicationSource = readFileSync(
  'src/application/operator-panel/core-operator-shell-service.ts',
  'utf8',
);
const operatorServerSource = readFileSync(
  'src/infrastructure/operator-http/server.ts',
  'utf8',
);
const displayServerSource = readFileSync(
  'src/infrastructure/http/server.ts',
  'utf8',
);
const compositionSource = readFileSync(
  'src/app/core-operator-server.ts',
  'utf8',
);

test('keeps C02 application behavior below HTTP and document rendering', () => {
  assert.match(applicationSource, /VersionedConfigurationService/u);
  assert.match(applicationSource, /operatorPageCatalog/u);
  assert.doesNotMatch(
    applicationSource,
    /(?:node:http|infrastructure\/operator-http|presentation\/|<html|cookie|oauth|billing|account session)/iu,
  );
});

test('operator and display servers cannot import each other or share route registries', () => {
  assert.doesNotMatch(
    operatorServerSource,
    /infrastructure\/http|ClassroomHttp|display\/|overrides|attendance/u,
  );
  assert.doesNotMatch(
    displayServerSource,
    /operator-http|core-operator|operator-panel|OperatorPage/u,
  );
  assert.match(compositionSource, /startCoreOperatorHttpServer/u);
  assert.doesNotMatch(
    compositionSource,
    /startClassroomHttpServer|mvp-server|production-server|shadow-server/u,
  );
});
