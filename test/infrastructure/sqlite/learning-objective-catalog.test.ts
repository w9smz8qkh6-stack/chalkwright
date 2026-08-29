import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import type { LearningObjectiveCatalogImport } from '../../../src/domain/learning-objectives.js';
import { SqliteDatabase } from '../../../src/infrastructure/sqlite/database.js';
import { SqliteLearningObjectiveCatalog } from '../../../src/infrastructure/sqlite/learning-objective-catalog.js';

test('learning-objective catalog replaces documents atomically and scopes by course year', async () => {
  const root = mkdtempSync(join(tmpdir(), 'chalkwright-objectives-'));
  try {
    using database = new SqliteDatabase(join(root, 'state.sqlite'), {
      migration: { appliedAt: '2035-04-13T01:00:00.000Z' },
    });
    const catalog = new SqliteLearningObjectiveCatalog(database);
    const input = sampleImport();
    assert.deepEqual(await catalog.replaceSource(input), {
      status: 'imported',
      acceptedCount: 1,
    });
    assert.deepEqual(
      catalog.listEntries({
        classId: input.source.classId,
        academicYear: '2034-35',
      }),
      input.entries,
    );
    assert.equal((await catalog.replaceSource(input)).status, 'unchanged');

    const replacement = {
      ...input,
      source: { ...input.source, contentHash: `sha256:${'b'.repeat(64)}` },
      entries: [
        {
          ...input.entries[0]!,
          objectives: ['Students will implement nested conditionals.'],
        },
      ],
    };
    assert.equal((await catalog.replaceSource(replacement)).status, 'imported');
    assert.deepEqual(
      catalog.listEntries({
        classId: input.source.classId,
        academicYear: '2034-35',
      })[0]?.objectives,
      ['Students will implement nested conditionals.'],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function sampleImport(): LearningObjectiveCatalogImport {
  return {
    importId: 'objective-import-a',
    source: {
      sourceId: 'objective-source-a',
      classId: 'web-design-a' as never,
      academicYear: '2034-35',
      sourceReference: 'google-drive:folder/file',
      contentHash: `sha256:${'a'.repeat(64)}`,
      importedAt: '2035-04-13T01:00:00.000Z',
    },
    entries: [
      {
        entryId: 'objective-entry-a',
        sourceId: 'objective-source-a',
        lessonCode: '6.10.2',
        title: 'Nested conditionals',
        objectives: ['Students will trace nested conditional branches.'],
      },
    ],
  };
}
