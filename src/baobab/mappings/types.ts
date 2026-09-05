/**
 * Canonical mapping types (ADR-0013 §10-15). These mirror the Control
 * Plane's canonical mapping model; Payload consumes them, it does not own
 * their authoritative definitions (ADR-0013 §40, §74).
 */

export const MappingEngine = {
  PAYLOAD: 'PAYLOAD',
  MEDUSA: 'MEDUSA',
  IDEMPIERE: 'IDEMPIERE',
} as const;
export type MappingEngine = (typeof MappingEngine)[keyof typeof MappingEngine];

export const MappingLifecycleState = {
  PROPOSED: 'PROPOSED',
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  RETIRED: 'RETIRED',
  INVALID: 'INVALID',
  AMBIGUOUS: 'AMBIGUOUS',
} as const;
export type MappingLifecycleState = (typeof MappingLifecycleState)[keyof typeof MappingLifecycleState];

export const MappingProvenance = {
  MANUAL: 'MANUAL',
  MIGRATION: 'MIGRATION',
  DETERMINISTIC: 'DETERMINISTIC',
  RECONCILIATION: 'RECONCILIATION',
  IMPORT: 'IMPORT',
  SYSTEM: 'SYSTEM',
} as const;
export type MappingProvenance = (typeof MappingProvenance)[keyof typeof MappingProvenance];

/** ADR-0013 §10-11 — external identity is only meaningful with its engine instance. */
export interface ExternalReference {
  engine: MappingEngine;
  engineInstanceId: string;
  externalType: string;
  /** Opaque — never parsed for semantic meaning (ADR-0013 §12). */
  externalId: string;
}

/** ADR-0013 §15 — constrains where/when a mapping applies. */
export interface MappingScope {
  tenantId: string;
  legalEntityId?: string;
  digitalEstateId?: string;
  marketId?: string;
}

export interface CanonicalMapping {
  canonicalEntityId: string;
  canonicalEntityType: string;
  externalReference: ExternalReference;
  scope: MappingScope;
  lifecycleState: MappingLifecycleState;
  provenance: MappingProvenance;
  confidence?: number;
  validFrom: string;
  validTo?: string;
}
