import type { CollectionConfig } from 'payload';
import { publishEntityEvent } from '../hooks/publishEventHandler.js';

const Regions: CollectionConfig = {
  slug: 'regions',
  admin: {
    useAsTitle: 'code',
  },
  hooks: {
    afterChange: [publishEntityEvent],
    afterDelete: [publishEntityEvent],
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Market or region code such as US, EU, ZA, GLOBAL.',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'country',
      type: 'text',
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
};

export default Regions;
