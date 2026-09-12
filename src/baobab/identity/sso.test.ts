import { describe, expect, it } from 'vitest';
import {
  buildSsoSubject,
  extractHumanClaims,
  isOidcConfigured,
  signTransaction,
  verifyTransaction,
  type OidcTransaction,
} from './sso.js';

const SECRET = 'test-secret-do-not-use-in-prod';

function makeTransaction(overrides: Partial<OidcTransaction> = {}): OidcTransaction {
  return {
    codeVerifier: 'verifier-value',
    nonce: 'nonce-value',
    state: 'state-value',
    issuedAt: Date.now(),
    ...overrides,
  };
}

describe('isOidcConfigured', () => {
  it('is false when BAOBAB_IAM_OIDC_ISSUER is unset', () => {
    delete process.env.BAOBAB_IAM_OIDC_ISSUER;
    expect(isOidcConfigured()).toBe(false);
  });

  it('is true when BAOBAB_IAM_OIDC_ISSUER is set', () => {
    process.env.BAOBAB_IAM_OIDC_ISSUER = 'https://iam.example.com/realms/baobab';
    expect(isOidcConfigured()).toBe(true);
    delete process.env.BAOBAB_IAM_OIDC_ISSUER;
  });
});

describe('buildSsoSubject', () => {
  it('combines issuer and subject with a separator that cannot collide across issuers', () => {
    expect(buildSsoSubject('https://iam.example.com/realms/baobab', 'abc-123')).toBe(
      'https://iam.example.com/realms/baobab#abc-123',
    );
  });

  it('produces distinct keys for the same subject under different issuers', () => {
    const a = buildSsoSubject('https://iam-a.example.com/realms/baobab', 'same-subject');
    const b = buildSsoSubject('https://iam-b.example.com/realms/baobab', 'same-subject');
    expect(a).not.toBe(b);
  });
});

describe('signTransaction / verifyTransaction', () => {
  it('round-trips a signed transaction', () => {
    const transaction = makeTransaction();
    const cookie = signTransaction(transaction, SECRET);
    expect(verifyTransaction(cookie, SECRET, 300)).toEqual(transaction);
  });

  it('rejects a tampered payload', () => {
    const cookie = signTransaction(makeTransaction(), SECRET);
    const [version, , signature] = cookie.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify(makeTransaction({ codeVerifier: 'attacker-supplied-verifier' })),
      'utf8',
    ).toString('base64url');
    const tampered = `${version}.${tamperedPayload}.${signature}`;
    expect(verifyTransaction(tampered, SECRET, 300)).toBeNull();
  });

  it('rejects a cookie signed with a different secret', () => {
    const cookie = signTransaction(makeTransaction(), SECRET);
    expect(verifyTransaction(cookie, 'a-different-secret', 300)).toBeNull();
  });

  it('rejects an expired transaction', () => {
    const cookie = signTransaction(makeTransaction({ issuedAt: Date.now() - 10 * 60 * 1000 }), SECRET);
    expect(verifyTransaction(cookie, SECRET, 300)).toBeNull();
  });

  it('rejects malformed input without throwing', () => {
    expect(verifyTransaction(undefined, SECRET, 300)).toBeNull();
    expect(verifyTransaction('', SECRET, 300)).toBeNull();
    expect(verifyTransaction('not-a-valid-cookie', SECRET, 300)).toBeNull();
    expect(verifyTransaction('v1.not-base64url-json.deadbeef', SECRET, 300)).toBeNull();
  });

  it('rejects an unknown cookie version', () => {
    const cookie = signTransaction(makeTransaction(), SECRET);
    const [, payload, signature] = cookie.split('.');
    expect(verifyTransaction(`v2.${payload}.${signature}`, SECRET, 300)).toBeNull();
  });
});

describe('extractHumanClaims', () => {
  it('extracts and narrows every claim used downstream', () => {
    const claims = {
      sub: 'user-123',
      iss: 'https://iam.example.com/realms/baobab',
      email: 'ada@example.com',
      email_verified: true,
      actor_type: 'human',
    };
    expect(extractHumanClaims(claims)).toEqual({
      subject: 'user-123',
      issuer: 'https://iam.example.com/realms/baobab',
      email: 'ada@example.com',
      emailVerified: true,
      actorType: 'human',
    });
  });

  it('defaults email/emailVerified/actorType safely when absent or the wrong type', () => {
    const claims = { sub: 'user-123', iss: 'https://iam.example.com/realms/baobab', email: 42 };
    expect(extractHumanClaims(claims)).toEqual({
      subject: 'user-123',
      issuer: 'https://iam.example.com/realms/baobab',
      email: undefined,
      emailVerified: false,
      actorType: undefined,
    });
  });
});
