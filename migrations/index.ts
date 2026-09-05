import * as migration_20260905_121418_initial_schema from './20260905_121418_initial_schema.js';

export const migrations = [
  {
    up: migration_20260905_121418_initial_schema.up,
    down: migration_20260905_121418_initial_schema.down,
    name: '20260905_121418_initial_schema'
  },
];
