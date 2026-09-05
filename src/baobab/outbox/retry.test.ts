import { describe, expect, it } from 'vitest';
import { computeBackoffMs, decideFailureOutcome, DEFAULT_RETRY_POLICY } from './retry.js';

describe('computeBackoffMs — ADR-0018 §36', () => {
  it('grows exponentially and stays within the configured bounds', () => {
    const noJitter = () => 0;
    const first = computeBackoffMs(1, DEFAULT_RETRY_POLICY, noJitter);
    const second = computeBackoffMs(2, DEFAULT_RETRY_POLICY, noJitter);
    expect(second).toBeGreaterThan(first);
    expect(first).toBe(DEFAULT_RETRY_POLICY.baseDelayMs);
  });

  it('never exceeds maxDelayMs even with jitter and many attempts', () => {
    const maxJitter = () => 1;
    const delay = computeBackoffMs(50, DEFAULT_RETRY_POLICY, maxJitter);
    expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_POLICY.maxDelayMs);
  });
});

describe('decideFailureOutcome — ADR-0018 §50-51', () => {
  it('stays retryable below the attempt ceiling', () => {
    expect(decideFailureOutcome(1)).toBe('FAILED_RETRYABLE');
    expect(decideFailureOutcome(DEFAULT_RETRY_POLICY.maxAttempts - 1)).toBe('FAILED_RETRYABLE');
  });

  it('becomes terminal (dead-letter) once the ceiling is reached — never disappears silently', () => {
    expect(decideFailureOutcome(DEFAULT_RETRY_POLICY.maxAttempts)).toBe('FAILED_TERMINAL');
    expect(decideFailureOutcome(DEFAULT_RETRY_POLICY.maxAttempts + 5)).toBe('FAILED_TERMINAL');
  });
});
