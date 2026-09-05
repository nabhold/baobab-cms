import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."_locales" AS ENUM('en', 'fr', 'af');
  CREATE TYPE "payload"."enum_users_editorial_roles" AS ENUM('VIEWER', 'AUTHOR', 'EDITOR', 'REVIEWER', 'PUBLISHER', 'CONTENT_ADMINISTRATOR');
  CREATE TYPE "payload"."enum_users_roles" AS ENUM('admin', 'editor', 'viewer');
  CREATE TYPE "payload"."enum_tenants_status" AS ENUM('active', 'suspended', 'archived');
  CREATE TYPE "payload"."enum_organisations_status" AS ENUM('active', 'inactive');
  CREATE TYPE "payload"."enum_digital_estates_status" AS ENUM('active', 'inactive');
  CREATE TYPE "payload"."enum_pages_content_scope" AS ENUM('PLATFORM', 'TENANT', 'LEGAL_ENTITY', 'DIGITAL_ESTATE', 'MARKET', 'LOCALE');
  CREATE TYPE "payload"."enum_pages_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "payload"."enum_product_content_content_scope" AS ENUM('PLATFORM', 'TENANT', 'LEGAL_ENTITY', 'DIGITAL_ESTATE', 'MARKET', 'LOCALE');
  CREATE TYPE "payload"."enum_product_content_publication_state" AS ENUM('DRAFT', 'REVIEW', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');
  CREATE TYPE "payload"."enum_media_access_class" AS ENUM('PUBLIC', 'RESTRICTED', 'PRIVATE');
  CREATE TYPE "payload"."enum_media_lifecycle_state" AS ENUM('UPLOADING', 'SCANNING', 'READY', 'QUARANTINED', 'PUBLISHED');
  CREATE TYPE "payload"."enum_outbox_status" AS ENUM('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED_RETRYABLE', 'FAILED_TERMINAL');
  CREATE TYPE "payload"."enum_audit_logs_outcome" AS ENUM('ALLOWED', 'DENIED');
  CREATE TYPE "payload"."enum_mapping_projections_lifecycle_state" AS ENUM('PROPOSED', 'ACTIVE', 'SUPERSEDED', 'RETIRED', 'INVALID', 'AMBIGUOUS');
  CREATE TABLE "payload"."users_editorial_roles" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "payload"."enum_users_editorial_roles",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "payload"."users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "payload"."enum_users_roles",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"canonical_actor_id" varchar,
  	"tenant_id" varchar,
  	"legal_entity_id" varchar,
  	"platform_administrator" boolean DEFAULT false,
  	"service_identity" boolean DEFAULT false,
  	"tenant_i_d" varchar,
  	"organisation_i_d" varchar,
  	"region" varchar DEFAULT 'GLOBAL',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."users_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."tenants" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"status" "payload"."enum_tenants_status" DEFAULT 'active',
  	"isolation_profile" varchar,
  	"default_locale" varchar DEFAULT 'en',
  	"is_projection" boolean DEFAULT true,
  	"last_synced_at" timestamp(3) with time zone,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."tenants_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."organisations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"canonical_legal_entity_id" varchar,
  	"tenant_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"status" "payload"."enum_organisations_status" DEFAULT 'active',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."regions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"country" varchar,
  	"enabled" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."digital_estates" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"canonical_digital_estate_id" varchar,
  	"tenant_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"default_locale" varchar,
  	"default_market_id" uuid,
  	"status" "payload"."enum_digital_estates_status" DEFAULT 'active',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."digital_estates_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."markets" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"canonical_market_id" varchar,
  	"tenant_id" uuid NOT NULL,
  	"legal_entity_id" uuid,
  	"name" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"currency" varchar,
  	"regulatory_regime" varchar,
  	"channel" varchar,
  	"brand" varchar,
  	"enabled" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."markets_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."pages" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"canonical_entity_id" varchar,
  	"tenant_id" uuid NOT NULL,
  	"organisation_id" uuid NOT NULL,
  	"digital_estate_id" uuid,
  	"market_id" uuid,
  	"locale" varchar,
  	"content_scope" "payload"."enum_pages_content_scope" DEFAULT 'TENANT' NOT NULL,
  	"content_key" varchar,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "payload"."enum_pages_status" DEFAULT 'draft',
  	"effective_from" timestamp(3) with time zone,
  	"effective_to" timestamp(3) with time zone,
  	"content" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"regions_id" uuid
  );
  
  CREATE TABLE "payload"."product_content" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"canonical_entity_id" varchar,
  	"tenant_id" uuid NOT NULL,
  	"canonical_product_id" varchar NOT NULL,
  	"digital_estate_id" uuid,
  	"market_id" uuid,
  	"locale" varchar,
  	"content_scope" "payload"."enum_product_content_content_scope" DEFAULT 'TENANT' NOT NULL,
  	"headline" varchar,
  	"short_description" varchar,
  	"long_description" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"content_blocks" jsonb,
  	"publication_state" "payload"."enum_product_content_publication_state" DEFAULT 'DRAFT' NOT NULL,
  	"commerce_projection_status" varchar,
  	"commerce_projection_sku_summary" varchar,
  	"commerce_projection_variant_summary" varchar,
  	"commerce_projection_last_synced_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."product_content_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" uuid
  );
  
  CREATE TABLE "payload"."media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"canonical_media_id" varchar,
  	"tenant_id" uuid NOT NULL,
  	"digital_estate_id" uuid,
  	"title" varchar,
  	"alt_text" varchar,
  	"caption" varchar,
  	"attribution" varchar,
  	"access_class" "payload"."enum_media_access_class" DEFAULT 'PRIVATE' NOT NULL,
  	"lifecycle_state" "payload"."enum_media_lifecycle_state" DEFAULT 'UPLOADING' NOT NULL,
  	"rights_expiry" timestamp(3) with time zone,
  	"checksum" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload"."outbox" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"event_id" varchar NOT NULL,
  	"event_type" varchar NOT NULL,
  	"tenant" varchar,
  	"canonical_entity_id" varchar,
  	"envelope" jsonb NOT NULL,
  	"status" "payload"."enum_outbox_status" DEFAULT 'PENDING' NOT NULL,
  	"attempt_count" numeric DEFAULT 0,
  	"next_attempt_at" timestamp(3) with time zone,
  	"published_at" timestamp(3) with time zone,
  	"last_error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."audit_logs" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"actor_id" varchar NOT NULL,
  	"tenant" varchar,
  	"legal_entity_id" varchar,
  	"digital_estate_id" varchar,
  	"market_id" varchar,
  	"resource_type" varchar NOT NULL,
  	"resource_id" varchar,
  	"action" varchar NOT NULL,
  	"outcome" "payload"."enum_audit_logs_outcome" NOT NULL,
  	"correlation_id" varchar,
  	"previous_state" jsonb,
  	"resulting_state" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."mapping_projections" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"canonical_entity_id" varchar NOT NULL,
  	"canonical_entity_type" varchar NOT NULL,
  	"engine" varchar NOT NULL,
  	"engine_instance_id" varchar NOT NULL,
  	"external_type" varchar NOT NULL,
  	"external_id" varchar NOT NULL,
  	"tenant" varchar,
  	"lifecycle_state" "payload"."enum_mapping_projections_lifecycle_state" DEFAULT 'ACTIVE' NOT NULL,
  	"synced_at" timestamp(3) with time zone NOT NULL,
  	"stale" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid,
  	"tenants_id" uuid,
  	"organisations_id" uuid,
  	"regions_id" uuid,
  	"digital_estates_id" uuid,
  	"markets_id" uuid,
  	"pages_id" uuid,
  	"product_content_id" uuid,
  	"media_id" uuid,
  	"outbox_id" uuid,
  	"audit_logs_id" uuid,
  	"mapping_projections_id" uuid
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."users_editorial_roles" ADD CONSTRAINT "users_editorial_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."users_texts" ADD CONSTRAINT "users_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."tenants_texts" ADD CONSTRAINT "tenants_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."organisations" ADD CONSTRAINT "organisations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payload"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."digital_estates" ADD CONSTRAINT "digital_estates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payload"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."digital_estates" ADD CONSTRAINT "digital_estates_default_market_id_markets_id_fk" FOREIGN KEY ("default_market_id") REFERENCES "payload"."markets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."digital_estates_texts" ADD CONSTRAINT "digital_estates_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."digital_estates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."markets" ADD CONSTRAINT "markets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payload"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."markets" ADD CONSTRAINT "markets_legal_entity_id_organisations_id_fk" FOREIGN KEY ("legal_entity_id") REFERENCES "payload"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."markets_texts" ADD CONSTRAINT "markets_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payload"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "payload"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_digital_estate_id_digital_estates_id_fk" FOREIGN KEY ("digital_estate_id") REFERENCES "payload"."digital_estates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "payload"."markets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_rels" ADD CONSTRAINT "pages_rels_regions_fk" FOREIGN KEY ("regions_id") REFERENCES "payload"."regions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."product_content" ADD CONSTRAINT "product_content_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payload"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."product_content" ADD CONSTRAINT "product_content_digital_estate_id_digital_estates_id_fk" FOREIGN KEY ("digital_estate_id") REFERENCES "payload"."digital_estates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."product_content" ADD CONSTRAINT "product_content_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "payload"."markets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."product_content_rels" ADD CONSTRAINT "product_content_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."product_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."product_content_rels" ADD CONSTRAINT "product_content_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."media" ADD CONSTRAINT "media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payload"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."media" ADD CONSTRAINT "media_digital_estate_id_digital_estates_id_fk" FOREIGN KEY ("digital_estate_id") REFERENCES "payload"."digital_estates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "payload"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_organisations_fk" FOREIGN KEY ("organisations_id") REFERENCES "payload"."organisations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_regions_fk" FOREIGN KEY ("regions_id") REFERENCES "payload"."regions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_digital_estates_fk" FOREIGN KEY ("digital_estates_id") REFERENCES "payload"."digital_estates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_markets_fk" FOREIGN KEY ("markets_id") REFERENCES "payload"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_content_fk" FOREIGN KEY ("product_content_id") REFERENCES "payload"."product_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_outbox_fk" FOREIGN KEY ("outbox_id") REFERENCES "payload"."outbox"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "payload"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mapping_projections_fk" FOREIGN KEY ("mapping_projections_id") REFERENCES "payload"."mapping_projections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_editorial_roles_order_idx" ON "payload"."users_editorial_roles" USING btree ("order");
  CREATE INDEX "users_editorial_roles_parent_idx" ON "payload"."users_editorial_roles" USING btree ("parent_id");
  CREATE INDEX "users_roles_order_idx" ON "payload"."users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "payload"."users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_canonical_actor_id_idx" ON "payload"."users" USING btree ("canonical_actor_id");
  CREATE INDEX "users_tenant_id_idx" ON "payload"."users" USING btree ("tenant_id");
  CREATE INDEX "users_tenant_i_d_idx" ON "payload"."users" USING btree ("tenant_i_d");
  CREATE INDEX "users_organisation_i_d_idx" ON "payload"."users" USING btree ("organisation_i_d");
  CREATE INDEX "users_region_idx" ON "payload"."users" USING btree ("region");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE INDEX "users_texts_order_parent" ON "payload"."users_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "tenants_code_idx" ON "payload"."tenants" USING btree ("code");
  CREATE INDEX "tenants_updated_at_idx" ON "payload"."tenants" USING btree ("updated_at");
  CREATE INDEX "tenants_created_at_idx" ON "payload"."tenants" USING btree ("created_at");
  CREATE INDEX "tenants_texts_order_parent" ON "payload"."tenants_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "organisations_canonical_legal_entity_id_idx" ON "payload"."organisations" USING btree ("canonical_legal_entity_id");
  CREATE INDEX "organisations_tenant_idx" ON "payload"."organisations" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "organisations_code_idx" ON "payload"."organisations" USING btree ("code");
  CREATE INDEX "organisations_updated_at_idx" ON "payload"."organisations" USING btree ("updated_at");
  CREATE INDEX "organisations_created_at_idx" ON "payload"."organisations" USING btree ("created_at");
  CREATE UNIQUE INDEX "regions_code_idx" ON "payload"."regions" USING btree ("code");
  CREATE INDEX "regions_updated_at_idx" ON "payload"."regions" USING btree ("updated_at");
  CREATE INDEX "regions_created_at_idx" ON "payload"."regions" USING btree ("created_at");
  CREATE UNIQUE INDEX "digital_estates_canonical_digital_estate_id_idx" ON "payload"."digital_estates" USING btree ("canonical_digital_estate_id");
  CREATE INDEX "digital_estates_tenant_idx" ON "payload"."digital_estates" USING btree ("tenant_id");
  CREATE INDEX "digital_estates_code_idx" ON "payload"."digital_estates" USING btree ("code");
  CREATE INDEX "digital_estates_default_market_idx" ON "payload"."digital_estates" USING btree ("default_market_id");
  CREATE INDEX "digital_estates_updated_at_idx" ON "payload"."digital_estates" USING btree ("updated_at");
  CREATE INDEX "digital_estates_created_at_idx" ON "payload"."digital_estates" USING btree ("created_at");
  CREATE INDEX "digital_estates_texts_order_parent" ON "payload"."digital_estates_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "markets_canonical_market_id_idx" ON "payload"."markets" USING btree ("canonical_market_id");
  CREATE INDEX "markets_tenant_idx" ON "payload"."markets" USING btree ("tenant_id");
  CREATE INDEX "markets_legal_entity_idx" ON "payload"."markets" USING btree ("legal_entity_id");
  CREATE INDEX "markets_code_idx" ON "payload"."markets" USING btree ("code");
  CREATE INDEX "markets_updated_at_idx" ON "payload"."markets" USING btree ("updated_at");
  CREATE INDEX "markets_created_at_idx" ON "payload"."markets" USING btree ("created_at");
  CREATE INDEX "markets_texts_order_parent" ON "payload"."markets_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "pages_canonical_entity_id_idx" ON "payload"."pages" USING btree ("canonical_entity_id");
  CREATE INDEX "pages_tenant_idx" ON "payload"."pages" USING btree ("tenant_id");
  CREATE INDEX "pages_organisation_idx" ON "payload"."pages" USING btree ("organisation_id");
  CREATE INDEX "pages_digital_estate_idx" ON "payload"."pages" USING btree ("digital_estate_id");
  CREATE INDEX "pages_market_idx" ON "payload"."pages" USING btree ("market_id");
  CREATE INDEX "pages_locale_idx" ON "payload"."pages" USING btree ("locale");
  CREATE INDEX "pages_content_scope_idx" ON "payload"."pages" USING btree ("content_scope");
  CREATE INDEX "pages_content_key_idx" ON "payload"."pages" USING btree ("content_key");
  CREATE INDEX "pages_slug_idx" ON "payload"."pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "payload"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "payload"."pages" USING btree ("created_at");
  CREATE INDEX "pages_rels_order_idx" ON "payload"."pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "payload"."pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "payload"."pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_regions_id_idx" ON "payload"."pages_rels" USING btree ("regions_id");
  CREATE UNIQUE INDEX "product_content_canonical_entity_id_idx" ON "payload"."product_content" USING btree ("canonical_entity_id");
  CREATE INDEX "product_content_tenant_idx" ON "payload"."product_content" USING btree ("tenant_id");
  CREATE INDEX "product_content_canonical_product_id_idx" ON "payload"."product_content" USING btree ("canonical_product_id");
  CREATE INDEX "product_content_digital_estate_idx" ON "payload"."product_content" USING btree ("digital_estate_id");
  CREATE INDEX "product_content_market_idx" ON "payload"."product_content" USING btree ("market_id");
  CREATE INDEX "product_content_locale_idx" ON "payload"."product_content" USING btree ("locale");
  CREATE INDEX "product_content_content_scope_idx" ON "payload"."product_content" USING btree ("content_scope");
  CREATE INDEX "product_content_updated_at_idx" ON "payload"."product_content" USING btree ("updated_at");
  CREATE INDEX "product_content_created_at_idx" ON "payload"."product_content" USING btree ("created_at");
  CREATE INDEX "product_content_rels_order_idx" ON "payload"."product_content_rels" USING btree ("order");
  CREATE INDEX "product_content_rels_parent_idx" ON "payload"."product_content_rels" USING btree ("parent_id");
  CREATE INDEX "product_content_rels_path_idx" ON "payload"."product_content_rels" USING btree ("path");
  CREATE INDEX "product_content_rels_media_id_idx" ON "payload"."product_content_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "media_canonical_media_id_idx" ON "payload"."media" USING btree ("canonical_media_id");
  CREATE INDEX "media_tenant_idx" ON "payload"."media" USING btree ("tenant_id");
  CREATE INDEX "media_digital_estate_idx" ON "payload"."media" USING btree ("digital_estate_id");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE UNIQUE INDEX "outbox_event_id_idx" ON "payload"."outbox" USING btree ("event_id");
  CREATE INDEX "outbox_event_type_idx" ON "payload"."outbox" USING btree ("event_type");
  CREATE INDEX "outbox_tenant_idx" ON "payload"."outbox" USING btree ("tenant");
  CREATE INDEX "outbox_canonical_entity_id_idx" ON "payload"."outbox" USING btree ("canonical_entity_id");
  CREATE INDEX "outbox_status_idx" ON "payload"."outbox" USING btree ("status");
  CREATE INDEX "outbox_next_attempt_at_idx" ON "payload"."outbox" USING btree ("next_attempt_at");
  CREATE INDEX "outbox_updated_at_idx" ON "payload"."outbox" USING btree ("updated_at");
  CREATE INDEX "outbox_created_at_idx" ON "payload"."outbox" USING btree ("created_at");
  CREATE INDEX "audit_logs_actor_id_idx" ON "payload"."audit_logs" USING btree ("actor_id");
  CREATE INDEX "audit_logs_tenant_idx" ON "payload"."audit_logs" USING btree ("tenant");
  CREATE INDEX "audit_logs_resource_type_idx" ON "payload"."audit_logs" USING btree ("resource_type");
  CREATE INDEX "audit_logs_resource_id_idx" ON "payload"."audit_logs" USING btree ("resource_id");
  CREATE INDEX "audit_logs_action_idx" ON "payload"."audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_correlation_id_idx" ON "payload"."audit_logs" USING btree ("correlation_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "payload"."audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "payload"."audit_logs" USING btree ("created_at");
  CREATE INDEX "mapping_projections_canonical_entity_id_idx" ON "payload"."mapping_projections" USING btree ("canonical_entity_id");
  CREATE INDEX "mapping_projections_canonical_entity_type_idx" ON "payload"."mapping_projections" USING btree ("canonical_entity_type");
  CREATE INDEX "mapping_projections_external_id_idx" ON "payload"."mapping_projections" USING btree ("external_id");
  CREATE INDEX "mapping_projections_tenant_idx" ON "payload"."mapping_projections" USING btree ("tenant");
  CREATE INDEX "mapping_projections_updated_at_idx" ON "payload"."mapping_projections" USING btree ("updated_at");
  CREATE INDEX "mapping_projections_created_at_idx" ON "payload"."mapping_projections" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_tenants_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("tenants_id");
  CREATE INDEX "payload_locked_documents_rels_organisations_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("organisations_id");
  CREATE INDEX "payload_locked_documents_rels_regions_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("regions_id");
  CREATE INDEX "payload_locked_documents_rels_digital_estates_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("digital_estates_id");
  CREATE INDEX "payload_locked_documents_rels_markets_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("markets_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_product_content_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("product_content_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_outbox_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("outbox_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("audit_logs_id");
  CREATE INDEX "payload_locked_documents_rels_mapping_projections_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("mapping_projections_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."users_editorial_roles" CASCADE;
  DROP TABLE "payload"."users_roles" CASCADE;
  DROP TABLE "payload"."users_sessions" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."users_texts" CASCADE;
  DROP TABLE "payload"."tenants" CASCADE;
  DROP TABLE "payload"."tenants_texts" CASCADE;
  DROP TABLE "payload"."organisations" CASCADE;
  DROP TABLE "payload"."regions" CASCADE;
  DROP TABLE "payload"."digital_estates" CASCADE;
  DROP TABLE "payload"."digital_estates_texts" CASCADE;
  DROP TABLE "payload"."markets" CASCADE;
  DROP TABLE "payload"."markets_texts" CASCADE;
  DROP TABLE "payload"."pages" CASCADE;
  DROP TABLE "payload"."pages_rels" CASCADE;
  DROP TABLE "payload"."product_content" CASCADE;
  DROP TABLE "payload"."product_content_rels" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."outbox" CASCADE;
  DROP TABLE "payload"."audit_logs" CASCADE;
  DROP TABLE "payload"."mapping_projections" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TYPE "payload"."_locales";
  DROP TYPE "payload"."enum_users_editorial_roles";
  DROP TYPE "payload"."enum_users_roles";
  DROP TYPE "payload"."enum_tenants_status";
  DROP TYPE "payload"."enum_organisations_status";
  DROP TYPE "payload"."enum_digital_estates_status";
  DROP TYPE "payload"."enum_pages_content_scope";
  DROP TYPE "payload"."enum_pages_status";
  DROP TYPE "payload"."enum_product_content_content_scope";
  DROP TYPE "payload"."enum_product_content_publication_state";
  DROP TYPE "payload"."enum_media_access_class";
  DROP TYPE "payload"."enum_media_lifecycle_state";
  DROP TYPE "payload"."enum_outbox_status";
  DROP TYPE "payload"."enum_audit_logs_outcome";
  DROP TYPE "payload"."enum_mapping_projections_lifecycle_state";`)
}
