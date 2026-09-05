# Authorization

Implements ADR-0017 §25-48. Engine: `src/baobab/authorization`. See
`docs/architecture/overview.md` §9 and `docs/identity/README.md` for how
roles/capabilities attach to actors.

## Relationship to tenancy

Tenancy (`src/baobab/tenancy`) answers "which rows can this request see
at all" and is enforced centrally via `access` functions on every
collection. Authorization (`src/baobab/authorization`) answers a finer
question — "given this actor's roles, may they perform this *operation*"
— and is available for any endpoint or hook that needs it, layered on top
of (never instead of) tenant scoping.

```ts
import { isAuthorized } from '../baobab/authorization/evaluator.js';
import { EditorialRole, Permission } from '../baobab/authorization/roles.js';

const allowed = isAuthorized({
  context,                              // BaobabContext from resolveContext(req)
  roles: req.user.editorialRoles ?? [],
  permission: Permission.PUBLISH,
  resourceTenantId: doc.tenant,
  resourceDigitalEstateId: doc.digitalEstate,
  actorDigitalEstateIds: req.user.digitalEstateIds ?? undefined,
});
```

## Default-deny

Every branch in `isAuthorized()` that isn't an explicit `true` returns
`false` — there is no fallback "allow if unsure" path (ADR-0017 §29). A
`PlatformContext` (or a `TenantContext` with `isPlatformAdmin: true`)
always passes; everything else needs a role whose
`DEFAULT_ROLE_PERMISSIONS` entry includes the requested `Permission`, a
matching `resourceTenantId`, and (if the resource is estate-scoped and the
actor's bindings are restricted) a matching `resourceDigitalEstateId`.

## Publishing is separate from editing

`DEFAULT_ROLE_PERMISSIONS` deliberately does not give `Author` or
`Editor` the `publish`/`unpublish` permission — only `Publisher` and
`Content Administrator` have it (ADR-0017 §69-72). If a tenant wants
authors to self-publish, that's a role-table override
(`isAuthorized({ ..., rolePermissions: customTable })`), not a change to
the shared default.

## Where this is (and isn't) wired in today

`Media.lifecycleState`'s field-level `access.update` is the one place in
this change set that calls role logic directly (checking for the
`PUBLISHER` role before allowing a transition to `PUBLISHED`). Most
collections rely on `tenantScopedAccess({ requiredCapability })` alone,
which is coarser (capability-gated, not permission/role-gated). Extending
individual collections' publish/unpublish operations to go through
`isAuthorized()` with the `PUBLISH`/`UNPUBLISH` permissions is
straightforward but not done everywhere yet — see the implementation
report for why this was scoped to demonstrate the pattern rather than
apply it to every collection speculatively.
