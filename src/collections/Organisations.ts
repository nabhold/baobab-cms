import type { CollectionConfig } from 'payload';
import { publishEntityEvent } from '../hooks/publishEventHandler.js';

const Organisations: CollectionConfig = {
  slug: 'organisations',
  admin: {
    useAsTitle: 'name',
  },
  hooks: {
    afterChange: [publishEntityEvent],
    afterDelete: [publishEntityEvent],
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
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
        { label: 'Inactive', value: 'inactive' },
      ],
      defaultValue: 'active',
    },
  ],
};

export default Organisations;
