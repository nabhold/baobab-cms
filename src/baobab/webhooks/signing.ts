import { createHmac, timingSafeEqual } from 'node:crypto';

/** ADR-0018 §54, §57 — outbound webhooks are signed; idempotency is the consumer's job. */
export function signWebhookPayload(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyWebhookSignature(secret: string, body: string, signature: string): boolean {
  const expected = signWebhookPayload(secret, body);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(signature, 'hex');
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
