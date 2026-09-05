import type { Payload } from 'payload';
import type { EventPublisher } from '../events/publisher.js';
import type { CanonicalEventEnvelope } from '../events/types.js';
import { computeBackoffMs, decideFailureOutcome, DEFAULT_RETRY_POLICY, type RetryPolicy } from './retry.js';
import { OutboxStatus } from './types.js';

export interface RunOutboxDispatchCycleParams {
  payload: Payload;
  publisher: EventPublisher;
  batchSize?: number;
  retryPolicy?: RetryPolicy;
  now?: Date;
}

export interface OutboxDispatchCycleResult {
  processed: number;
  published: number;
  retried: number;
  deadLettered: number;
}

interface OutboxDoc {
  id: string;
  envelope: CanonicalEventEnvelope;
  attemptCount?: number;
}

/**
 * Drains due outbox entries and publishes them (ADR-0018 §34-37, §102).
 * Safe to call repeatedly / after a crash: PUBLISHING is set immediately
 * before the network call so a crashed worker's entries are visible for
 * operator inspection, and duplicate delivery on retry is an accepted,
 * documented outcome — consumers are required to be idempotent
 * (ADR-0018 §38-41, §103).
 */
export async function runOutboxDispatchCycle(params: RunOutboxDispatchCycleParams): Promise<OutboxDispatchCycleResult> {
  const { payload, publisher, batchSize = 25, retryPolicy = DEFAULT_RETRY_POLICY } = params;
  const now = params.now ?? new Date();

  const due = await payload.find({
    collection: 'outbox',
    where: {
      or: [
        { status: { equals: OutboxStatus.PENDING } },
        {
          and: [
            { status: { equals: OutboxStatus.FAILED_RETRYABLE } },
            { nextAttemptAt: { less_than_equal: now.toISOString() } },
          ],
        },
      ],
    },
    limit: batchSize,
    sort: 'createdAt',
    depth: 0,
  });

  const result: OutboxDispatchCycleResult = { processed: 0, published: 0, retried: 0, deadLettered: 0 };

  for (const doc of due.docs as unknown as OutboxDoc[]) {
    result.processed += 1;

    await payload.update({ collection: 'outbox', id: doc.id, data: { status: OutboxStatus.PUBLISHING } });

    try {
      await publisher.publish(doc.envelope);
      await payload.update({
        collection: 'outbox',
        id: doc.id,
        data: { status: OutboxStatus.PUBLISHED, publishedAt: new Date().toISOString() },
      });
      result.published += 1;
    } catch (error) {
      const attemptCount = (doc.attemptCount ?? 0) + 1;
      const outcome = decideFailureOutcome(attemptCount, retryPolicy);
      const nextAttemptAt =
        outcome === 'FAILED_RETRYABLE'
          ? new Date(now.getTime() + computeBackoffMs(attemptCount, retryPolicy)).toISOString()
          : undefined;

      await payload.update({
        collection: 'outbox',
        id: doc.id,
        data: {
          status: outcome,
          attemptCount,
          nextAttemptAt,
          lastError: error instanceof Error ? error.message : String(error),
        },
      });

      if (outcome === 'FAILED_TERMINAL') result.deadLettered += 1;
      else result.retried += 1;
    }
  }

  return result;
}
