/**
 * Pure reconciliation predicates (ADR-0012 §81, ADR-0013 §55, ADR-0018
 * §99-101, ADR-0020 §112). Kept dependency-free and DB-free so they are
 * unit-testable; `scripts/reconciliation/run.ts` is the thin runnable
 * wrapper that feeds real Payload query results through these.
 */

export interface TenantOwnedRecord {
  id: string | number;
  tenant?: unknown;
  contentScope?: string;
}

/** ADR-0012 §10, §94 — a record with neither a tenant nor explicit PLATFORM scope is an anomaly. */
export function findRecordsMissingTenant(records: TenantOwnedRecord[]): TenantOwnedRecord[] {
  return records.filter((record) => !record.tenant && record.contentScope !== 'PLATFORM');
}

export interface MappingProjectionRecord {
  id: string | number;
  syncedAt: string;
  stale?: boolean;
}

/** ADR-0013 §46 — projection staleness must be detectable. */
export function findStaleMappingProjections(
  projections: MappingProjectionRecord[],
  maxAgeMs: number,
  now: Date = new Date(),
): MappingProjectionRecord[] {
  return projections.filter((p) => p.stale || now.getTime() - Date.parse(p.syncedAt) > maxAgeMs);
}

export interface OutboxRecord {
  id: string | number;
  status: string;
  attemptCount: number;
}

export interface OutboxBacklogSummary {
  pending: number;
  retrying: number;
  deadLettered: number;
}

/** ADR-0018 §89-90 — outbox backlog and dead-letter counts must be observable. */
export function summarizeOutboxBacklog(records: OutboxRecord[]): OutboxBacklogSummary {
  return {
    pending: records.filter((r) => r.status === 'PENDING' || r.status === 'PUBLISHING').length,
    retrying: records.filter((r) => r.status === 'FAILED_RETRYABLE').length,
    deadLettered: records.filter((r) => r.status === 'FAILED_TERMINAL').length,
  };
}

export interface MediaRecord {
  id: string | number;
  filename?: string | null;
}

/** ADR-0016 §86-87 — orphan/missing object detection (given a set of known storage keys). */
export function findMissingMediaObjects(mediaRecords: MediaRecord[], existingStorageKeys: Set<string>): MediaRecord[] {
  return mediaRecords.filter((record) => record.filename && !existingStorageKeys.has(record.filename));
}

export function findOrphanedStorageObjects(mediaRecords: MediaRecord[], storageKeys: string[]): string[] {
  const referenced = new Set(mediaRecords.map((r) => r.filename).filter((v): v is string => Boolean(v)));
  return storageKeys.filter((key) => !referenced.has(key));
}
