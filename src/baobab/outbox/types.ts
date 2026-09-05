/** ADR-0018 §35 — outbox publication lifecycle. */
export const OutboxStatus = {
  PENDING: 'PENDING',
  PUBLISHING: 'PUBLISHING',
  PUBLISHED: 'PUBLISHED',
  FAILED_RETRYABLE: 'FAILED_RETRYABLE',
  FAILED_TERMINAL: 'FAILED_TERMINAL',
} as const;

export type OutboxStatus = (typeof OutboxStatus)[keyof typeof OutboxStatus];
