import {
  evaluateUploadInspection,
  type UploadAdmissionResult,
  type UploadInspection,
  type UploadedSnapshotSourceDefinition,
} from '../../contracts/v1/index.js';

export interface UploadedSourceImportProjection {
  readonly sourceDefinitionId: string;
  readonly status: 'accepted' | 'unavailable';
  readonly acceptedAdmission:
    Extract<UploadAdmissionResult, { status: 'accepted' }>['admission'] | null;
  readonly lastFailure:
    Extract<UploadAdmissionResult, { status: 'rejected' }>['reason'] | null;
}

/**
 * C05 records only an already-inspected local upload admission. Raw bytes,
 * filenames, and storage paths never enter the projection; a rejected
 * replacement keeps the prior accepted admission as last-known-good state.
 */
export class UploadedSourceImportService {
  #accepted = new Map<
    string,
    Extract<UploadAdmissionResult, { status: 'accepted' }>['admission']
  >();
  #failures = new Map<
    string,
    Extract<UploadAdmissionResult, { status: 'rejected' }>['reason']
  >();

  inspect(
    definition: UploadedSnapshotSourceDefinition,
    inspection: UploadInspection,
  ): UploadAdmissionResult {
    const result = evaluateUploadInspection(definition, inspection);
    const key = definition.sourceDefinitionId;
    if (result.status === 'accepted') {
      this.#accepted.set(key, structuredClone(result.admission));
      this.#failures.delete(key);
    } else {
      this.#failures.set(key, result.reason);
    }
    return structuredClone(result);
  }

  project(
    definition: UploadedSnapshotSourceDefinition,
  ): UploadedSourceImportProjection {
    const key = definition.sourceDefinitionId;
    const accepted = this.#accepted.get(key) ?? null;
    return {
      sourceDefinitionId: key,
      status: accepted === null ? 'unavailable' : 'accepted',
      acceptedAdmission: accepted === null ? null : structuredClone(accepted),
      lastFailure: this.#failures.get(key) ?? null,
    };
  }
}
