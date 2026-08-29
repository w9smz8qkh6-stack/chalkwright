import assert from 'node:assert/strict';
import test from 'node:test';

import { createDriveGlossaryReadTransport } from '../../../src/infrastructure/google-drive/official-client.js';

test('Drive transport admits only parent-bounded list and bounded document reads', async () => {
  const calls: unknown[] = [];
  const transport = createDriveGlossaryReadTransport({
    files: {
      async list(params, options) {
        calls.push({ params, options });
        return {
          data: {
            files: [
              { id: 'file-id-123', name: 'Unit 1.csv', mimeType: 'text/csv' },
            ],
          },
        };
      },
      async get(params, options) {
        calls.push({ params, options });
        return {
          data: new TextEncoder().encode('Term,Definition\na,b\n').buffer,
        };
      },
      async export(params, options) {
        calls.push({ params, options });
        return {
          data: new TextEncoder().encode(
            'Lesson 1.2.3\nLearning objective: Students will test exports.',
          ).buffer,
        };
      },
    },
  });
  const signal = new AbortController().signal;
  assert.deepEqual(
    await transport.listChildren({
      parentId: 'folder-id-123',
      signal,
      timeoutMs: 5_000,
    }),
    {
      files: [{ id: 'file-id-123', name: 'Unit 1.csv', mimeType: 'text/csv' }],
    },
  );
  assert.equal(
    (
      await transport.downloadCsv({
        fileId: 'file-id-123',
        signal,
        timeoutMs: 5_000,
      })
    ).byteLength,
    20,
  );
  assert.deepEqual(calls[0], {
    params: {
      q: "'folder-id-123' in parents and trashed = false",
      pageSize: 100,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    },
    options: {
      fields: 'nextPageToken,files(id,name,mimeType,modifiedTime)',
      retry: false,
      signal,
      timeout: 5_000,
    },
  });
  assert.deepEqual(calls[1], {
    params: {
      fileId: 'file-id-123',
      alt: 'media',
      supportsAllDrives: true,
    },
    options: {
      responseType: 'arraybuffer',
      retry: false,
      signal,
      timeout: 5_000,
    },
  });
  assert.match(
    await transport.readTextDocument!({
      fileId: 'file-id-123',
      sourceMimeType: 'application/vnd.google-apps.document',
      signal,
      timeoutMs: 5_000,
    }),
    /Students will test exports/u,
  );
  assert.deepEqual(calls[2], {
    params: { fileId: 'file-id-123', mimeType: 'text/plain' },
    options: {
      responseType: 'arraybuffer',
      retry: false,
      signal,
      timeout: 5_000,
    },
  });
});

test('Drive glossary transport maps provider details to finite codes', async () => {
  const transport = createDriveGlossaryReadTransport({
    files: {
      async list() {
        throw { response: { status: 403 }, privateDetail: 'must-not-escape' };
      },
      async get() {
        throw { response: { status: 500 } };
      },
      async export() {
        throw { response: { status: 500 } };
      },
    },
  });
  await assert.rejects(
    transport.listChildren({
      parentId: 'folder-id-123',
      signal: new AbortController().signal,
      timeoutMs: 5_000,
    }),
    /drive-authorization-denied/u,
  );
  await assert.rejects(
    transport.downloadCsv({
      fileId: 'file-id-123',
      signal: new AbortController().signal,
      timeoutMs: 5_000,
    }),
    /drive-read-unavailable/u,
  );
});
