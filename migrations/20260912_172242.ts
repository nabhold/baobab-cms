import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."users" ADD COLUMN "sso_subject" varchar;
  CREATE UNIQUE INDEX "users_sso_subject_idx" ON "payload"."users" USING btree ("sso_subject");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload"."users_sso_subject_idx";
  ALTER TABLE "payload"."users" DROP COLUMN "sso_subject";`)
}
