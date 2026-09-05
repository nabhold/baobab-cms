-- Payload's postgres adapter is configured with schemaName "payload"
-- (payload.config.ts). The adapter does not create this schema itself, so
-- it must exist before the first migration runs.
CREATE SCHEMA IF NOT EXISTS payload AUTHORIZATION payload;
