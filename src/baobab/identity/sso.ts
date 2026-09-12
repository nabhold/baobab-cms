import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Gate IAM-5 phase 2b (ADR-0009 §9, `baobab-iam`'s `baobab-cms-admin` client).
 *
 * SSO is entirely optional and off by default: nothing in this module or
 * `oidc-endpoints.ts` runs unless `BAOBAB_IAM_OIDC_ISSUER` is set, matching the
 * pattern `baobab-trade`'s phase 2a already established (nothing regresses
 * when the variable is unset).
 */
export function isOidcConfigured(): boolean {
  return Boolean(process.env.BAOBAB_IAM_OIDC_ISSUER);
}

export function getOidcEnv() {
  const issuer = process.env.BAOBAB_IAM_OIDC_ISSUER;
  if (!issuer) {
    throw new Error('BAOBAB_IAM_OIDC_ISSUER is not set');
  }
  return {
    issuer,
    clientId: process.env.BAOBAB_IAM_OIDC_CLIENT_ID || 'baobab-cms-admin',
    clientSecret: process.env.BAOBAB_IAM_OIDC_CLIENT_SECRET || '',
    redirectUri: process.env.BAOBAB_IAM_OIDC_REDIRECT_URI || '',
  };
}

/**
 * `${issuer}#${sub}` is this engine's local analogue of ADR-0007's
 * `issuer+subject` uniqueness rule (the same rule ADR-0014 §9 required for
 * ERP and Gate IAM-10 found iDempiere's stock plugin deviating from — see
 * `baobab-iam`'s Gate IAM-10 scope doc). Matching workforce identities by
 * this composite key, never by email alone, is what lets an identity be
 * re-provisioned at IAM (different subject, same email) without silently
 * inheriting a stale local account, and is why `Users.ssoSubject` exists as
 * its own field rather than deriving identity from `email`.
 */
export function buildSsoSubject(issuer: string, subject: string): string {
  return `${issuer}#${subject}`;
}

export type OidcTransaction = {
  /** Raw PKCE code verifier — never placed in the `state` parameter or any
   * URL, since that would round-trip through the same redirect as the
   * authorization `code` and defeat the interception protection PKCE
   * exists to provide. Carried only in this signed, httpOnly cookie. */
  codeVerifier: string;
  nonce: string;
  state: string;
  issuedAt: number;
};

const TRANSACTION_COOKIE_VERSION = 'v1';

/**
 * Signs an OIDC login transaction (state/nonce/PKCE verifier) into an
 * opaque cookie value. HMAC-SHA256 over the JSON payload with Payload's own
 * `secret` — the same secret already trusted to sign every session JWT this
 * engine issues, so no new secret needs to be provisioned or rotated
 * separately. This is a server-set, httpOnly, short-lived cookie: signing
 * defends against a cookie value being read from a log or replayed after
 * tampering, not against a browser-side attacker (who can't read or edit an
 * httpOnly cookie's value in the first place).
 */
export function signTransaction(transaction: OidcTransaction, secret: string): string {
  const payload = Buffer.from(JSON.stringify(transaction), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${TRANSACTION_COOKIE_VERSION}.${payload}.${signature}`;
}

/**
 * Verifies and decodes a transaction cookie produced by `signTransaction`.
 * Returns `null` (never throws) on any tampering, malformed input, unknown
 * version, or expiry — every caller treats all of these identically: the
 * login attempt cannot proceed and must restart from `/api/oidc/login`.
 */
export function verifyTransaction(
  cookieValue: string | undefined,
  secret: string,
  maxAgeSeconds: number,
): OidcTransaction | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 3 || parts[0] !== TRANSACTION_COOKIE_VERSION) return null;
  const [, payload, signature] = parts;

  const expectedSignature = createHmac('sha256', secret).update(payload).digest('base64url');
  const signatureBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64url');
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  let transaction: OidcTransaction;
  try {
    transaction = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    typeof transaction?.codeVerifier !== 'string' ||
    typeof transaction?.nonce !== 'string' ||
    typeof transaction?.state !== 'string' ||
    typeof transaction?.issuedAt !== 'number'
  ) {
    return null;
  }
  if (Date.now() - transaction.issuedAt > maxAgeSeconds * 1000) return null;

  return transaction;
}

/**
 * Narrow, defensive claim extraction from an ID token. `openid-client`
 * types unknown claims as `JsonValue | undefined` (Keycloak's `realm_access`
 * and this platform's `actor_type` claim are both non-standard), so every
 * read here is guarded rather than cast.
 */
export function extractHumanClaims(claims: Record<string, unknown>): {
  subject: string;
  issuer: string;
  email: string | undefined;
  emailVerified: boolean;
  actorType: string | undefined;
} {
  return {
    subject: String(claims.sub),
    issuer: String(claims.iss),
    email: typeof claims.email === 'string' ? claims.email : undefined,
    emailVerified: claims.email_verified === true,
    actorType: typeof claims.actor_type === 'string' ? claims.actor_type : undefined,
  };
}
