import assert from 'node:assert/strict';
import test from 'node:test';

import { UploadedSourceImportService } from '../../../src/core/operator-panel.js';
import {
  uploadedSourceDefinition,
  validCsvInspection,
} from '../../fixtures/source-contracts.js';

test('C05 records a bounded inspected upload without raw filename or bytes', () => {
  const imports = new UploadedSourceImportService();
  assert.equal(
    imports.inspect(uploadedSourceDefinition, validCsvInspection).status,
    'accepted',
  );
  const projection = imports.project(uploadedSourceDefinition);
  assert.equal(projection.status, 'accepted');
  assert.equal(projection.acceptedAdmission?.format, 'utf8-csv-v1');
  assert.doesNotMatch(JSON.stringify(projection), /clientFilename|bytes|path/u);
});

test('C05 preserves the last accepted upload after a rejected replacement', () => {
  const imports = new UploadedSourceImportService();
  imports.inspect(uploadedSourceDefinition, validCsvInspection);
  const rejected = imports.inspect(uploadedSourceDefinition, {
    ...validCsvInspection,
    clientFilename: '../outside.csv',
  });
  assert.deepEqual(rejected, {
    status: 'rejected',
    reason: 'path-like-filename',
  });
  const projection = imports.project(uploadedSourceDefinition);
  assert.equal(projection.status, 'accepted');
  assert.equal(projection.lastFailure, 'path-like-filename');
  assert.equal(
    projection.acceptedAdmission?.contentDigest,
    validCsvInspection.contentDigest,
  );
});
