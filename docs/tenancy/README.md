# Tenancy

Implements ADR-0012. See `docs/architecture/overview.md` §4 for the
mechanism; this page is the quick reference for adding a new tenant-owned
collection correctly.

## Making a new collection tenant-owned

```ts
import { tenantOwnedField, contentScopeField, sameTenantRelationshipField } from '../baobab/tenancy/fields.js';
import { tenantScopedAccess } from '../baobab/tenancy/access.js';
import { canonicalIdField } from '../baobab/identity/field.js';

const MyCollection: CollectionConfig = {
  slug: 'my-collection',
  access: tenantScopedAccess({ writeCapability: 'content.management' }),
  fields: [
    canonicalIdField({ entityType: 'MY_TYPE' }),
    tenantOwnedField(),
    contentScopeField(),
    sameTenantRelationshipField({ name: 'digitalEstate', relationTo: 'digital-estates', label: 'Digital estate' }),
    // ...your fields
  ],
};
```

That's the whole enforcement surface. You do not need to write your own
`access` functions or tenant-filtering `beforeChange` hooks — doing so
would duplicate (and risk diverging from) the centrally-enforced logic
ADR-0012 §18/§92 requires.

## What you get for free

- `read`/`update`/`delete` are scoped to the caller's tenant via a `Where`
  clause — not a boolean, so it can't be bypassed by omitting a filter.
- `create` requires the caller to have a resolvable tenant context (or be
  a platform administrator).
- The `tenant` field can never be set or changed by a client — it is
  server-derived on create and immutable across ordinary updates.
- Any relationship field wrapped in `sameTenantRelationshipField` rejects
  a cross-tenant reference at write time.

## What you still have to decide per collection

- Which capability (if any) gates write access
  (`tenantScopedAccess({ writeCapability: '...' })`).
- Whether records may ever be `PLATFORM`-scoped
  (`contentScopeField()` — only a platform administrator can set this).
- Whether the collection needs `digitalEstate`/`market`/`locale`
  dimensions at all — not every collection does (ADR-0012 §8).
- Scoped uniqueness constraints beyond tenant (see `Pages.slug` in
  `src/collections/Pages.ts` for the pattern — Payload doesn't support
  compound-unique indexes declaratively, so this is a custom `validate`
  function).

## Negative testing

Every tenancy change should come with a test proving the *denied* path,
not just the allowed one — see `src/baobab/tenancy/access.test.ts` and
`src/baobab/context/resolve.test.ts` for the pattern (construct two
tenant contexts, prove neither can read/write the other's `Where` scope).
