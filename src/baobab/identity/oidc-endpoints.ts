import * as client from 'openid-client';
import { addSessionToUser, generateCookie, generatePayloadCookie, parseCookies } from 'payload/shared';
import { getFieldsToSign, jwtSign } from 'payload';
import type { Endpoint, PayloadRequest } from 'payload';
import { getOidcConfig } from './oidc-client.js';
import {
  buildSsoSubject,
  extractHumanClaims,
  generateUnusablePassword,
  getOidcEnv,
  isOidcConfigured,
  signTransaction,
  verifyTransaction,
  type OidcTransaction,
} from './sso.js';

const TRANSACTION_COOKIE_NAME = 'baobab-oidc-txn';
const TRANSACTION_MAX_AGE_SECONDS = 300;
const OIDC_SCOPE = 'openid profile email roles';

function notConfigured(): Response {
  return Response.json({ error: 'SSO is not configured on this deployment' }, { status: 404 });
}

/**
 * Whether the transaction (and, by extension, the login/callback exchange
 * itself) should ride on a `Secure` cookie. Deliberately reuses the same
 * toggle the `users` collection's own session cookie already uses
 * (`Users.auth.cookies.secure`, unset -> `false`) rather than inventing a
 * second one -- an operator who has correctly set that for their real
 * deployment gets the same protection here for free, and local HTTP
 * development (where that toggle is left `false`) keeps working.
 */
function isSecureCookieDeployment(req: PayloadRequest): boolean {
  return Boolean(req.payload.collections.users?.config.auth.cookies.secure);
}

export const oidcEndpoints: Endpoint[] = [
  {
    path: '/oidc/login',
    method: 'get',
    handler: async (req: PayloadRequest) => {
      if (!isOidcConfigured()) return notConfigured();

      let config: client.Configuration;
      let redirectUri: string;
      try {
        config = await getOidcConfig();
        redirectUri = getOidcEnv().redirectUri;
        if (!redirectUri) throw new Error('BAOBAB_IAM_OIDC_REDIRECT_URI is not set');
      } catch (error) {
        req.payload.logger.error({ err: error }, 'OIDC discovery failed for /oidc/login');
        return Response.json({ error: 'SSO is temporarily unavailable' }, { status: 503 });
      }

      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
      const state = client.randomState();
      const nonce = client.randomNonce();

      const authorizationUrl = client.buildAuthorizationUrl(config, {
        redirect_uri: redirectUri,
        scope: OIDC_SCOPE,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        nonce,
      });

      const transaction: OidcTransaction = { codeVerifier, nonce, state, issuedAt: Date.now() };
      const cookie = generateCookie<false>({
        name: TRANSACTION_COOKIE_NAME,
        value: signTransaction(transaction, req.payload.secret),
        httpOnly: true,
        path: '/api/oidc',
        sameSite: 'Lax',
        secure: isSecureCookieDeployment(req),
        maxAge: TRANSACTION_MAX_AGE_SECONDS,
        returnCookieAsObject: false,
      });

      return new Response(null, {
        status: 302,
        headers: { Location: authorizationUrl.href, 'Set-Cookie': cookie },
      });
    },
  },
  {
    path: '/oidc/callback',
    method: 'get',
    handler: async (req: PayloadRequest) => {
      if (!isOidcConfigured()) return notConfigured();

      const cookies = parseCookies(req.headers);
      const transaction = verifyTransaction(
        cookies.get(TRANSACTION_COOKIE_NAME),
        req.payload.secret,
        TRANSACTION_MAX_AGE_SECONDS,
      );
      if (!transaction) {
        return Response.json({ error: 'Missing or expired login attempt. Please try again.' }, { status: 400 });
      }

      let config: client.Configuration;
      try {
        config = await getOidcConfig();
      } catch (error) {
        req.payload.logger.error({ err: error }, 'OIDC discovery failed for /oidc/callback');
        return Response.json({ error: 'SSO is temporarily unavailable' }, { status: 503 });
      }

      let tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers;
      try {
        // authorizationCodeGrant validates `state`, exchanges the code at
        // Keycloak's token endpoint (with PKCE), and verifies the ID
        // token's signature (via the discovered JWKS), issuer, audience,
        // expiry and `nonce` -- every check ADR-0009's phase 2b deferral
        // named as the reason this needed dedicated attention rather than
        // being rushed alongside phase 1/2a.
        tokens = await client.authorizationCodeGrant(config, new URL(req.href), {
          pkceCodeVerifier: transaction.codeVerifier,
          expectedState: transaction.state,
          expectedNonce: transaction.nonce,
        });
      } catch (error) {
        req.payload.logger.warn({ err: error }, 'OIDC authorization code grant failed');
        return Response.json({ error: 'Login failed. Please try again.' }, { status: 401 });
      }

      const claims = tokens.claims();
      if (!claims) {
        return Response.json({ error: 'Login failed: no identity was returned.' }, { status: 401 });
      }
      const { subject, issuer, email, emailVerified, actorType } = extractHumanClaims(claims);

      // Defense in depth: this client only ever requests human-actor
      // scopes, so Keycloak should never issue anything else here -- but a
      // token profile invariant (ADR-0006) is worth enforcing at the
      // consumer too, not just trusted from the issuer.
      if (actorType !== 'human') {
        return Response.json({ error: 'This login is not a workforce identity.' }, { status: 401 });
      }

      const ssoSubject = buildSsoSubject(issuer, subject);
      const payload = req.payload;

      // Payload's generated `User` type has no index signature, so casting
      // it directly to `Record<string, unknown>` is rejected by strict mode
      // as an insufficient overlap -- go through `unknown` first, same as
      // the pattern already established elsewhere in this repo
      // (scripts/onboarding/zuribeans.ts).
      type MinimalUser = Record<string, unknown> & { id: string | number };
      let user: MinimalUser;
      const bySubject = await payload.find({
        collection: 'users',
        where: { ssoSubject: { equals: ssoSubject } },
        limit: 1,
        overrideAccess: true,
        req,
      });

      if (bySubject.docs.length > 0) {
        user = bySubject.docs[0] as unknown as MinimalUser;
      } else if (email && emailVerified) {
        const byEmail = await payload.find({
          collection: 'users',
          where: { email: { equals: email } },
          limit: 1,
          overrideAccess: true,
          req,
        });
        if (byEmail.docs.length > 0) {
          const existing = byEmail.docs[0] as unknown as MinimalUser & { ssoSubject?: string | null };
          if (existing.ssoSubject && existing.ssoSubject !== ssoSubject) {
            // Two different OIDC subjects resolving to the same local
            // email is an anomaly, not a routine re-link -- fail safe
            // rather than silently reassigning an existing account's SSO
            // identity.
            req.payload.logger.error(
              { email, existingSubject: existing.ssoSubject, newSubject: ssoSubject },
              'OIDC login matched an existing user by email but a different ssoSubject is already linked',
            );
            return Response.json({ error: 'Login failed. Contact an administrator.' }, { status: 409 });
          }
          user = (await payload.update({
            collection: 'users',
            id: existing.id,
            data: { ssoSubject },
            overrideAccess: true,
            req,
          })) as unknown as MinimalUser;
        } else {
          // No existing account at all: provision one with zero
          // privileges (no editorialRoles/capabilities/platformAdministrator)
          // -- matching Gate IAM-5 phase 1's "no privileged JIT
          // provisioning" principle on the IAM side (ADR-0009 §13, §87-88)
          // with the same rule enforced here on the CMS side. An existing
          // platform administrator must explicitly grant privileges
          // afterwards.
          user = (await payload.create({
            collection: 'users',
            // password: local auth stays enabled for every account, and
            // Payload requires a password on every create against an
            // auth-enabled collection -- this one is generated, never
            // disclosed, and never intended to authenticate anyone; this
            // account's only entry point is SSO.
            data: { email, ssoSubject, serviceIdentity: false, password: generateUnusablePassword() },
            overrideAccess: true,
            req,
          })) as unknown as MinimalUser;
        }
      } else {
        // No existing ssoSubject match, and no verified email to safely
        // link or provision from. Reject rather than guess.
        return Response.json(
          { error: 'This identity has no verified email and is not yet linked to a CMS account.' },
          { status: 401 },
        );
      }

      const collection = payload.collections.users;
      const session = await addSessionToUser({ collectionConfig: collection.config, payload, req, user: user as never });
      const fieldsToSign = getFieldsToSign({
        collectionConfig: collection.config,
        email: typeof user.email === 'string' ? user.email : '',
        sid: session.sid,
        user: user as never,
      });
      const { token } = await jwtSign({
        fieldsToSign,
        secret: payload.secret,
        tokenExpiration: collection.config.auth.tokenExpiration,
      });
      const sessionCookie = generatePayloadCookie({
        collectionAuthConfig: collection.config.auth,
        cookiePrefix: payload.config.cookiePrefix,
        token,
      });

      // Clear the (now-consumed) transaction cookie and set the real
      // session cookie in the same response.
      const clearTransactionCookie = generateCookie<false>({
        name: TRANSACTION_COOKIE_NAME,
        value: '',
        httpOnly: true,
        path: '/api/oidc',
        sameSite: 'Lax',
        secure: isSecureCookieDeployment(req),
        maxAge: 0,
        returnCookieAsObject: false,
      });
      const headers = new Headers();
      headers.append('Set-Cookie', sessionCookie);
      headers.append('Set-Cookie', clearTransactionCookie);
      headers.set('Location', '/admin');
      return new Response(null, { status: 302, headers });
    },
  },
];
