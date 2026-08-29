import type { IsoInstant } from '../../contracts/v1/common.js';
import type { GoogleDriveGlossaryCourseConfig } from '../../config/google-drive-glossary.js';
import { parseLearningObjectiveDocument } from '../../domain/learning-objectives.js';
import { stableId } from '../../domain/pure-values.js';
import type { LearningObjectiveCatalog } from '../../ports/learning-objective-catalog.js';
import {
  GoogleDriveGlossaryError,
  type DriveGlossaryFile,
  type DriveGlossaryReadTransport,
} from '../../infrastructure/google-drive/contracts.js';

const folderMimeType = 'application/vnd.google-apps.folder';
const supportedDocumentMimeTypes = new Set([
  'application/vnd.google-apps.document',
  'text/plain',
  'text/markdown',
]);

export interface DriveObjectiveImportResult {
  readonly sourceId: string;
  readonly status: 'imported' | 'unchanged';
  readonly acceptedCount: number;
}

/** Imports explicitly structured learning-objective documents for one course. */
export async function importDriveLearningObjectivesCourse(options: {
  readonly course: GoogleDriveGlossaryCourseConfig;
  readonly academicYearFolderId: string;
  readonly academicYear: string;
  readonly importedAt: IsoInstant;
  readonly transport: DriveGlossaryReadTransport;
  readonly catalog: LearningObjectiveCatalog;
  readonly requestTimeoutMs: number;
  readonly maximumPages: number;
  readonly maximumFiles: number;
  readonly signal: AbortSignal;
}): Promise<readonly DriveObjectiveImportResult[]> {
  if (options.course.objectiveFolderPath === undefined) return [];
  if (options.transport.readTextDocument === undefined)
    throw new Error('learning-objective-drive-transport-unavailable');
  let folderId = await exactFolder(options, {
    parentId: options.academicYearFolderId,
    name: options.course.courseName,
    missingCode: 'learning-objective-drive-course-folder-missing',
    ambiguousCode: 'learning-objective-drive-course-folder-ambiguous',
  });
  for (const name of options.course.objectiveFolderPath) {
    folderId = await exactFolder(options, {
      parentId: folderId,
      name,
      missingCode: 'learning-objective-drive-folder-missing',
      ambiguousCode: 'learning-objective-drive-folder-ambiguous',
    });
  }
  const documents = (await listAllChildren(options, folderId))
    .filter((file) => supportedDocumentMimeTypes.has(file.mimeType))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
    );
  if (documents.length === 0)
    throw new Error('learning-objective-drive-document-missing');
  if (documents.length > options.maximumFiles)
    throw new Error('learning-objective-drive-file-budget-exceeded');
  if (
    new Set(documents.map((document) => document.name)).size !==
    documents.length
  )
    throw new Error('learning-objective-drive-document-ambiguous');

  const results: DriveObjectiveImportResult[] = [];
  for (const document of documents) {
    const sourceId = stableId(
      'drive-learning-objectives',
      options.course.classId,
      document.id,
    );
    const text = await options.transport.readTextDocument({
      fileId: document.id,
      sourceMimeType: document.mimeType,
      signal: options.signal,
      timeoutMs: options.requestTimeoutMs,
    });
    const normalized = parseLearningObjectiveDocument({
      text,
      fileName: document.name,
      classId: options.course.classId,
      academicYear: options.academicYear,
      sourceId,
      sourceReference: `google-drive:${folderId}/${document.id}`,
      contentHash: `sha256:${createHash('sha256').update(text).digest('hex')}`,
      importedAt: options.importedAt,
    });
    const stored = await options.catalog.replaceSource(normalized);
    if (stored.status === 'rejected')
      throw new Error('learning-objective-catalog-write-rejected');
    results.push({
      sourceId,
      status: stored.status,
      acceptedCount: stored.acceptedCount,
    });
  }
  return results;
}

async function exactFolder(
  options: {
    readonly transport: DriveGlossaryReadTransport;
    readonly requestTimeoutMs: number;
    readonly maximumPages: number;
    readonly signal: AbortSignal;
  },
  expected: {
    readonly parentId: string;
    readonly name: string;
    readonly missingCode: string;
    readonly ambiguousCode: string;
  },
): Promise<string> {
  const matches = (await listAllChildren(options, expected.parentId)).filter(
    (file) => file.name === expected.name,
  );
  if (matches.length === 0) throw new Error(expected.missingCode);
  if (matches.length !== 1) throw new Error(expected.ambiguousCode);
  if (matches[0]!.mimeType !== folderMimeType)
    throw new Error(expected.missingCode);
  return matches[0]!.id;
}

async function listAllChildren(
  options: {
    readonly transport: DriveGlossaryReadTransport;
    readonly requestTimeoutMs: number;
    readonly maximumPages: number;
    readonly signal: AbortSignal;
  },
  parentId: string,
): Promise<readonly DriveGlossaryFile[]> {
  const files: DriveGlossaryFile[] = [];
  const pageTokens = new Set<string>();
  let pageToken: string | undefined;
  for (let page = 0; page < options.maximumPages; page += 1) {
    if (options.signal.aborted)
      throw new GoogleDriveGlossaryError('drive-request-timeout');
    const response = await options.transport.listChildren({
      parentId,
      signal: options.signal,
      timeoutMs: options.requestTimeoutMs,
      ...(pageToken === undefined ? {} : { pageToken }),
    });
    files.push(...response.files);
    if (response.nextPageToken === undefined) {
      pageToken = undefined;
      break;
    }
    if (pageTokens.has(response.nextPageToken))
      throw new Error('learning-objective-drive-pagination-invalid');
    pageTokens.add(response.nextPageToken);
    pageToken = response.nextPageToken;
  }
  if (pageToken !== undefined)
    throw new Error('learning-objective-drive-page-budget-exceeded');
  return files;
}

export { supportedDocumentMimeTypes };
import { createHash } from 'node:crypto';
