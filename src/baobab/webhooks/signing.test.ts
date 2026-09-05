import { describe, expect, it } from 'vitest';
import { signWebhookPayload, verifyWebhookSignature } from './signing.js';

describe('webhook signing — ADR-0018 §54', () => {
  it('produces a verifiable signature', () => {
    const signature = signWebhookPayload('secret', '{"a":1}');
    expect(verifyWebhookSignature('secret', '{"a":1}', signature)).toBe(true);
  });

  it('rejects a signature produced with the wrong secret', () => {
    const signature = signWebhookPayload('secret-a', '{"a":1}');
    expect(verifyWebhookSignature('secret-b', '{"a":1}', signature)).toBe(false);
  });

  it('rejects a tampered body', () => {
    const signature = signWebhookPayload('secret', '{"a":1}');
    expect(verifyWebhookSignature('secret', '{"a":2}', signature)).toBe(false);
  });
});
