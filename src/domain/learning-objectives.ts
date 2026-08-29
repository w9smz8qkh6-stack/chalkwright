import type { IsoInstant, OpaqueId } from '../contracts/v1/common.js';
import type { ClassId } from './identities.js';
import type { NormalizedCourseworkItem } from './coursework.js';
import { compactText, stableId } from './pure-values.js';

export interface LearningObjectiveSource {
  readonly sourceId: OpaqueId;
  readonly classId: ClassId;
  readonly academicYear: string;
  readonly sourceReference: string;
  readonly contentHash: string;
  readonly importedAt: IsoInstant;
}

export interface LearningObjectiveEntry {
  readonly entryId: OpaqueId;
  readonly sourceId: OpaqueId;
  readonly lessonCode?: string;
  readonly objectives: readonly string[];
  readonly title?: string;
  /** Exact teacher-facing Classroom titles explicitly bound in the source. */
  readonly assignmentAliases?: readonly string[];
}

export interface LearningObjectiveCatalogImport {
  readonly importId: OpaqueId;
  readonly source: LearningObjectiveSource;
  readonly entries: readonly LearningObjectiveEntry[];
}

interface ParsedSection {
  readonly lessonCode?: string;
  readonly title?: string;
  readonly objectives: readonly string[];
  readonly assignmentAliases: readonly string[];
}

const lessonHeaderPatterns = [
  /^(?:#{1,6}\s*)?(?:lesson|section)\s*[:#-]?\s*(\d{1,3}(?:\.\d{1,3}){1,3})\b\s*(?:[-:–—]\s*)?(.*)$/iu,
  /^(?:#{1,6}\s*)?(\d{1,3}(?:\.\d{1,3}){1,3})\b\s*(?:[-:–—]\s*)?(.*)$/u,
  /^(?:#{1,6}\s*)?unit\s+(\d{1,3})\s*[,>:/-]+\s*chapter\s+(\d{1,3})\s*[,>:/-]+\s*section\s+(\d{1,3})\b\s*(?:[-:–—]\s*)?(.*)$/iu,
] as const;

const objectiveLabel =
  /^(?:[-*•]\s*)?(?:learning\s+objectives?|objectives?)\s*[:–—-]\s*(.*)$/iu;
const assignmentHeader = /^(?:#{1,6}\s*)?assignment\s*[:–—-]\s*(.+)$/iu;
const assignmentAliasLabel =
  /^(?:[-*•]\s*)?(?:assignment\s+alias(?:es)?|classroom\s+titles?)\s*[:–—-]\s*(.*)$/iu;
const studentOutcome = /^(?:[-*•]\s*)?students?\s+will\b.+/iu;
const bullet = /^(?:[-*•]|\d+[.)])\s+(.+)$/u;
const maximumObjectivesPerLesson = 12;
const maximumAssignmentAliasesPerEntry = 12;

export function normalizeLessonCode(value: unknown): string | undefined {
  const text = compactText(value).toUpperCase();
  if (/^\d{1,3}(?:\.\d{1,3}){1,3}$/u.test(text)) return text;
  if (/^\d{1,3}[A-Z]$/u.test(text)) return text;
  return undefined;
}

function lessonHeader(
  line: string,
): { readonly lessonCode: string; readonly title?: string } | undefined {
  for (const [index, pattern] of lessonHeaderPatterns.entries()) {
    const match = pattern.exec(line);
    if (match === null) continue;
    const lessonCode =
      index === 2 ? `${match[1]}.${match[2]}.${match[3]}` : (match[1] ?? '');
    const title = compactText(index === 2 ? match[4] : match[2]);
    return {
      lessonCode,
      ...(title.length === 0 ? {} : { title }),
    };
  }
  return undefined;
}

function boundedObjective(value: string): string | undefined {
  const objective = compactText(value.replace(/^[-*•]\s*/u, ''));
  return objective.length >= 8 && objective.length <= 1_000
    ? objective
    : undefined;
}

function boundedAssignmentAlias(value: string): string | undefined {
  const alias = compactText(value.replace(/^[-*•]\s*/u, ''));
  return alias.length >= 3 && alias.length <= 512 ? alias : undefined;
}

/**
 * Extracts explicitly labeled lesson objectives from a plain-text document.
 * It deliberately does not infer objectives from arbitrary prose.
 */
export function parseLearningObjectiveDocument(options: {
  readonly text: string;
  readonly fileName: string;
  readonly classId: ClassId;
  readonly academicYear: string;
  readonly sourceId: OpaqueId;
  readonly sourceReference: string;
  readonly contentHash: string;
  readonly importedAt: IsoInstant;
}): LearningObjectiveCatalogImport {
  if (Buffer.byteLength(options.text, 'utf8') > 1_000_000)
    throw new Error('learning-objective-document-too-large');
  const lines = options.text.replace(/\r\n?/gu, '\n').split('\n');
  if (lines.length > 10_000)
    throw new Error('learning-objective-document-too-large');

  const sections: ParsedSection[] = [];
  let current:
    | {
        lessonCode?: string;
        title?: string;
        objectives: string[];
        assignmentAliases: string[];
      }
    | undefined;
  let collecting: 'objectives' | 'assignment-aliases' | undefined;

  const flush = () => {
    if (
      current === undefined ||
      current.objectives.length === 0 ||
      (current.lessonCode === undefined &&
        current.assignmentAliases.length === 0)
    )
      return;
    sections.push({
      objectives: [...new Set(current.objectives)].slice(
        0,
        maximumObjectivesPerLesson,
      ),
      assignmentAliases: [...new Set(current.assignmentAliases)].slice(
        0,
        maximumAssignmentAliasesPerEntry,
      ),
      ...(current.lessonCode === undefined
        ? {}
        : { lessonCode: current.lessonCode }),
      ...(current.title === undefined ? {} : { title: current.title }),
    });
  };

  const fileLessonCode = options.fileName.match(
    /\b(\d{1,3}(?:\.\d{1,3}){1,3})\b/u,
  )?.[1];
  for (const rawLine of lines) {
    const line = compactText(rawLine);
    if (line.length === 0) {
      collecting = undefined;
      continue;
    }
    const header = lessonHeader(line);
    if (header !== undefined) {
      flush();
      current = { ...header, objectives: [], assignmentAliases: [] };
      collecting = undefined;
      continue;
    }
    const assignment = assignmentHeader.exec(line);
    if (assignment !== null) {
      const alias = boundedAssignmentAlias(assignment[1] ?? '');
      if (alias === undefined) continue;
      flush();
      current = { objectives: [], assignmentAliases: [alias] };
      collecting = undefined;
      continue;
    }
    const aliasLabel = assignmentAliasLabel.exec(line);
    if (aliasLabel !== null) {
      if (current === undefined) continue;
      const alias = boundedAssignmentAlias(aliasLabel[1] ?? '');
      if (alias !== undefined) current.assignmentAliases.push(alias);
      collecting = 'assignment-aliases';
      continue;
    }
    const labeled = objectiveLabel.exec(line);
    if (labeled !== null) {
      current ??= {
        objectives: [],
        assignmentAliases: [],
        ...(fileLessonCode === undefined ? {} : { lessonCode: fileLessonCode }),
      };
      const objective = boundedObjective(labeled[1] ?? '');
      if (objective !== undefined) current.objectives.push(objective);
      collecting = 'objectives';
      continue;
    }
    if (studentOutcome.test(line)) {
      current ??= {
        objectives: [],
        assignmentAliases: [],
        ...(fileLessonCode === undefined ? {} : { lessonCode: fileLessonCode }),
      };
      const objective = boundedObjective(line);
      if (objective !== undefined) current.objectives.push(objective);
      collecting = 'objectives';
      continue;
    }
    if (collecting !== undefined && current !== undefined) {
      const continuation = bullet.exec(line)?.[1];
      if (continuation !== undefined) {
        if (collecting === 'objectives') {
          const objective = boundedObjective(continuation);
          if (objective !== undefined) current.objectives.push(objective);
        } else {
          const alias = boundedAssignmentAlias(continuation);
          if (alias !== undefined) current.assignmentAliases.push(alias);
        }
        continue;
      }
      collecting = undefined;
    }
  }
  flush();

  const validSections = sections.filter(
    (section) =>
      (section.lessonCode !== undefined &&
        normalizeLessonCode(section.lessonCode) !== undefined) ||
      section.assignmentAliases.length > 0,
  );
  if (validSections.length === 0)
    throw new Error('learning-objective-document-no-entries');
  const duplicateCodes = validSections
    .flatMap((section) =>
      section.lessonCode === undefined ? [] : [section.lessonCode],
    )
    .filter((code, index, all) => all.indexOf(code) !== index);
  if (duplicateCodes.length > 0)
    throw new Error('learning-objective-document-ambiguous');
  const normalizedAliases = validSections.flatMap((section) =>
    section.assignmentAliases.map(normalizedLessonTitle),
  );
  if (new Set(normalizedAliases).size !== normalizedAliases.length)
    throw new Error('learning-objective-document-ambiguous');

  return {
    importId: stableId(
      'learning-objective-import',
      options.sourceId,
      options.importedAt,
    ),
    source: {
      sourceId: options.sourceId,
      classId: options.classId,
      academicYear: options.academicYear,
      sourceReference: options.sourceReference,
      contentHash: options.contentHash,
      importedAt: options.importedAt,
    },
    entries: validSections.map((section) => ({
      entryId: stableId(
        'learning-objective',
        options.sourceId,
        section.lessonCode ??
          `assignment:${section.assignmentAliases.map(normalizedLessonTitle).join('\u0000')}`,
      ),
      sourceId: options.sourceId,
      objectives: section.objectives,
      ...(section.lessonCode === undefined
        ? {}
        : { lessonCode: section.lessonCode }),
      ...(section.title === undefined ? {} : { title: section.title }),
      ...(section.assignmentAliases.length === 0
        ? {}
        : { assignmentAliases: section.assignmentAliases }),
    })),
  };
}

export function courseworkLessonCodes(
  item: Pick<NormalizedCourseworkItem, 'title' | 'description' | 'materials'>,
): readonly string[] {
  const text = [
    item.title,
    item.description,
    ...item.materials.map((material) => material.title),
  ].join(' ');
  const dotted = [...text.matchAll(/\b\d{1,3}(?:\.\d{1,3}){1,3}\b/gu)].map(
    (match) => match[0],
  );
  const units = [...text.matchAll(/\bunit\s+(\d{1,3}[A-Za-z]?)\b/giu)].map(
    (match) => match[1]!.toUpperCase(),
  );
  return [...new Set([...dotted, ...units])].sort(
    (left, right) =>
      right.split('.').length - left.split('.').length ||
      left.localeCompare(right),
  );
}

function normalizedLessonTitle(value: unknown): string {
  return compactText(value)
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function objectivesFromUniqueMatches(
  matches: readonly LearningObjectiveEntry[],
): readonly string[] | undefined {
  if (matches.length === 0) return undefined;
  const objectiveSets = new Map(
    matches.map((entry) => [
      JSON.stringify(entry.objectives),
      entry.objectives,
    ]),
  );
  return objectiveSets.size === 1
    ? structuredClone([...objectiveSets.values()][0]!)
    : undefined;
}

/** Returns a match only when the most-specific identifier or title is unique. */
export function learningObjectivesForCoursework(
  item: Pick<NormalizedCourseworkItem, 'title' | 'description' | 'materials'>,
  entries: readonly LearningObjectiveEntry[],
): readonly string[] | undefined {
  const codes = courseworkLessonCodes(item);
  for (const code of codes) {
    const matches = entries.filter((entry) => entry.lessonCode === code);
    if (matches.length === 0) continue;
    return objectivesFromUniqueMatches(matches);
  }

  const assignmentTitle = normalizedLessonTitle(item.title);
  const aliasMatches = entries.filter((entry) =>
    entry.assignmentAliases?.some(
      (alias) => normalizedLessonTitle(alias) === assignmentTitle,
    ),
  );
  if (aliasMatches.length > 0) return objectivesFromUniqueMatches(aliasMatches);

  const parentCodes = [
    ...new Set(
      codes.flatMap((code) => {
        const components = code.split('.');
        return components.length >= 3
          ? [components.slice(0, -1).join('.')]
          : [];
      }),
    ),
  ];
  const parentMatches = entries.filter(
    (entry) =>
      entry.lessonCode !== undefined && parentCodes.includes(entry.lessonCode),
  );
  if (parentMatches.length > 0)
    return objectivesFromUniqueMatches(parentMatches);

  const courseworkText = normalizedLessonTitle(
    [
      item.title,
      item.description,
      ...item.materials.map((material) => material.title),
    ].join(' '),
  );
  const titleMatches = entries
    .map((entry) => ({
      entry,
      normalizedTitle: normalizedLessonTitle(entry.title),
    }))
    .filter(
      ({ normalizedTitle }) =>
        normalizedTitle.length >= 12 &&
        courseworkText.includes(normalizedTitle),
    );
  const maximumTitleLength = Math.max(
    0,
    ...titleMatches.map(({ normalizedTitle }) => normalizedTitle.length),
  );
  return objectivesFromUniqueMatches(
    titleMatches
      .filter(
        ({ normalizedTitle }) => normalizedTitle.length === maximumTitleLength,
      )
      .map(({ entry }) => entry),
  );
}
