/** ADR-0020 §52-56 — health distinguishes process, dependency and degraded states. */
export type DependencyStatus = 'ok' | 'degraded' | 'unavailable';

export interface DependencyHealth {
  name: string;
  status: DependencyStatus;
  critical: boolean;
  detail?: string;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unavailable';
  dependencies: DependencyHealth[];
  timestamp: string;
}

/**
 * Combines dependency checks into one report. A non-critical dependency
 * (e.g. the outbox backlog, an analytics integration) never drags the
 * whole engine to `unavailable` — only a critical dependency failure does
 * (ADR-0020 §55, §134-136).
 */
export function summarizeHealth(dependencies: DependencyHealth[]): HealthReport {
  const criticalUnavailable = dependencies.some((d) => d.critical && d.status === 'unavailable');
  const anyDegraded = dependencies.some((d) => d.status !== 'ok');

  const status: HealthReport['status'] = criticalUnavailable ? 'unavailable' : anyDegraded ? 'degraded' : 'healthy';

  return { status, dependencies, timestamp: new Date().toISOString() };
}
