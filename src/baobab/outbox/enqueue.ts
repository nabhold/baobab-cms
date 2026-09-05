import type { PayloadRequest } from 'payload';
import type { CanonicalEventEnvelope } from '../events/types.js';
import { OutboxStatus } from './types.js';

/**
 * Writes a pending outbox record from inside a Payload hook, passing `req`
 * through so the insert joins the same database transaction as the
 * triggering content mutation (ADR-0018 §30-32, §85 CT-001/CT-002).
 *
 * This function never calls the network. It only ever writes local,
 * durable intent to publish — the outbox dispatcher (`outbox/dispatcher.ts`)
 * is the only thing that talks to the event transport.
 */
export async function enqueueOutboxEvent(params: {
  req: PayloadRequest;
  envelope: CanonicalEventEnvelope;
}): Promise<void> {
  const { req, envelope } = params;
  await req.payload.create({
    collection: 'outbox',
    data: {
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      tenant: envelope.tenantId,
      canonicalEntityId: envelope.canonicalEntityId,
      // The `envelope` json field accepts any JSON-serializable value; the
      // envelope's own TS interface is deliberately nominal (no index
      // signature) so it stays hard to construct informally elsewhere.
      envelope: envelope as unknown as Record<string, unknown>,
      status: OutboxStatus.PENDING,
      attemptCount: 0,
    },
    req,
  });
}
