import { describe, expect, it } from 'vitest';
import { assertSafeWebhookUrl, WebhookEndpointRejectedError } from './delivery.js';

describe('assertSafeWebhookUrl — SSRF guard (ADR-0018 §59)', () => {
  it('accepts a normal https endpoint', () => {
    expect(() => assertSafeWebhookUrl('https://example.com/webhook')).not.toThrow();
  });

  it('rejects non-https schemes', () => {
    expect(() => assertSafeWebhookUrl('http://example.com/webhook')).toThrow(WebhookEndpointRejectedError);
  });

  it('rejects localhost and loopback addresses', () => {
    expect(() => assertSafeWebhookUrl('https://localhost/webhook')).toThrow(WebhookEndpointRejectedError);
    expect(() => assertSafeWebhookUrl('https://127.0.0.1/webhook')).toThrow(WebhookEndpointRejectedError);
  });

  it('rejects the cloud metadata endpoint', () => {
    expect(() => assertSafeWebhookUrl('https://169.254.169.254/latest/meta-data')).toThrow(WebhookEndpointRejectedError);
  });

  it('rejects private network ranges', () => {
    expect(() => assertSafeWebhookUrl('https://10.0.0.5/webhook')).toThrow(WebhookEndpointRejectedError);
    expect(() => assertSafeWebhookUrl('https://192.168.1.5/webhook')).toThrow(WebhookEndpointRejectedError);
    expect(() => assertSafeWebhookUrl('https://172.16.0.5/webhook')).toThrow(WebhookEndpointRejectedError);
  });

  it('rejects an invalid URL outright', () => {
    expect(() => assertSafeWebhookUrl('not-a-url')).toThrow(WebhookEndpointRejectedError);
  });
});
