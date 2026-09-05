import type { ContentScope } from '../tenancy/scope.js';

/** ADR-0014 §17-21. */
export const InheritanceMode = {
  NONE: 'NONE',
  INHERIT: 'INHERIT',
  OVERRIDE: 'OVERRIDE',
  COMPOSE: 'COMPOSE',
} as const;
export type InheritanceMode = (typeof InheritanceMode)[keyof typeof InheritanceMode];

export type PublicationState = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

/** The optional narrowing dimensions the resolver reasons about beyond tenant. */
export type OptionalDimension = 'legalEntityId' | 'digitalEstateId' | 'marketId' | 'locale';

export const OPTIONAL_DIMENSION_PRIORITY: OptionalDimension[] = [
  'locale',
  'marketId',
  'digitalEstateId',
  'legalEntityId',
];

export interface ResolvableRecord {
  id: string;
  tenantId: string;
  legalEntityId?: string;
  digitalEstateId?: string;
  marketId?: string;
  locale?: string;
  contentKey: string;
  publicationState: PublicationState;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface ResolutionRequest {
  tenantId: string;
  legalEntityId?: string;
  digitalEstateId?: string;
  marketId?: string;
  locale?: string;
  contentKey: string;
  effectiveTime?: string;
  previewMode?: boolean;
}

export interface ResolutionPolicy {
  contentType: string;
  inheritanceMode: InheritanceMode;
  supportedScopes: ContentScope[];
  /** Explicit, deterministic fallback chain per locale (ADR-0014 §27, §102 — never inferred). */
  localeFallback?: Record<string, string[]>;
}

export interface ResolutionTraceStep {
  level: Partial<Record<OptionalDimension, string | undefined>>;
  localeAttempted?: string;
  matchCount: number;
}

export interface ResolutionResult<T extends ResolvableRecord> {
  record: T | null;
  records: T[];
  matchedScope: 'EXACT' | 'FALLBACK' | 'NONE';
  trace: ResolutionTraceStep[];
}

export class AmbiguousResolutionError extends Error {
  constructor(contentKey: string, level: unknown) {
    super(`Ambiguous resolution for content key "${contentKey}" at scope level ${JSON.stringify(level)}: more than one equally specific record is eligible.`);
    this.name = 'AmbiguousResolutionError';
  }
}
