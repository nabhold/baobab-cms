import { describe, expect, it } from 'vitest';
import {
  isEntityTypeCompatible,
  detectAmbiguousMatch,
  isMappingActiveAt,
  assertMappingTenantCompatible,
  findOverlappingMappings,
} from './validation.js';
import type { CanonicalMapping } from './types.js';

function mapping(overrides: Partial<CanonicalMapping> = {}): CanonicalMapping {
  return {
    canonicalEntityId: 'canonical-1',
    canonicalEntityType: 'PRODUCT',
    externalReference: { engine: 'PAYLOAD', engineInstanceId: 'inst-1', externalType: 'product-content', externalId: 'ext-1' },
    scope: { tenantId: 'tenant-a' },
    lifecycleState: 'ACTIVE',
    provenance: 'MANUAL',
    validFrom: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isEntityTypeCompatible — ADR-0013 §56', () => {
  it('accepts a valid product-content to PRODUCT mapping', () => {
    expect(isEntityTypeCompatible('PRODUCT', 'product-content')).toBe(true);
  });

  it('rejects an incompatible entity-type pairing', () => {
    expect(isEntityTypeCompatible('PRODUCT', 'legal-entity')).toBe(false);
  });
});

describe('detectAmbiguousMatch — ADR-0013 §37', () => {
  it('flags more than one candidate as ambiguous', () => {
    expect(detectAmbiguousMatch([1, 2])).toBe(true);
    expect(detectAmbiguousMatch([1])).toBe(false);
    expect(detectAmbiguousMatch([])).toBe(false);
  });
});

describe('isMappingActiveAt', () => {
  it('is inactive before validFrom and after validTo', () => {
    const m = mapping({ validFrom: '2026-06-01T00:00:00.000Z', validTo: '2026-06-30T00:00:00.000Z' });
    expect(isMappingActiveAt(m, '2026-05-01T00:00:00.000Z')).toBe(false);
    expect(isMappingActiveAt(m, '2026-06-15T00:00:00.000Z')).toBe(true);
    expect(isMappingActiveAt(m, '2026-07-01T00:00:00.000Z')).toBe(false);
  });

  it('a RETIRED mapping is never active', () => {
    const m = mapping({ lifecycleState: 'RETIRED' });
    expect(isMappingActiveAt(m, '2026-06-15T00:00:00.000Z')).toBe(false);
  });
});

describe('assertMappingTenantCompatible — ADR-0013 §16', () => {
  it('throws when the mapping belongs to a different tenant', () => {
    const m = mapping({ scope: { tenantId: 'tenant-a' } });
    expect(() => assertMappingTenantCompatible(m, { tenantId: 'tenant-b' })).toThrow();
  });

  it('passes for a matching tenant', () => {
    const m = mapping({ scope: { tenantId: 'tenant-a' } });
    expect(() => assertMappingTenantCompatible(m, { tenantId: 'tenant-a' })).not.toThrow();
  });
});

describe('findOverlappingMappings — ADR-0013 §34', () => {
  it('detects a temporally overlapping active mapping for the same exclusive scope', () => {
    const existing = [mapping({ validFrom: '2026-01-01T00:00:00.000Z', validTo: '2026-12-31T00:00:00.000Z' })];
    const overlaps = findOverlappingMappings(
      {
        scope: { tenantId: 'tenant-a' },
        externalReference: { engine: 'PAYLOAD', engineInstanceId: 'inst-1', externalType: 'product-content' },
        validFrom: '2026-06-01T00:00:00.000Z',
      },
      existing,
    );
    expect(overlaps).toHaveLength(1);
  });

  it('does not flag mappings for a different engine instance', () => {
    const existing = [mapping({ externalReference: { engine: 'PAYLOAD', engineInstanceId: 'inst-2', externalType: 'product-content', externalId: 'ext-1' } })];
    const overlaps = findOverlappingMappings(
      {
        scope: { tenantId: 'tenant-a' },
        externalReference: { engine: 'PAYLOAD', engineInstanceId: 'inst-1', externalType: 'product-content' },
        validFrom: '2026-06-01T00:00:00.000Z',
      },
      existing,
    );
    expect(overlaps).toHaveLength(0);
  });
});
