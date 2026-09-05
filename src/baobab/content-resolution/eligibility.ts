import type { ResolvableRecord } from './types.js';

/** ADR-0014 §45-46 — only eligible publication state participates in resolution. */
export function isPublicationEligible(record: ResolvableRecord, previewMode: boolean | undefined): boolean {
  if (previewMode) return record.publicationState !== 'ARCHIVED';
  return record.publicationState === 'PUBLISHED';
}

/** ADR-0014 §43-44 — temporal validity is checked before applying inheritance. */
export function isTemporallyEligible(record: ResolvableRecord, atISO: string): boolean {
  const at = Date.parse(atISO);
  if (record.effectiveFrom && Date.parse(record.effectiveFrom) > at) return false;
  if (record.effectiveTo && Date.parse(record.effectiveTo) < at) return false;
  return true;
}
