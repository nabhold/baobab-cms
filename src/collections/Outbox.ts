import type { CollectionConfig } from 'payload';
import { platformAdminOnlyAccess } from '../baobab/tenancy/access.js';
import { OutboxStatus } from '../baobab/outbox/types.js';

/**
 * Transactional outbox (ADR-0018 §30-37). Written from inside collection
 * `afterChange`/`afterDelete` hooks in the same transaction as the
 * triggering mutation; drained by `src/baobab/outbox/dispatcher.ts`. This
 * collection is internal system state, not editorial content — it is
 * hidden from ordinary editors.
 */
const Outbox: CollectionConfig = {
  slug: 'outbox',
  admin: {
    useAsTitle: 'eventType',
    hidden: ({ user }) => user?.platformAdministrator !== true,
    defaultColumns: ['eventType', 'status', 'attemptCount', 'createdAt'],
    description: 'Internal transactional outbox (ADR-0018). Drained by the outbox dispatcher worker.',
  },
  access: platformAdminOnlyAccess(),
  fields: [
    { name: 'eventId', type: 'text', required: true, unique: true, index: true },
    { name: 'eventType', type: 'text', required: true, index: true },
    { name: 'tenant', type: 'text', index: true },
    { name: 'canonicalEntityId', type: 'text', index: true },
    { name: 'envelope', type: 'json', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: OutboxStatus.PENDING,
      index: true,
      options: Object.values(OutboxStatus).map((value) => ({ label: value, value })),
    },
    { name: 'attemptCount', type: 'number', defaultValue: 0 },
    { name: 'nextAttemptAt', type: 'date', index: true },
    { name: 'publishedAt', type: 'date' },
    { name: 'lastError', type: 'text' },
  ],
};

export default Outbox;
