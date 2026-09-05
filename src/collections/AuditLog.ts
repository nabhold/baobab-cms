import type { CollectionConfig } from 'payload';

/**
 * Immutable audit trail (ADR-0017 §79-82). Written only by trusted server
 * code via `src/baobab/audit/record.ts` using the Local API (which
 * defaults to overriding access control); the public API surface is
 * read-only for platform administrators and never editable — editorial
 * users cannot rewrite audit history merely because they can edit content.
 */
const AuditLog: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    useAsTitle: 'action',
    hidden: ({ user }) => user?.platformAdministrator !== true,
    defaultColumns: ['action', 'resourceType', 'outcome', 'actorId', 'createdAt'],
    description: 'Immutable audit trail (ADR-0017 §79-82). Written by trusted server code only.',
  },
  access: {
    read: ({ req }) => req.user?.platformAdministrator === true,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'actorId', type: 'text', required: true, index: true },
    { name: 'tenant', type: 'text', index: true },
    { name: 'legalEntityId', type: 'text' },
    { name: 'digitalEstateId', type: 'text' },
    { name: 'marketId', type: 'text' },
    { name: 'resourceType', type: 'text', required: true, index: true },
    { name: 'resourceId', type: 'text', index: true },
    { name: 'action', type: 'text', required: true, index: true },
    {
      name: 'outcome',
      type: 'select',
      required: true,
      options: [
        { label: 'Allowed', value: 'ALLOWED' },
        { label: 'Denied', value: 'DENIED' },
      ],
    },
    { name: 'correlationId', type: 'text', index: true },
    { name: 'previousState', type: 'json' },
    { name: 'resultingState', type: 'json' },
  ],
};

export default AuditLog;
