#!/usr/bin/env tsx
/**
 * Runs the reconciliation checks described in ADR-0012 §81, ADR-0013 §55,
 * ADR-0016 §88, ADR-0018 §99-101 and ADR-0020 §112 and prints a JSON
 * report. Intended for on-demand operator use, CI smoke checks and
 * scheduled operational runs — see `docs/operations/runbooks.md`.
 *
 * Usage: npm run reconcile
 */
import { getPayload, type CollectionSlug } from 'payload';
import config from '../../payload.config.js';
import {
  findRecordsMissingTenant,
  findStaleMappingProjections,
  summarizeOutboxBacklog,
  type MappingProjectionRecord,
  type OutboxRecord,
  type TenantOwnedRecord,
} from '../../src/baobab/reconciliation/checks.js';

const TENANT_OWNED_COLLECTIONS: CollectionSlug[] = [
  'organisations',
  'digital-estates',
  'markets',
  'pages',
  'product-content',
  'media',
];

const MAPPING_PROJECTION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const report: Record<string, unknown> = {};

  for (const collection of TENANT_OWNED_COLLECTIONS) {
    const { docs } = await payload.find({ collection, limit: 1000, depth: 0 });
    const missing = findRecordsMissingTenant(docs as unknown as TenantOwnedRecord[]);
    if (missing.length > 0) {
      report[`${collection}.missingTenant`] = missing.map((d) => d.id);
    }
  }

  const mappingProjections = await payload.find({ collection: 'mapping-projections', limit: 1000, depth: 0 });
  const stale = findStaleMappingProjections(
    mappingProjections.docs as unknown as MappingProjectionRecord[],
    MAPPING_PROJECTION_MAX_AGE_MS,
  );
  if (stale.length > 0) {
    report['mappingProjections.stale'] = stale.map((s) => s.id);
  }

  const outboxRecords = await payload.find({ collection: 'outbox', limit: 1000, depth: 0 });
  report['outbox.backlog'] = summarizeOutboxBacklog(outboxRecords.docs as unknown as OutboxRecord[]);

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error('Reconciliation run failed', error);
  process.exit(1);
});
