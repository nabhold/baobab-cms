import type { OutboxStatus } from './types.js';

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/** ADR-0018 §36-37 — bounded exponential backoff with jitter. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 8,
  baseDelayMs: 2000,
  maxDelayMs: 5 * 60 * 1000,
};

export function computeBackoffMs(
  attemptCount: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  randomFn: () => number = Math.random,
): number {
  const exponential = policy.baseDelayMs * 2 ** Math.max(0, attemptCount - 1);
  const bounded = Math.min(policy.maxDelayMs, exponential);
  const jitter = bounded * 0.2 * randomFn();
  return Math.min(policy.maxDelayMs, Math.round(bounded + jitter));
}

/** ADR-0018 §50-51 — persistent failure becomes a visible, non-retried terminal state. */
export function decideFailureOutcome(
  attemptCount: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): Extract<OutboxStatus, 'FAILED_RETRYABLE' | 'FAILED_TERMINAL'> {
  return attemptCount >= policy.maxAttempts ? 'FAILED_TERMINAL' : 'FAILED_RETRYABLE';
}
