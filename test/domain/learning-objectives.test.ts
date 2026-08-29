import assert from 'node:assert/strict';
import test from 'node:test';

import type { ClassId } from '../../src/domain/identities.js';
import {
  courseworkLessonCodes,
  learningObjectivesForCoursework,
  parseLearningObjectiveDocument,
} from '../../src/domain/learning-objectives.js';
import type { NormalizedCourseworkItem } from '../../src/domain/coursework.js';

const classId = 'web-design-a' as ClassId;
const importedAt = '2035-04-13T01:00:00.000Z';

test('extracts explicit objectives from structured course documentation', () => {
  const parsed = parseLearningObjectiveDocument({
    text: `
# Unit 6

## Lesson 6.10.2 — Nested conditionals
Learning objectives:
- Students will trace nested conditional branches.
- Students will select conditions that model a stated rule.

Unit 6, Chapter 11, Section 1: Assessment
Objective: Students will demonstrate mastery of nested conditionals.
`,
    fileName: 'CodeHS Unit 6.txt',
    classId,
    academicYear: '2034-35',
    sourceId: 'objective-source-a',
    sourceReference: 'google-drive:folder/file',
    contentHash: `sha256:${'a'.repeat(64)}`,
    importedAt,
  });

  assert.deepEqual(
    parsed.entries.map((entry) => ({
      code: entry.lessonCode,
      objectives: entry.objectives,
    })),
    [
      {
        code: '6.10.2',
        objectives: [
          'Students will trace nested conditional branches.',
          'Students will select conditions that model a stated rule.',
        ],
      },
      {
        code: '6.11.1',
        objectives: [
          'Students will demonstrate mastery of nested conditionals.',
        ],
      },
    ],
  );
  assert.match(parsed.source.contentHash, /^sha256:[a-f0-9]{64}$/u);
});

test('uses a lesson code in the filename for a single objective block', () => {
  const parsed = parseLearningObjectiveDocument({
    text: 'Learning objective: Students will build a semantic navigation menu.',
    fileName: 'Lesson 2.4.1 notes',
    classId,
    academicYear: '2034-35',
    sourceId: 'objective-source-b',
    sourceReference: 'google-drive:folder/file-b',
    contentHash: `sha256:${'b'.repeat(64)}`,
    importedAt,
  });
  assert.equal(parsed.entries[0]?.lessonCode, '2.4.1');
});

test('retains a bounded publisher list longer than six objectives', () => {
  const objectives = Array.from(
    { length: 13 },
    (_, index) => `- Students will complete explicit outcome ${index + 1}.`,
  ).join('\n');
  const parsed = parseLearningObjectiveDocument({
    text: `Lesson 4.1 - Getting Started\nLearning objectives:\n${objectives}`,
    fileName: 'CodeHS Unit 4.txt',
    classId,
    academicYear: '2034-35',
    sourceId: 'objective-source-long-list',
    sourceReference: 'google-drive:folder/file-long-list',
    contentHash: `sha256:${'d'.repeat(64)}`,
    importedAt,
  });

  assert.equal(parsed.entries[0]?.objectives.length, 12);
  assert.equal(
    parsed.entries[0]?.objectives.at(-1),
    'Students will complete explicit outcome 12.',
  );
});

test('matches the most specific explicit code and rejects conflicting duplicates', () => {
  const coursework = item({
    title: 'Quiz 6.10.2',
    description: 'Complete the CodeHS check for Unit 6.',
  });
  assert.deepEqual(courseworkLessonCodes(coursework), ['6.10.2', '6']);
  const objective = {
    entryId: 'entry-a',
    sourceId: 'source-a',
    lessonCode: '6.10.2',
    objectives: ['Students will trace nested conditional branches.'],
  } as const;
  assert.deepEqual(learningObjectivesForCoursework(coursework, [objective]), [
    'Students will trace nested conditional branches.',
  ]);
  assert.equal(
    learningObjectivesForCoursework(coursework, [
      objective,
      {
        ...objective,
        entryId: 'entry-b',
        sourceId: 'source-b',
        objectives: ['Students will write nested conditional branches.'],
      },
    ]),
    undefined,
  );
});

test('matches a unique explicit lesson title when publisher numbering differs', () => {
  const coursework = item({
    title: 'Team Freeze Tag — L2 Driving with the EXP Controller',
  });
  const titleMatch = {
    entryId: 'entry-vex-1-2',
    sourceId: 'source-vex',
    lessonCode: '1.2',
    title: 'Team Freeze Tag L2 Driving with the EXP Controller',
    objectives: ['Students will drive the BaseBot using the EXP Controller.'],
  } as const;

  assert.deepEqual(learningObjectivesForCoursework(coursework, [titleMatch]), [
    'Students will drive the BaseBot using the EXP Controller.',
  ]);
  assert.equal(
    learningObjectivesForCoursework(coursework, [
      titleMatch,
      {
        ...titleMatch,
        entryId: 'entry-vex-conflict',
        sourceId: 'source-vex-conflict',
        objectives: ['Students will configure the EXP Controller.'],
      },
    ]),
    undefined,
  );
});

test('refuses to infer an objective from unlabeled prose', () => {
  assert.throws(
    () =>
      parseLearningObjectiveDocument({
        text: '6.10.2 is a lesson about nested conditionals and Boolean logic.',
        fileName: 'course notes',
        classId,
        academicYear: '2034-35',
        sourceId: 'objective-source-c',
        sourceReference: 'google-drive:folder/file-c',
        contentHash: `sha256:${'c'.repeat(64)}`,
        importedAt,
      }),
    /learning-objective-document-no-entries/u,
  );
});

function item(
  overrides: Partial<NormalizedCourseworkItem>,
): NormalizedCourseworkItem {
  return {
    itemId: 'item-a',
    providerCourseKey: 'course-a',
    providerItemKey: 'item-a',
    classId,
    title: 'Assignment',
    description: '',
    materials: [],
    workType: 'ASSIGNMENT',
    state: 'PUBLISHED',
    assignedCount: 0,
    submittedCount: 0,
    updateTime: '',
    bucket: 'upcoming',
    ...overrides,
  };
}
