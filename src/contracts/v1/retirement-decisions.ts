export interface RetirementDecision {
  readonly parityId: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly replacementOrRationale: string;
}

/** Explicit approvals only; retained behavior remains governed by the parity inventory. */
export const retirementDecisions: readonly RetirementDecision[] = [
  {
    parityId: 'DEP-001',
    approvedBy: 'Bren',
    approvedAt: '2026-08-30',
    replacementOrRationale:
      'Retire the original OpenClaw Classroom Screen runtime, Tailnet handler, and source repository after Chalkwright is self-contained and ready; retain local state and source as cold recovery evidence.',
  },
  {
    parityId: 'OPS-004',
    approvedBy: 'Bren',
    approvedAt: '2026-08-30',
    replacementOrRationale:
      'Retire the migration-era shadow service and refresh timer after the final recovery gate; retain backups, unit definitions, and rollback instructions without deleting state.',
  },
];
