/**
 * Small adapter-neutral conformance runner. A suite owns its scenarios while
 * this Core utility guarantees finite, deterministic pass/fail reports and
 * never returns an adapter's thrown detail.
 */
export interface CoreConformanceCase<Adapter> {
  readonly id: string;
  run(adapter: Adapter): Promise<void> | void;
}

export interface CoreConformanceResult {
  readonly id: string;
  readonly status: 'passed' | 'failed';
  readonly diagnostic?: 'case-failed';
}

export interface CoreConformanceReport {
  readonly status: 'passed' | 'failed';
  readonly results: readonly CoreConformanceResult[];
}

export async function runCoreConformanceSuite<Adapter>(
  adapter: Adapter,
  cases: readonly CoreConformanceCase<Adapter>[],
): Promise<CoreConformanceReport> {
  const ids = new Set<string>();
  const results: CoreConformanceResult[] = [];
  for (const item of cases) {
    if (!/^[a-z][a-z0-9-]{2,63}$/u.test(item.id) || ids.has(item.id)) {
      throw new TypeError('Core conformance case identifiers must be unique.');
    }
    ids.add(item.id);
    try {
      await item.run(adapter);
      results.push({ id: item.id, status: 'passed' });
    } catch {
      results.push({
        id: item.id,
        status: 'failed',
        diagnostic: 'case-failed',
      });
    }
  }
  return {
    status: results.every((result) => result.status === 'passed')
      ? 'passed'
      : 'failed',
    results,
  };
}
