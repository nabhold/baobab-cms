import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';

import Users from './src/collections/Users.js';
import Tenants from './src/collections/Tenants.js';
import Organisations from './src/collections/Organisations.js';
import Regions from './src/collections/Regions.js';
import Pages from './src/collections/Pages.js';
import { publishEntityEvent } from './src/hooks/publishEventHandler.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'change-me-in-production',
  admin: {
    disable: true,
  },
  db: postgresAdapter({
    pool: {
      connectionString:
        process.env.DATABASE_URL || 'postgresql://payload:payload@postgres:5432/payload',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl:
        process.env.PGSSLMODE === 'require'
          ? { rejectUnauthorized: false }
          : undefined,
    },
    schemaName: 'payload',
    idType: 'uuid',
    migrationDir: path.resolve(dirname, './migrations'),
  }),
  collections: [Users, Tenants, Organisations, Regions, Pages],
  graphQL: {
    disable: false,
  },
  cors: [process.env.CORS_ORIGIN || '*'],
  csrf: [process.env.CSRF_ORIGIN || 'http://localhost:3000'],
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload-types.ts'),
  },
  localization: {
    locales: ['en', 'fr', 'af'],
    defaultLocale: 'en',
  },
});
