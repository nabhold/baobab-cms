/**
 * Content scope classification (ADR-0012 §11, §67). Every tenant-aware
 * collection declares which of these dimensions it supports; this is not a
 * UI grouping, it drives eligibility, inheritance, authorization,
 * publication, caching and reconciliation.
 */
export const ContentScope = {
  PLATFORM: 'PLATFORM',
  TENANT: 'TENANT',
  LEGAL_ENTITY: 'LEGAL_ENTITY',
  DIGITAL_ESTATE: 'DIGITAL_ESTATE',
  MARKET: 'MARKET',
  LOCALE: 'LOCALE',
} as const;

export type ContentScope = (typeof ContentScope)[keyof typeof ContentScope];

/** Increasing specificity ordering (ADR-0012 §28-29, ADR-0014 §15). */
export const SCOPE_SPECIFICITY_ORDER: ContentScope[] = [
  ContentScope.PLATFORM,
  ContentScope.TENANT,
  ContentScope.LEGAL_ENTITY,
  ContentScope.DIGITAL_ESTATE,
  ContentScope.MARKET,
  ContentScope.LOCALE,
];

export function scopeSpecificity(scope: ContentScope): number {
  return SCOPE_SPECIFICITY_ORDER.indexOf(scope);
}
