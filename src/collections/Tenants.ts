import type { CollectionConfig } from 'payload';
import { publishEntityEvent } from '../hooks/publishEventHandler.js';

const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
  },
  hooks: {
    afterChange: [publishEntityEvent],
    afterDelete: [publishEntityEvent],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'active',
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Tenant metadata for future integrations and region configuration.',
      },
    },
  ],
};

export default Tenants;
