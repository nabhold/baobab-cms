# Canonical Identity & Mappings

Implements ADR-0013. See `docs/architecture/overview.md` §7.

## The rule

Payload's own `id`, a record's `slug`, its `title`, and any object-storage
key are all **engine-local**. None of them may be treated as identity
that survives a migration, a CMS replacement, or a cross-engine reference.
Every collection that needs to be referenced by another engine or survive
CMS replacement carries a `canonicalEntityId` (see
`src/baobab/identity/field.ts`) — immutable once assigned, opaque,
independent of everything else about the record.

## Resolving a cross-engine reference

Never do this:

```ts
// PROHIBITED — matching by a mutable/business identifier
const product = await medusa.find({ sku: payloadRecord.sku });
```

Always go through the resolver interface:

```ts
import type { MappingResolver } from '../baobab/mappings/resolver.js';

async function resolveCanonicalProduct(resolver: MappingResolver, externalId: string, scope: MappingScope) {
  const mapping = await resolver.resolveByExternalReference(
    { engine: 'PAYLOAD', engineInstanceId: process.env.BAOBAB_ENGINE_INSTANCE_ID!, externalType: 'product-content', externalId },
    scope,
  );
  if (!mapping) {
    // Fail closed / enter reconciliation. Never fall back to slug/SKU matching.
  }
  return mapping;
}
```

## Why there's no real resolver wired in yet

There is no Control Plane service in this GitHub organisation to call.
Wiring a concrete implementation today would mean either (a) faking one,
which would be worse than not having it, or (b) inventing a bespoke
mapping database inside Payload, which ADR-0013 §5-6 explicitly
prohibits ("`CanonicalEntity` is not a universal data record"). Instead:

- `UnavailableMappingResolver` is the production default — every method
  throws, loudly, rather than guessing. Code paths that need mapping
  resolution must have an explicit degradation policy (ADR-0013 §51) —
  don't catch this and silently continue.
- `InMemoryMappingResolver` is for tests and local development. It
  correctly implements ambiguity detection, tenant-scope matching, and
  idempotent creation, so code written against the interface today will
  work unchanged once a real HTTP-backed implementation exists.
- `mapping-projections` (`src/collections/MappingProjections.ts`) is the
  local, non-authoritative cache pattern ADR-0013 §44-46 describes —
  reconciliation (`src/baobab/reconciliation/checks.ts`,
  `findStaleMappingProjections`) already knows how to detect staleness in
  it.

## Adding a real Control Plane client

Implement `MappingResolver` (three methods:
`resolveByExternalReference`, `resolveByCanonicalId`, `createMapping`)
against the Control Plane's HTTP/gRPC API, and swap it in wherever
`UnavailableMappingResolver`/`InMemoryMappingResolver` is currently
constructed. Nothing else in this codebase needs to change — that's the
point of the interface boundary.
