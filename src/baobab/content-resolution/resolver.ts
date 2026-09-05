import { isEligible, matchesLevel, buildSpecificityLevels } from './specificity.js';
import { isPublicationEligible, isTemporallyEligible } from './eligibility.js';
import { resolveLocaleChain } from './fallback.js';
import { AmbiguousResolutionError, InheritanceMode } from './types.js';
import type { ResolutionPolicy, ResolutionRequest, ResolutionResult, ResolutionTraceStep, ResolvableRecord } from './types.js';

function baseEligible<T extends ResolvableRecord>(candidates: T[], request: ResolutionRequest): T[] {
  const at = request.effectiveTime ?? new Date().toISOString();
  return candidates
    .filter((r) => r.contentKey === request.contentKey)
    .filter((r) => isPublicationEligible(r, request.previewMode))
    .filter((r) => isTemporallyEligible(r, at));
}

/**
 * Deterministic content resolution (ADR-0014 §3-4, §23-25). Selects the
 * single most specific eligible record for `NONE` / `INHERIT` / `OVERRIDE`
 * policies. `COMPOSE` policies must use `resolveComposedContent` instead —
 * a single "winning" record is not a meaningful answer for composition.
 */
export function resolveContent<T extends ResolvableRecord>(
  request: ResolutionRequest,
  candidates: T[],
  policy: ResolutionPolicy,
): ResolutionResult<T> {
  if (policy.inheritanceMode === InheritanceMode.COMPOSE) {
    throw new Error('resolveContent does not support COMPOSE policies; use resolveComposedContent.');
  }

  const eligible = baseEligible(candidates, request);
  const localesToTry = request.locale ? resolveLocaleChain(request.locale, policy) : [undefined];
  const trace: ResolutionTraceStep[] = [];

  for (const locale of localesToTry) {
    const effectiveRequest: ResolutionRequest = { ...request, locale };
    const levels = buildSpecificityLevels(effectiveRequest, policy);

    for (const level of levels) {
      const matches = eligible.filter((r) => isEligible(r, effectiveRequest) && matchesLevel(r, level));
      trace.push({ level, localeAttempted: locale, matchCount: matches.length });

      if (matches.length > 1) {
        throw new AmbiguousResolutionError(request.contentKey, level);
      }

      if (matches.length === 1) {
        const matchedScope = locale === request.locale && level === levels[0] ? 'EXACT' : 'FALLBACK';
        return { record: matches[0], records: matches, matchedScope, trace };
      }
    }
  }

  return { record: null, records: [], matchedScope: 'NONE', trace };
}

/**
 * Composition resolution (ADR-0014 §21, §68-70). Returns every eligible
 * record ordered from least to most specific so callers can apply a
 * content-type-specific merge (e.g. navigation concatenation with explicit
 * suppression) — composition semantics are deliberately not generalised
 * here, since ADR-0014 §68 states they are content-type specific.
 */
export function resolveComposedContent<T extends ResolvableRecord>(
  request: ResolutionRequest,
  candidates: T[],
  policy: ResolutionPolicy,
): { records: T[]; trace: ResolutionTraceStep[] } {
  if (policy.inheritanceMode !== InheritanceMode.COMPOSE) {
    throw new Error('resolveComposedContent requires a COMPOSE policy.');
  }

  const eligible = baseEligible(candidates, request);
  const levels = buildSpecificityLevels(request, policy);
  const trace: ResolutionTraceStep[] = [];
  const collected: T[] = [];

  for (const level of [...levels].reverse()) {
    const matches = eligible.filter((r) => isEligible(r, request) && matchesLevel(r, level));
    trace.push({ level, matchCount: matches.length });
    if (matches.length > 1) {
      throw new AmbiguousResolutionError(request.contentKey, level);
    }
    if (matches.length === 1) collected.push(matches[0]);
  }

  return { records: collected, trace };
}
