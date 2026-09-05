# Content Resolution

Implements ADR-0014. Engine: `src/baobab/content-resolution`. Mechanism
description: `docs/architecture/overview.md` §6.

## Using the resolver from a collection/endpoint

```ts
import { resolveContent, InheritanceMode } from '../baobab/content-resolution/index.js';
import { ContentScope } from '../baobab/tenancy/scope.js';

const PAGES_POLICY = {
  contentType: 'page',
  inheritanceMode: InheritanceMode.INHERIT,
  supportedScopes: [ContentScope.DIGITAL_ESTATE, ContentScope.MARKET, ContentScope.LOCALE],
  localeFallback: { 'en-ZA': ['en'], 'sw-UG': ['sw'] },
};

// candidates: fetch every Pages row matching { tenant, contentKey } via an
// ordinary Payload query — the resolver decides *among* them, it doesn't query.
const result = resolveContent(
  { tenantId, digitalEstateId, marketId, locale, contentKey: 'home' },
  candidates.map(toResolvableRecord),
  PAGES_POLICY,
);

if (!result.record) {
  // No eligible representation at any policy-permitted level — 404, not a guess.
}
```

`toResolvableRecord()` is a small adapter you write per collection,
mapping its fields onto the resolver's `ResolvableRecord` shape
(`tenantId`, `legalEntityId?`, `digitalEstateId?`, `marketId?`, `locale?`,
`contentKey`, `publicationState`, `effectiveFrom?`, `effectiveTo?`) — see
`src/baobab/content-resolution/types.ts`. No such adapter exists yet for
`Pages` in production code (only in tests) because no digital estate
consumes it yet; the resolver itself is fully implemented and tested.

## Choosing an `inheritanceMode`

| Mode | Use when | Example |
|---|---|---|
| `NONE` | The exact representation must exist at the requested scope; a broader one is never acceptable | Market-specific regulatory disclosure |
| `INHERIT` | A broader record is fine when nothing more specific exists | Tenant-wide footer legal notice |
| `OVERRIDE` | Same as `INHERIT`, but the semantic emphasis is "more specific replaces broader" rather than "broader fills a gap" | Estate-specific navigation |
| `COMPOSE` | Multiple scope levels should all contribute | Navigation assembled from tenant + estate + market items |

`resolveContent()` handles the first three; `COMPOSE` policies must call
`resolveComposedContent()` instead (calling the wrong one throws
immediately rather than silently doing the wrong thing).

## Ambiguity is an error, not a coin flip

If two candidates are equally specific and both eligible,
`resolveContent()`/`resolveComposedContent()` throw
`AmbiguousResolutionError` rather than picking one (ADR-0014 §65-66). This
is a data-integrity problem in the source collection (two records
declaring the exact same scope) — fix the data, don't catch the error and
pick the first result.

## Locale fallback is explicit

`resolveLocaleChain()` only follows `policy.localeFallback` — it never
infers `en-ZA → en-US` from string similarity (ADR-0014 §27, §102). If a
locale has no configured fallback, an unresolved request for it returns
no content rather than guessing.
