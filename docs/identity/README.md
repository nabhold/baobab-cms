# Identity, Authentication & Federated Actors

Implements ADR-0017. See `docs/architecture/overview.md` §3 for context
resolution and §9 for authorization.

## Payload users are a projection, not the authority

`src/collections/Users.ts` is a Content-Engine-local representation.
`canonicalActorId` (server-assigned, immutable) is what canonical events
and cross-engine references use — never the Payload `id` (ADR-0017 §5-6).

There is no enterprise identity provider integrated in this environment
(none exists in this organisation yet), so Payload local auth
(email/password, plus `useAPIKey: true` for service identities) remains
the actual authentication mechanism — this is the documented exceptional
path ADR-0017 §8 anticipates, not the intended long-term production
model. Wiring SSO/OIDC is a Payload `auth.strategies` addition once a
provider exists; it does not require changing `src/baobab/context` or
`src/baobab/authorization`, since both already consume `req.user` through
the `ContextActor` structural interface rather than Payload's concrete
auth implementation.

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
