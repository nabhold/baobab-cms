import { describe, expect, it } from 'vitest';
import { buildCanonicalEvent } from './build-envelope.js';
import { CanonicalEventType, SOURCE_ENGINE } from './types.js';

describe('buildCanonicalEvent — ADR-0018 §11-24', () => {
  it('produces a well-formed envelope with a unique event id and source engine', () => {
    const envelope = buildCanonicalEvent({
      eventType: CanonicalEventType.CONTENT_PUBLISHED,
      canonicalEntityId: 'canonical-1',
      canonicalEntityType: 'PAGE',
      tenantId: 'tenant-a',
      correlationId: 'corr-1',
      payload: { id: 'p1' },
    });

    expect(envelope.eventId).toBeTruthy();
    expect(envelope.eventVersion).toBe(1);
    expect(envelope.sourceEngine).toBe(SOURCE_ENGINE);
    expect(envelope.eventType).toBe(CanonicalEventType.CONTENT_PUBLISHED);
    expect(envelope.tenantId).toBe('tenant-a');
    expect(new Date(envelope.occurredAt).toString()).not.toBe('Invalid Date');
  });

  it('two envelopes for the same logical change get distinct event ids (idempotency key material)', () => {
    const base = {
      eventType: CanonicalEventType.CONTENT_UPDATED,
      canonicalEntityId: 'canonical-1',
      canonicalEntityType: 'PAGE',
      tenantId: 'tenant-a',
      correlationId: 'corr-1',
      payload: {},
    };
    const first = buildCanonicalEvent(base);
    const second = buildCanonicalEvent(base);
    expect(first.eventId).not.toBe(second.eventId);
  });
});
