import type {
  LearningObjectiveCatalogImport,
  LearningObjectiveEntry,
} from '../domain/learning-objectives.js';
import type { ClassId } from '../domain/identities.js';

export interface LearningObjectiveCatalog {
  replaceSource(input: LearningObjectiveCatalogImport): Promise<{
    readonly status: 'imported' | 'unchanged' | 'rejected';
    readonly acceptedCount: number;
  }>;
  listEntries(options: {
    readonly classId: ClassId;
    readonly academicYear: string;
  }): readonly LearningObjectiveEntry[];
}
