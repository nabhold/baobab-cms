import { describe, expect, it } from 'vitest';
import {
  findRecordsMissingTenant,
  findStaleMappingProjections,
  summarizeOutboxBacklog,
  findMissingMediaObjects,
  findOrphanedStorageObjects,
} from './checks.js';

describe('findRecordsMissingTenant — ADR-0012 §10, §94', () => {
  it('flags a record with neither tenant nor PLATFORM scope', () => {
    const flagged = findRecordsMissingTenant([{ id: '1' }, { id: '2', tenant: 't1' }, { id: '3', contentScope: 'PLATFORM' }]);
    expect(flagged.map((r) => r.id)).toEqual(['1']);
  });
});

describe('findStaleMappingProjections — ADR-0013 §46', () => {
  it('flags projections older than the max age or explicitly marked stale', () => {
    const now = new Date('2026-06-15T00:00:00.000Z');
    const flagged = findStaleMappingProjections(
      [
        { id: '1', syncedAt: '2026-06-14T23:00:00.000Z' },
        { id: '2', syncedAt: '2026-01-01T00:00:00.000Z' },
        { id: '3', syncedAt: '2026-06-14T23:00:00.000Z', stale: true },
      ],
      24 * 60 * 60 * 1000,
      now,
    );
    expect(flagged.map((r) => r.id).sort()).toEqual(['2', '3']);
  });
});

describe('summarizeOutboxBacklog — ADR-0018 §89-90', () => {
  it('categorises pending/retrying/dead-lettered counts', () => {
    const summary = summarizeOutboxBacklog([
      { id: '1', status: 'PENDING', attemptCount: 0 },
      { id: '2', status: 'PUBLISHING', attemptCount: 1 },
      { id: '3', status: 'FAILED_RETRYABLE', attemptCount: 2 },
      { id: '4', status: 'FAILED_TERMINAL', attemptCount: 8 },
      { id: '5', status: 'PUBLISHED', attemptCount: 1 },
    ]);
    expect(summary).toEqual({ pending: 2, retrying: 1, deadLettered: 1 });
  });
});

describe('media reconciliation — ADR-0016 §86-88', () => {
  it('finds media records whose object is missing from storage', () => {
    const missing = findMissingMediaObjects(
      [{ id: '1', filename: 'a.png' }, { id: '2', filename: 'b.png' }],
      new Set(['a.png']),
    );
    expect(missing.map((r) => r.id)).toEqual(['2']);
  });

  it('finds storage objects with no referencing media record', () => {
    const orphaned = findOrphanedStorageObjects([{ id: '1', filename: 'a.png' }], ['a.png', 'b.png']);
    expect(orphaned).toEqual(['b.png']);
  });
});
