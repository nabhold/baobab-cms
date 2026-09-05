import { ContentScope } from '../tenancy/scope.js';
import { InheritanceMode, OPTIONAL_DIMENSION_PRIORITY } from './types.js';
import type { OptionalDimension, ResolutionPolicy, ResolutionRequest, ResolvableRecord } from './types.js';

const DIMENSION_SCOPE: Record<OptionalDimension, ContentScope> = {
  legalEntityId: ContentScope.LEGAL_ENTITY,
  digitalEstateId: ContentScope.DIGITAL_ESTATE,
  marketId: ContentScope.MARKET,
  locale: ContentScope.LOCALE,
};

export type SpecificityLevel = Partial<Record<OptionalDimension, string>>;

/**
 * Which optional dimensions are in play for this request: the dimension
 * must both be requested (non-undefined) and be a scope the content type's
 * policy declares support for (ADR-0014 §16, §92).
 */
function activeDimensions(request: ResolutionRequest, policy: ResolutionPolicy): OptionalDimension[] {
  return OPTIONAL_DIMENSION_PRIORITY.filter((dim) => {
    const value = request[dim];
    return value !== undefined && policy.supportedScopes.includes(DIMENSION_SCOPE[dim]);
  });
}

/**
 * Builds the deterministic, ordered list of scope levels to attempt, most
 * specific first (ADR-0014 §4, §15, §23-25). `NONE` inheritance restricts
 * this to the single fully-specific level — no fallback traversal at all.
 */
export function buildSpecificityLevels(request: ResolutionRequest, policy: ResolutionPolicy): SpecificityLevel[] {
  const dims = activeDimensions(request, policy);

  if (policy.inheritanceMode === InheritanceMode.NONE) {
    const level: SpecificityLevel = {};
    for (const dim of dims) level[dim] = request[dim];
    return [level];
  }

  const subsets: OptionalDimension[][] = [];
  const total = dims.length;
  for (let mask = (1 << total) - 1; mask >= 0; mask -= 1) {
    const subset: OptionalDimension[] = [];
    for (let i = 0; i < total; i += 1) {
      if (mask & (1 << i)) subset.push(dims[i]);
    }
    subsets.push(subset);
  }

  subsets.sort((a, b) => {
    if (a.length !== b.length) return b.length - a.length;
    // Deterministic tie-break within equal-size subsets, by priority order.
    for (let i = 0; i < a.length; i += 1) {
      const diff = OPTIONAL_DIMENSION_PRIORITY.indexOf(a[i]) - OPTIONAL_DIMENSION_PRIORITY.indexOf(b[i]);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return subsets.map((subset) => {
    const level: SpecificityLevel = {};
    for (const dim of subset) level[dim] = request[dim];
    return level;
  });
}

/** ADR-0012 §26-27 — a record whose declared scope conflicts with the request is never eligible. */
export function isEligible(record: ResolvableRecord, request: ResolutionRequest): boolean {
  if (record.tenantId !== request.tenantId) return false;
  for (const dim of OPTIONAL_DIMENSION_PRIORITY) {
    const recordValue = record[dim];
    if (recordValue !== undefined && recordValue !== request[dim]) return false;
  }
  return true;
}

/** A record matches a level when it is exactly as specific as that level — no more, no less. */
export function matchesLevel(record: ResolvableRecord, level: SpecificityLevel): boolean {
  for (const dim of OPTIONAL_DIMENSION_PRIORITY) {
    const inLevel = dim in level;
    const recordValue = record[dim];
    if (inLevel) {
      if (recordValue === undefined || recordValue !== level[dim]) return false;
    } else if (recordValue !== undefined) {
      return false;
    }
  }
  return true;
}
