import type { CanonicalEventEnvelope } from './types.js';

/**
 * Transport-neutral publication boundary (ADR-0018 §105-106). Only the
 * outbox dispatcher worker calls this — collection hooks never publish
 * directly (ADR-0018 §61-63, "no synchronous fan-out").
 */
export interface EventPublisher {
  publish(envelope: CanonicalEventEnvelope): Promise<void>;
}

/**
 * Test/local-development publisher that records envelopes in memory
 * instead of requiring a running broker.
 */
export class InMemoryEventPublisher implements EventPublisher {
  readonly published: CanonicalEventEnvelope[] = [];

  async publish(envelope: CanonicalEventEnvelope): Promise<void> {
    this.published.push(envelope);
  }
}
