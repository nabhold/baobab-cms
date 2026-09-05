import { randomUUID } from 'node:crypto';
import { SOURCE_ENGINE, type CanonicalEventEnvelope, type CanonicalEventType } from './types.js';

export interface BuildEnvelopeInput<TPayload> {
  eventType: CanonicalEventType | string;
  eventVersion?: number;
  canonicalEntityId: string;
  canonicalEntityType: string;
  tenantId: string;
  legalEntityId?: string;
  digitalEstateId?: string;
  marketId?: string;
  locale?: string;
  correlationId: string;
  causationId?: string;
  traceId?: string;
  sourceEngineInstance?: string;
  externalReference?: CanonicalEventEnvelope['externalReference'];
  payload: TPayload;
}

/**
 * Builds a canonical event envelope (ADR-0018 §11-24). Callers never
 * construct the envelope object literal themselves — this keeps the
 * contract centrally enforced (event id uniqueness, past-tense semantics
 * left to the caller's `eventType`, minimal payload discipline left to the
 * caller's `payload`).
 */
export function buildCanonicalEvent<TPayload>(input: BuildEnvelopeInput<TPayload>): CanonicalEventEnvelope<TPayload> {
  return {
    eventId: randomUUID(),
    eventType: input.eventType,
    eventVersion: input.eventVersion ?? 1,
    occurredAt: new Date().toISOString(),
    sourceEngine: SOURCE_ENGINE,
    sourceEngineInstance: input.sourceEngineInstance,
    canonicalEntityId: input.canonicalEntityId,
    canonicalEntityType: input.canonicalEntityType,
    tenantId: input.tenantId,
    legalEntityId: input.legalEntityId,
    digitalEstateId: input.digitalEstateId,
    marketId: input.marketId,
    locale: input.locale,
    correlationId: input.correlationId,
    causationId: input.causationId,
    traceId: input.traceId,
    externalReference: input.externalReference,
    payload: input.payload,
  };
}
