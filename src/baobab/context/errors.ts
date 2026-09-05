/**
 * Context resolution failure modes (ADR-0012 §73-77).
 *
 * Every failure mode here is a *fail-closed* outcome: the caller MUST treat a
 * thrown `ContextResolutionError` as "deny", never as "fall back to a
 * default tenant/scope".
 */
export type ContextErrorCode =
  | 'MISSING_CONTEXT'
  | 'INVALID_TENANT'
  | 'CONTEXT_CONFLICT'
  | 'ISOLATION_POLICY_UNAVAILABLE'
  | 'UNAUTHORIZED_CONTEXT_SWITCH';

export class ContextResolutionError extends Error {
  readonly code: ContextErrorCode;

  constructor(code: ContextErrorCode, message: string) {
    super(message);
    this.name = 'ContextResolutionError';
    this.code = code;
  }
}

export function missingContext(reason: string): ContextResolutionError {
  return new ContextResolutionError('MISSING_CONTEXT', `Baobab context could not be resolved: ${reason}`);
}

export function invalidTenant(reason: string): ContextResolutionError {
  return new ContextResolutionError('INVALID_TENANT', `Tenant context is invalid: ${reason}`);
}

export function contextConflict(reason: string): ContextResolutionError {
  return new ContextResolutionError('CONTEXT_CONFLICT', `Baobab context is internally inconsistent: ${reason}`);
}

export function unauthorizedContextSwitch(reason: string): ContextResolutionError {
  return new ContextResolutionError('UNAUTHORIZED_CONTEXT_SWITCH', `Context switch was not authorized: ${reason}`);
}
