import * as client from 'openid-client';
import { getOidcEnv } from './sso.js';

/**
 * Discovery (`GET {issuer}/.well-known/openid-configuration` + fetching the
 * JWKS) is a network round trip this module memoizes as a single
 * in-process promise, rather than repeating it on every `/api/oidc/login`
 * or `/api/oidc/callback` request. `openid-client`'s `Configuration` also
 * caches the JWKS it fetches internally, so this doubles as the JWKS cache
 * used to verify every ID token's signature.
 */
let configPromise: Promise<client.Configuration> | undefined;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (!configPromise) {
    const { issuer, clientId, clientSecret } = getOidcEnv();
    configPromise = client.discovery(new URL(issuer), clientId, clientSecret).catch((error) => {
      // A failed discovery must not be cached -- the next request should
      // retry (e.g. Keycloak was briefly unreachable at boot), not repeat
      // the same rejected promise forever.
      configPromise = undefined;
      throw error;
    });
  }
  return configPromise;
}

/** Test-only: forces the next `getOidcConfig()` call to re-run discovery. */
export function resetOidcConfigCache(): void {
  configPromise = undefined;
}
