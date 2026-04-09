import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "admin_logs" (
			"id" serial PRIMARY KEY NOT NULL,
			"actor_discord_id" varchar NOT NULL,
			"actor_discord_username" varchar NOT NULL,
			"actor_discord_avatar" varchar,
			"actor_admin_level" varchar,
			"action" varchar NOT NULL,
			"summary" varchar NOT NULL,
			"entity_type" varchar,
			"entity_id" varchar,
			"entity_label" varchar,
			"diff" jsonb,
			"metadata" jsonb,
			"ip" varchar,
			"user_agent" varchar,
			"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
			"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
		);
		CREATE INDEX IF NOT EXISTS "admin_logs_actor_discord_id_idx" ON "admin_logs" ("actor_discord_id");
		CREATE INDEX IF NOT EXISTS "admin_logs_action_idx" ON "admin_logs" ("action");
		CREATE INDEX IF NOT EXISTS "admin_logs_entity_type_idx" ON "admin_logs" ("entity_type");
		CREATE INDEX IF NOT EXISTS "admin_logs_created_at_idx" ON "admin_logs" ("created_at");

		-- Payload auto-generates a relation column in payload_locked_documents_rels
		-- for every collection, and fails with a 500 on ANY /admin query (including
		-- unrelated collection views) if the column is missing. Mirror the pattern
		-- from 20260407_130000_comms_locked_documents_rels.
		ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "admin_logs_id" integer;

		ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_admin_logs_fk";
		ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admin_logs_fk" FOREIGN KEY ("admin_logs_id") REFERENCES "admin_logs"("id") ON DELETE CASCADE;

		CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_admin_logs_id_idx" ON "payload_locked_documents_rels" ("admin_logs_id");
	`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`
		ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_admin_logs_fk";
		DROP INDEX IF EXISTS "payload_locked_documents_rels_admin_logs_id_idx";
		ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "admin_logs_id";
		DROP TABLE IF EXISTS "admin_logs";
	`);
}
