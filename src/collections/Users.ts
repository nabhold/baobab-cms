import type { CollectionConfig } from 'payload';

const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    verify: true,
    tokenExpiration: 60 * 60 * 24 * 7,
    useAPIKey: false,
  },
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'tenantID',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'organisationID',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'region',
      type: 'text',
      defaultValue: 'GLOBAL',
      index: true,
    },
    {
      name: 'roles',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Viewer', value: 'viewer' },
      ],
      hasMany: true,
      defaultValue: ['editor'],
    },
  ],
};

export default Users;
