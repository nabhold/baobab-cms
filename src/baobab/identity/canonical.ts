import { randomUUID } from 'node:crypto';

/**
 * Canonical entity type vocabulary this engine currently issues identity
 * for (ADR-0013 §8). Extensible — the existence of a Payload collection
 * does not by itself require a new canonical entity type (ADR-0013 §9).
 */
export const CanonicalEntityType = {
  PAGE: 'PAGE',
  ARTICLE: 'ARTICLE',
  CAMPAIGN: 'CAMPAIGN',
  MEDIA_ASSET: 'MEDIA_ASSET',
  PRODUCT: 'PRODUCT',
  NAVIGATION: 'NAVIGATION',
  TAXONOMY_TERM: 'TAXONOMY_TERM',
  DOCUMENT: 'DOCUMENT',
  CONTENT_FRAGMENT: 'CONTENT_FRAGMENT',
} as const;

export type CanonicalEntityType = (typeof CanonicalEntityType)[keyof typeof CanonicalEntityType];

/**
 * Issues a canonical entity identifier.
 *
 * In production this value SHOULD be minted by the Baobab Control Plane
 * (ADR-0013 §5, §13 — UUIDv7 per the parent Control Plane contract) and
 * handed to Payload as part of a governed creation workflow. Because no
 * Control Plane exists yet to call, this local generator is the documented
 * fallback: it is opaque, immutable once assigned, and Payload treats it
 * exactly like a Control-Plane-issued value everywhere else in this
 * codebase — see `mappings/resolver.ts` for the swap-in point.
 */
export function issueCanonicalEntityId(): string {
  return randomUUID();
}

/** ADR-0013 §12 — canonical/external identifiers are opaque; never parsed. */
export function isOpaqueIdentifier(value: string): boolean {
  return typeof value === 'string' && value.length > 0;
}
