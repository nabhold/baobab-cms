import type { CollectionConfig } from 'payload';
import { platformGlobalReadOnlyAccess } from '../baobab/tenancy/access.js';

/**
 * Legacy coarse region/market reference list from the original
 * installation. Preserved unmodified for backward compatibility
 * (ADR-0019 §21-23) — new content SHOULD use the `markets` collection
 * (ADR-0014 §10-13), which properly separates market from geography,
 * currency, regulation, channel and brand instead of a single code.
 */
const Regions: CollectionConfig = {
  slug: 'regions',
  admin: {
    useAsTitle: 'code',
    description: 'Deprecated legacy region/market code list. Use the `markets` collection for new content.',
  },
  access: platformGlobalReadOnlyAccess(),
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
