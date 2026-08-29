import assert from 'node:assert/strict';
import test from 'node:test';

import { importDriveLearningObjectivesCourse } from '../../../src/application/objectives/import-drive.js';
import type { LearningObjectiveCatalogImport } from '../../../src/domain/learning-objectives.js';

test('imports bounded Google Docs from an exact configured course path', async () => {
  const stored: LearningObjectiveCatalogImport[] = [];
  const parents = new Map([
    [
      'academic-year-folder',
      [
        {
          id: 'course-folder-123',
          name: 'CodeHS Web Design',
          mimeType: 'application/vnd.google-apps.folder',
        },
      ],
    ],
    [
      'course-folder-123',
      [
        {
          id: 'objective-folder-123',
          name: 'Learning Objectives',
          mimeType: 'application/vnd.google-apps.folder',
        },
      ],
    ],
    [
      'objective-folder-123',
      [
        {
          id: 'objective-file-123',
          name: 'Unit 6 objectives',
          mimeType: 'application/vnd.google-apps.document',
        },
      ],
    ],
  ]);
  const results = await importDriveLearningObjectivesCourse({
    course: {
      classId: 'web-design-a' as never,
      subject: 'Web Design',
      defaultLanguage: 'en',
      courseName: 'CodeHS Web Design',
      objectiveFolderPath: ['Learning Objectives'],
    },
    academicYearFolderId: 'academic-year-folder',
    academicYear: '2034-35',
    importedAt: '2035-04-13T01:00:00.000Z',
    transport: {
      async listChildren({ parentId }) {
        return { files: parents.get(parentId) ?? [] };
      },
      async downloadCsv() {
        return new Uint8Array();
      },
      async readTextDocument(request) {
        assert.equal(
          request.sourceMimeType,
          'application/vnd.google-apps.document',
        );
        return 'Lesson 6.10.2 — Nested conditionals\nLearning objective: Students will trace nested conditional branches.';
      },
    },
    catalog: {
      async replaceSource(input) {
        stored.push(input);
        return { status: 'imported', acceptedCount: input.entries.length };
      },
      listEntries() {
        return [];
      },
    },
    requestTimeoutMs: 5_000,
    maximumPages: 2,
    maximumFiles: 5,
    signal: new AbortController().signal,
  });
  assert.equal(results[0]?.acceptedCount, 1);
  assert.equal(stored[0]?.entries[0]?.lessonCode, '6.10.2');
  assert.equal(
    stored[0]?.source.sourceReference,
    'google-drive:objective-folder-123/objective-file-123',
  );
});
