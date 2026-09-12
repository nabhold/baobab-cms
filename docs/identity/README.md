# Identity, Authentication & Federated Actors

Implements ADR-0017. See `docs/architecture/overview.md` §3 for context
resolution and §9 for authorization.

## Payload users are a projection, not the authority

`src/collections/Users.ts` is a Content-Engine-local representation.
`canonicalActorId` (server-assigned, immutable) is what canonical events
and cross-engine references use — never the Payload `id` (ADR-0017 §5-6).

Workforce SSO against `baobab-iam`'s Keycloak realm (`baobab-cms-admin`
client) is now wired — Gate IAM-5 phase 2b, ADR-0009 §9. It is entirely
optional and off by default: leaving `BAOBAB_IAM_OIDC_ISSUER` unset (see
`.env.example`) makes `/api/oidc/login` and `/api/oidc/callback` both
404, and Payload local auth (email/password, plus `useAPIKey: true` for
service identities) keeps working exactly as before — this remains a
supported path, not merely a fallback, since not every environment runs
`baobab-iam`.

Payload ships no official or community OIDC plugin (checked directly
against the npm registry — nothing matching `payload`+`oidc`/`sso`/
`keycloak` exists), so this is a small amount of purpose-built code
(`src/baobab/identity/sso.ts`, `oidc-client.ts`, `oidc-endpoints.ts`)
built directly on `openid-client` (the same underlying library
`baobab-trade`'s own OIDC wiring uses) rather than a Payload
`auth.strategies` implementation: the OIDC exchange only ever runs once,
at login, to identify who the human is and mint a normal Payload session
(`addSessionToUser`/`getFieldsToSign`/`jwtSign`/`generatePayloadCookie`
— the exact same primitives Payload's own local-auth login handler
uses); every subsequent request is authenticated by Payload's existing,
already-audited JWT strategy, unmodified. This is also why wiring SSO
never required changing `src/baobab/context` or
`src/baobab/authorization` — both already consume `req.user` through the
`ContextActor` structural interface rather than Payload's concrete auth
implementation, and an SSO-provisioned user is a completely ordinary
`users` document from their point of view.

Identity matching uses `Users.ssoSubject` (`"{issuer}#{sub}"`), never
email alone — the same `issuer+subject` uniqueness rule ADR-0007
requires elsewhere on this platform, and the rule Gate IAM-10 found
iDempiere's own OIDC plugin deviating from. Email-based account linking
only happens when Keycloak's `email_verified` claim is `true`; a
brand-new SSO login with no matching `ssoSubject` and no verified email
is rejected outright rather than guessed at. A freshly auto-provisioned
account is intentionally created with zero `editorialRoles`/
`capabilities`/`platformAdministrator` — mirroring Gate IAM-5 phase 1's
"no privileged JIT provisioning" rule on the IAM side (ADR-0009 §13,
§87-88) with the same rule enforced here; an existing platform
administrator must grant privileges explicitly afterward.

**Deliberately not built in this phase:** a login-page UI link to
`/api/oidc/login` (Payload's `admin.components.beforeLogin` needs an
import-map rebuild this environment has no live instance to verify
against — an operator can navigate to the URL directly today); a
front-channel/back-channel logout integration with Keycloak (a local
Payload logout does not currently also end the Keycloak session).

`Users.ssoSubject`'s migration (`migrations/20260912_172242.ts`) was generated
and applied against a real local Postgres instance, not hand-written — it adds
a `sso_subject varchar` column and a `users_sso_subject_idx` unique btree
index, matching the existing `canonical_actor_id`/`users_canonical_actor_id_idx`
pair. The provisioning path itself (create/find/update by `ssoSubject`,
including the unique-index rejection of a duplicate subject) was also
exercised end to end against that same database via the Local API, not just
type-checked.

## Roles vs. capabilities vs. platform administration

- `Users.editorialRoles` (`Viewer`/`Author`/`Editor`/`Reviewer`/
  `Publisher`/`Content Administrator`) feed
  `src/baobab/authorization`'s `isAuthorized()` — see
  `docs/authorization/README.md`.
- `Users.capabilities` is a free-form list of capability strings
  (`content.management`, `content.publish`, …) consumed by
  `tenantScopedAccess({ requiredCapability })` — this is the
  "may this context use this Content Engine function at all" gate
  (ADR-0011 §35, ADR-0017 §36-37), distinct from role/permission.
- `Users.platformAdministrator` is the one flag that bypasses both —
  reserved for genuinely privileged operators (ADR-0017 §47), never
  self-assignable (its own field-level `access.update` requires an
  existing platform administrator).

## Service identities

`Users.serviceIdentity` marks an account as a machine/automation identity
rather than a human editor (ADR-0017 §50). Combined with `useAPIKey:
true`, service integrations should authenticate with an API key bound to
a dedicated service user rather than sharing a human editor's credentials
(ADR-0017 §49, "shared human administrative accounts are prohibited").

## Bootstrapping

The very first user/tenant in a fresh environment has no authenticated
actor to derive context from. Trusted system code (seed scripts,
migrations) uses `SYSTEM_ACTOR`
(`src/baobab/context/system-actor.ts`) — pass
`user: SYSTEM_ACTOR, overrideAccess: true` to Local API calls. This was
exercised end-to-end in this session's verification pass (see the
implementation report) to create the first tenant, organisation, and
platform-administrator user.
