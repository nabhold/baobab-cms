import type { PayloadRequest } from 'payload';
import type { AuditEntry } from './types.js';

/**
 * Writes an audit entry for a privileged content or administrative
 * operation (ADR-0017 §79-82). Best-effort: a failure to write audit
 * SHOULD NOT be silently invisible, so it is logged loudly, but it also
 * does not roll back the primary business transaction — audit is a
 * secondary record of an operation that already happened, not a gate on
 * it.
 */
export async function recordAudit(req: PayloadRequest, entry: AuditEntry): Promise<void> {
  try {
    await req.payload.create({
      collection: 'audit-logs',
      data: entry,
      req,
    });
  } catch (error) {
    req.payload.logger.error({ err: error, entry }, 'Failed to write audit log entry');
  }
}
