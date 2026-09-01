import type { CollectionConfig } from 'payload';
import { publishEntityEvent } from '../hooks/publishEventHandler.js';

const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: 'Page',
    plural: 'Pages',
  },
  hooks: {
    afterChange: [publishEntityEvent],
    afterDelete: [publishEntityEvent],
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
    },
    {
      name: 'organisation',
      type: 'relationship',
      relationTo: 'organisations',
      required: true,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'draft',
    },
    {
      name: 'regions',
      type: 'relationship',
      relationTo: 'regions',
      hasMany: true,
      index: true,
    },
    {
      name: 'content',
      type: 'richText',
    },
  ],
};

export default Pages;
