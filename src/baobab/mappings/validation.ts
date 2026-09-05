import type { CanonicalMapping, MappingScope } from './types.js';

/**
 * Entity-type compatibility table (ADR-0013 §56). Generic mapping machinery
 * SHALL NOT eliminate domain validation — a Payload ProductContent record
 * may map to a canonical PRODUCT, never to a canonical LEGAL_ENTITY.
 */
const COMPATIBLE_EXTERNAL_TYPES: Record<string, string[]> = {
  PAGE: ['page'],
  ARTICLE: ['article'],
  CAMPAIGN: ['campaign'],
  MEDIA_ASSET: ['media'],
  PRODUCT: ['product-content', 'product', 'variant'],
  NAVIGATION: ['navigation'],
  TAXONOMY_TERM: ['taxonomy-term'],
  DOCUMENT: ['document'],
  CONTENT_FRAGMENT: ['content-fragment'],
};

export function isEntityTypeCompatible(canonicalEntityType: string, externalType: string): boolean {
  const allowed = COMPATIBLE_EXTERNAL_TYPES[canonicalEntityType];
  if (!allowed) return false;
  return allowed.includes(externalType);
}

/** ADR-0013 §37 — more than one plausible match SHALL fail, never guess. */
export function detectAmbiguousMatch<T>(candidates: T[]): boolean {
  return candidates.length > 1;
}

/** ADR-0013 §33-34 — temporal mapping validity. */
export function isMappingActiveAt(mapping: CanonicalMapping, atISO: string): boolean {
  if (mapping.lifecycleState !== 'ACTIVE') return false;
  const at = Date.parse(atISO);
  if (Date.parse(mapping.validFrom) > at) return false;
  if (mapping.validTo && Date.parse(mapping.validTo) < at) return false;
  return true;
}

/** ADR-0013 §16, §43 — mappings never grant access; they only resolve identity. */
export function assertMappingTenantCompatible(mapping: CanonicalMapping, scope: MappingScope): void {
  if (mapping.scope.tenantId !== scope.tenantId) {
    throw new Error(
      `Mapping for canonical entity "${mapping.canonicalEntityId}" belongs to a different tenant and cannot be used in this context.`,
    );
  }
}

export interface OverlapCheckInput {
  scope: MappingScope;
  externalReference: { engine: string; engineInstanceId: string; externalType: string };
  validFrom: string;
  validTo?: string;
}

/**
 * ADR-0013 §34 — non-overlapping active mappings for an exclusive scope.
 * Pure helper used both by the resolver implementation and by
 * reconciliation tooling.
 */
export function findOverlappingMappings(candidate: OverlapCheckInput, existing: CanonicalMapping[]): CanonicalMapping[] {
  const candidateStart = Date.parse(candidate.validFrom);
  const candidateEnd = candidate.validTo ? Date.parse(candidate.validTo) : Number.POSITIVE_INFINITY;

  return existing.filter((mapping) => {
    if (mapping.lifecycleState !== 'ACTIVE') return false;
    if (mapping.scope.tenantId !== candidate.scope.tenantId) return false;
    if (mapping.externalReference.engine !== candidate.externalReference.engine) return false;
    if (mapping.externalReference.engineInstanceId !== candidate.externalReference.engineInstanceId) return false;
    if (mapping.externalReference.externalType !== candidate.externalReference.externalType) return false;

    const existingStart = Date.parse(mapping.validFrom);
    const existingEnd = mapping.validTo ? Date.parse(mapping.validTo) : Number.POSITIVE_INFINITY;
    return candidateStart < existingEnd && existingStart < candidateEnd;
  });
}
