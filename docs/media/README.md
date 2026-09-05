# Media

Implements ADR-0016. Collection: `src/collections/Media.ts`. Policy
helpers: `src/baobab/media/policy.ts`.

## Storage

`@payloadcms/storage-s3` is wired in `payload.config.ts`, enabled
whenever `S3_ENDPOINT` or `S3_BUCKET` is set. Local development points it
at the MinIO service in `docker-compose.yml` (bucket `baobab-media`,
bootstrapped by the `minio-init` one-shot service). Production points the
same env vars at a real S3-compatible bucket. If neither is set, the
plugin is disabled — uploads fail explicitly rather than silently landing
on the container filesystem (ADR-0016 §10, §83, §107).

## Access classes

`accessClass` is required and defaults to `PRIVATE` — there is no state
in which a missing value means public (ADR-0016 §20). Changing it to
`PUBLIC` is an ordinary field edit today; a signed-URL delivery path for
`PRIVATE`/`RESTRICTED` media is **not yet implemented** — see the
implementation report. Until it is, treat any `PRIVATE`/`RESTRICTED`
media record as "stored, not yet safely deliverable outside the Admin
API."

## Upload validation

`DEFAULT_MEDIA_UPLOAD_POLICY` (25 MB, an explicit mime allowlist) is
enforced in `Media`'s `beforeValidate` hook. `containsUnsafeSvgMarkup()`
is available for a future hook that inspects SVG content before
acceptance — it is not yet wired into the collection's upload path
because doing so requires reading the uploaded buffer inside a hook,
which needs a small amount of Payload-version-specific plumbing not yet
justified without a real SVG-upload use case.

## Canonical identity vs. storage key

- `canonicalMediaId` (via `canonicalIdField`) is what other engines and
  canonical events reference.
- `buildTenantScopedStorageKey()` documents the intended
  `tenants/<tenantId>/media/<canonicalMediaId>/<filename>` key shape —
  logical partitioning as defence in depth, never the actual access
  boundary (that's `accessClass` + Payload access control).

Neither of these is the Payload `id`, and neither is the eventual
CDN/delivery URL — all three are allowed to change independently
(ADR-0016 §8-9, §73-76).

## Reconciliation

`findMissingMediaObjects`/`findOrphanedStorageObjects`
(`src/baobab/reconciliation/checks.ts`) are pure predicates ready to be
wired into a scheduled job once there's a real storage-listing API call
to feed them (`scripts/reconciliation/run.ts` does not yet call these —
see the implementation report).
