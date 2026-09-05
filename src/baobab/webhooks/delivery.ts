import { signWebhookPayload } from './signing.js';

export class WebhookEndpointRejectedError extends Error {
  constructor(reason: string) {
    super(`Webhook endpoint rejected: ${reason}`);
    this.name = 'WebhookEndpointRejectedError';
  }
}

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '169.254.169.254']);

/**
 * Minimal SSRF guard (ADR-0018 §59). Rejects obviously internal/link-local
 * targets before a webhook is ever dispatched. This is defence in depth,
 * not a substitute for network-level egress policy.
 */
export function assertSafeWebhookUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new WebhookEndpointRejectedError(`"${rawUrl}" is not a valid URL`);
  }

  if (url.protocol !== 'https:') {
    throw new WebhookEndpointRejectedError('only https:// endpoints are permitted');
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new WebhookEndpointRejectedError(`"${hostname}" is not a permitted webhook destination`);
  }
  if (hostname.endsWith('.internal') || hostname.endsWith('.local')) {
    throw new WebhookEndpointRejectedError(`"${hostname}" resolves to an internal-looking domain`);
  }
  if (/^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname)) {
    throw new WebhookEndpointRejectedError(`"${hostname}" is a private/link-local address`);
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    throw new WebhookEndpointRejectedError(`"${hostname}" is a private address`);
  }

  return url;
}

export interface DeliverWebhookParams {
  url: string;
  secret: string;
  body: unknown;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface WebhookDeliveryResult {
  delivered: boolean;
  status?: number;
  error?: string;
}

/**
 * Delivers one webhook with a bounded timeout so a slow endpoint never
 * blocks the editorial transaction (ADR-0018 §58, §63, CT-010). This is
 * called only from the async outbox path, never from a synchronous hook.
 */
export async function deliverWebhook(params: DeliverWebhookParams): Promise<WebhookDeliveryResult> {
  const { url, secret, body, timeoutMs = 5000, fetchImpl = fetch } = params;
  const safeUrl = assertSafeWebhookUrl(url);

  const payloadBody = JSON.stringify(body);
  const signature = signWebhookPayload(secret, payloadBody);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(safeUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-baobab-signature': signature,
      },
      body: payloadBody,
      signal: controller.signal,
    });
    return { delivered: response.ok, status: response.status };
  } catch (error) {
    return { delivered: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}
