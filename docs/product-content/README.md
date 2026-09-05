# Product Editorial Content

Implements ADR-0015. Collection: `src/collections/ProductContent.ts`.

## Authority split

| Concern | Owner |
|---|---|
| Price, SKU, variants, inventory, sellability, promotions | Medusa (not this repo) |
| Headline, descriptions, editorial media, SEO, content blocks | `product-content` (this repo) |
| Canonical product identity, mapping between the two | Control Plane (`canonicalProductId`, resolved via `src/baobab/mappings` — see `docs/mappings/README.md`) |

`ProductContent` has no price field, no SKU field, no inventory field, and
no sellability field — on purpose. If you find yourself wanting to add
one, that's the signal the field belongs in Medusa, not here (ADR-0015
§23-26).

## `commerceProjection`

The one exception is a small, explicitly-labelled, non-authoritative
group (`status`, `skuSummary`, `variantSummary`, `lastSyncedAt`) for
editorial convenience — e.g. showing an editor roughly what commerce
state exists without a live Medusa call. It is documented in the field's
`admin.description` as non-authoritative and must never be read as
current transactional truth (ADR-0015 §70-72).

## Composing a customer-facing product view

This repository does not implement a composition API — that's a digital
estate/BFF concern (ADR-0015 §49-52), not something the Content Engine
itself should own. What it provides is the stable input to one:

```text
canonicalProductId
  → MappingResolver.resolveByCanonicalId(...)
      → Medusa ExternalReference → fetch commerce state
      → Payload ExternalReference → fetch this collection's ProductContent
  → compose (read-only; never a new authority — ADR-0015 §19)
```

## Why there's no reconciliation job wired up yet

`src/baobab/reconciliation/checks.ts` has the general-purpose
`findRecordsMissingTenant`/`findStaleMappingProjections` predicates that
already apply to `product-content` rows. The product-specific
reconciliation ADR-0015 §84-86 describes (Medusa products without
mappings, published content without an active commerce product, etc.)
needs a real Medusa API client to be meaningful — see the implementation
report for why that integration isn't stood up in this change set.
