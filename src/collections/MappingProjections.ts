import type { CollectionConfig } from 'payload';
import { platformAdminOnlyAccess } from '../baobab/tenancy/access.js';
import { MappingLifecycleState } from '../baobab/mappings/types.js';

/**
 * Local, non-authoritative cache of canonical mappings (ADR-0013 §44-46).
 * The Control Plane mapping service remains authoritative; this collection
 * only improves local resolution performance and is fully rebuildable by
 * reconciliation (`scripts/reconciliation/mappings.ts`).
 */
const MappingProjections: CollectionConfig = {
  slug: 'mapping-projections',
  admin: {
    useAsTitle: 'canonicalEntityId',
    hidden: ({ user }) => user?.platformAdministrator !== true,
    description: 'Non-authoritative local mapping cache (ADR-0013 §44-46). Rebuildable; never canonical authority.',
  },
  access: platformAdminOnlyAccess(),
  fields: [
    { name: 'canonicalEntityId', type: 'text', required: true, index: true },
    { name: 'canonicalEntityType', type: 'text', required: true, index: true },
    { name: 'engine', type: 'text', required: true },
    { name: 'engineInstanceId', type: 'text', required: true },
    { name: 'externalType', type: 'text', required: true },
    { name: 'externalId', type: 'text', required: true, index: true },
    { name: 'tenant', type: 'text', index: true },
    {
      name: 'lifecycleState',
      type: 'select',
      required: true,
      defaultValue: MappingLifecycleState.ACTIVE,
      options: Object.values(MappingLifecycleState).map((value) => ({ label: value, value })),
    },
    { name: 'syncedAt', type: 'date', required: true },
    { name: 'stale', type: 'checkbox', defaultValue: false, admin: { description: 'Set by reconciliation when freshness cannot be established.' } },
  ],
};

export default MappingProjections;
