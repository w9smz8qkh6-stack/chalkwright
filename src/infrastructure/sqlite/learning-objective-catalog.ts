import type {
  LearningObjectiveCatalogImport,
  LearningObjectiveEntry,
  LearningObjectiveSource,
} from '../../domain/learning-objectives.js';
import { isIsoInstant } from '../../domain/runtime-validation.js';
import type { LearningObjectiveCatalog } from '../../ports/learning-objective-catalog.js';
import type { SqliteDatabase } from './database.js';

interface EntryRow {
  readonly entry_id: string;
  readonly source_id: string;
  readonly lesson_code: string;
  readonly title: string | null;
  readonly objectives_json: string;
}

export class SqliteLearningObjectiveCatalog implements LearningObjectiveCatalog {
  constructor(private readonly database: SqliteDatabase) {}

  async replaceSource(input: LearningObjectiveCatalogImport) {
    if (!validImport(input))
      return { status: 'rejected' as const, acceptedCount: 0 };
    const existing = this.database.connection
      .prepare(
        'SELECT content_hash FROM learning_objective_sources WHERE source_id = ?',
      )
      .get(input.source.sourceId) as
      { readonly content_hash: string } | undefined;
    if (existing?.content_hash === input.source.contentHash)
      return {
        status: 'unchanged' as const,
        acceptedCount: input.entries.length,
      };
    this.database.transaction(() => {
      this.database.connection
        .prepare('DELETE FROM learning_objective_entries WHERE source_id = ?')
        .run(input.source.sourceId);
      this.database.connection
        .prepare(
          `INSERT INTO learning_objective_sources(
             source_id, class_id, academic_year, source_reference, content_hash, imported_at
           ) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(source_id) DO UPDATE SET
             class_id = excluded.class_id,
             academic_year = excluded.academic_year,
             source_reference = excluded.source_reference,
             content_hash = excluded.content_hash,
             imported_at = excluded.imported_at`,
        )
        .run(
          input.source.sourceId,
          input.source.classId,
          input.source.academicYear,
          input.source.sourceReference,
          input.source.contentHash,
          input.source.importedAt,
        );
      const insert = this.database.connection.prepare(
        `INSERT INTO learning_objective_entries(
           entry_id, source_id, lesson_code, title, objectives_json
         ) VALUES (?, ?, ?, ?, ?)`,
      );
      for (const entry of input.entries)
        insert.run(
          entry.entryId,
          entry.sourceId,
          entry.lessonCode,
          entry.title ?? null,
          JSON.stringify(entry.objectives),
        );
    });
    return { status: 'imported' as const, acceptedCount: input.entries.length };
  }

  listEntries(options: {
    readonly classId: LearningObjectiveSource['classId'];
    readonly academicYear: string;
  }): readonly LearningObjectiveEntry[] {
    const rows = this.database.connection
      .prepare(
        `SELECT e.entry_id, e.source_id, e.lesson_code, e.title, e.objectives_json
           FROM learning_objective_entries e
           JOIN learning_objective_sources s ON s.source_id = e.source_id
          WHERE s.class_id = ? AND s.academic_year = ?
          ORDER BY e.lesson_code, e.entry_id
          LIMIT 1001`,
      )
      .all(options.classId, options.academicYear) as unknown as EntryRow[];
    if (rows.length > 1000)
      throw new Error('learning-objective-catalog-budget-exceeded');
    return rows.map(entryFromRow);
  }
}

function entryFromRow(row: EntryRow): LearningObjectiveEntry {
  let objectives: unknown;
  try {
    objectives = JSON.parse(row.objectives_json);
  } catch {
    throw new Error('learning-objective-catalog-row-invalid');
  }
  if (!validObjectives(objectives))
    throw new Error('learning-objective-catalog-row-invalid');
  return {
    entryId: row.entry_id,
    sourceId: row.source_id,
    lessonCode: row.lesson_code,
    objectives,
    ...(row.title === null ? {} : { title: row.title }),
  };
}

function validImport(input: LearningObjectiveCatalogImport): boolean {
  const source = input.source;
  return (
    bounded(input.importId, 256) &&
    bounded(source.sourceId, 256) &&
    bounded(source.classId, 128) &&
    /^\d{4}-\d{2}$/u.test(source.academicYear) &&
    bounded(source.sourceReference, 2_048) &&
    /^sha256:[a-f0-9]{64}$/u.test(source.contentHash) &&
    isIsoInstant(source.importedAt) &&
    input.entries.length >= 1 &&
    input.entries.length <= 1_000 &&
    new Set(input.entries.map((entry) => entry.lessonCode)).size ===
      input.entries.length &&
    input.entries.every(
      (entry) =>
        entry.sourceId === source.sourceId &&
        bounded(entry.entryId, 256) &&
        /^\d{1,3}(?:\.\d{1,3}){1,3}$/u.test(entry.lessonCode) &&
        optional(entry.title, 512) &&
        validObjectives(entry.objectives),
    )
  );
}

function validObjectives(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 6 &&
    value.every((objective) => bounded(objective, 1_000))
  );
}

function bounded(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' && value.length >= 1 && value.length <= maximum
  );
}

function optional(value: unknown, maximum: number): boolean {
  return value === undefined || bounded(value, maximum);
}
