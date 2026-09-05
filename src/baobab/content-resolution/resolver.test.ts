import { describe, expect, it } from 'vitest';
import { resolveContent, resolveComposedContent } from './resolver.js';
import { InheritanceMode, AmbiguousResolutionError } from './types.js';
import { ContentScope } from '../tenancy/scope.js';
import type { ResolutionPolicy, ResolvableRecord } from './types.js';

const inheritPolicy: ResolutionPolicy = {
  contentType: 'page',
  inheritanceMode: InheritanceMode.INHERIT,
  supportedScopes: [ContentScope.DIGITAL_ESTATE, ContentScope.MARKET, ContentScope.LOCALE],
};

const nonePolicy: ResolutionPolicy = {
  contentType: 'legal-notice',
  inheritanceMode: InheritanceMode.NONE,
  supportedScopes: [ContentScope.MARKET, ContentScope.LOCALE],
};

function page(overrides: Partial<ResolvableRecord>): ResolvableRecord {
  return {
    id: overrides.id ?? Math.random().toString(36),
    tenantId: 'tenant-a',
    contentKey: 'home',
    publicationState: 'PUBLISHED',
    ...overrides,
  };
}

describe('resolveContent — deterministic scope resolution (ADR-0014)', () => {
  it('CT-001: exact scope wins over broader eligible content', () => {
    const broad = page({ id: 'broad' });
    const exact = page({ id: 'exact', digitalEstateId: 'estate-a', marketId: 'market-a' });
    const result = resolveContent(
      { tenantId: 'tenant-a', digitalEstateId: 'estate-a', marketId: 'market-a', contentKey: 'home' },
      [broad, exact],
      inheritPolicy,
    );
    expect(result.record?.id).toBe('exact');
    expect(result.matchedScope).toBe('EXACT');
  });

  it('CT-002: broader tenant content is used only via INHERIT fallback', () => {
    const broad = page({ id: 'broad' });
    const result = resolveContent(
      { tenantId: 'tenant-a', digitalEstateId: 'estate-a', contentKey: 'home' },
      [broad],
      inheritPolicy,
    );
    expect(result.record?.id).toBe('broad');
    expect(result.matchedScope).toBe('FALLBACK');
  });

  it('CT-007: missing Tenant A content never resolves Tenant B content', () => {
    const tenantBRecord = page({ id: 'b', tenantId: 'tenant-b' });
    const result = resolveContent({ tenantId: 'tenant-a', contentKey: 'home' }, [tenantBRecord], inheritPolicy);
    expect(result.record).toBeNull();
    expect(result.matchedScope).toBe('NONE');
  });

  it('CT-008: NONE policy fails when the exact representation is absent, even if broader content exists', () => {
    const broad = page({ id: 'broad' });
    const result = resolveContent({ tenantId: 'tenant-a', marketId: 'market-a', contentKey: 'home' }, [broad], nonePolicy);
    expect(result.record).toBeNull();
  });

  it('CT-010: two equally specific eligible records raise an integrity error, never a silent tie-break', () => {
    const a = page({ id: 'a', digitalEstateId: 'estate-a' });
    const b = page({ id: 'b', digitalEstateId: 'estate-a' });
    expect(() =>
      resolveContent({ tenantId: 'tenant-a', digitalEstateId: 'estate-a', contentKey: 'home' }, [a, b], inheritPolicy),
    ).toThrow(AmbiguousResolutionError);
  });

  it('CT-011: expired content does not resolve outside its validity window', () => {
    const expired = page({ id: 'expired', effectiveTo: '2020-01-01T00:00:00.000Z' });
    const result = resolveContent(
      { tenantId: 'tenant-a', contentKey: 'home', effectiveTime: '2026-01-01T00:00:00.000Z' },
      [expired],
      inheritPolicy,
    );
    expect(result.record).toBeNull();
  });

  it('CT-012: draft content is excluded from public resolution', () => {
    const draft = page({ id: 'draft', publicationState: 'DRAFT' });
    const result = resolveContent({ tenantId: 'tenant-a', contentKey: 'home' }, [draft], inheritPolicy);
    expect(result.record).toBeNull();
  });

  it('CT-013: preview resolution allows draft content using the same scope rules', () => {
    const draft = page({ id: 'draft', publicationState: 'DRAFT' });
    const result = resolveContent(
      { tenantId: 'tenant-a', contentKey: 'home', previewMode: true },
      [draft],
      inheritPolicy,
    );
    expect(result.record?.id).toBe('draft');
  });

  it('CT-006: explicit configured locale fallback resolves deterministically', () => {
    const localePolicy: ResolutionPolicy = {
      ...inheritPolicy,
      localeFallback: { 'en-ZA': ['en'] },
    };
    const enFallback = page({ id: 'en', locale: 'en' });
    const result = resolveContent({ tenantId: 'tenant-a', locale: 'en-ZA', contentKey: 'home' }, [enFallback], localePolicy);
    expect(result.record?.id).toBe('en');
    expect(result.matchedScope).toBe('FALLBACK');
  });

  it('locale fallback never crosses into an unconfigured locale', () => {
    const localePolicy: ResolutionPolicy = { ...inheritPolicy, localeFallback: {} };
    const usRecord = page({ id: 'us', locale: 'en-US' });
    const result = resolveContent({ tenantId: 'tenant-a', locale: 'en-ZA', contentKey: 'home' }, [usRecord], localePolicy);
    expect(result.record).toBeNull();
  });
});

describe('resolveComposedContent — ADR-0014 §21, §68-70', () => {
  const composePolicy: ResolutionPolicy = {
    contentType: 'navigation',
    inheritanceMode: InheritanceMode.COMPOSE,
    supportedScopes: [ContentScope.DIGITAL_ESTATE, ContentScope.MARKET],
  };

  it('CT-009: composition produces deterministic ordered output from broad to narrow', () => {
    const tenantWide = page({ id: 'tenant-wide' });
    const estateSpecific = page({ id: 'estate-specific', digitalEstateId: 'estate-a' });
    const result = resolveComposedContent(
      { tenantId: 'tenant-a', digitalEstateId: 'estate-a', contentKey: 'home' },
      [tenantWide, estateSpecific],
      composePolicy,
    );
    expect(result.records.map((r) => r.id)).toEqual(['tenant-wide', 'estate-specific']);
  });

  it('rejects being used with a non-COMPOSE policy', () => {
    expect(() => resolveComposedContent({ tenantId: 'tenant-a', contentKey: 'home' }, [], inheritPolicy)).toThrow();
  });
});

describe('resolveContent misuse guard', () => {
  it('refuses to run against a COMPOSE policy', () => {
    const composePolicy: ResolutionPolicy = { ...inheritPolicy, inheritanceMode: InheritanceMode.COMPOSE };
    expect(() => resolveContent({ tenantId: 'tenant-a', contentKey: 'home' }, [], composePolicy)).toThrow();
  });
});
