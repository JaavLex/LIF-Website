import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
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
	`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`DROP TABLE IF EXISTS "admin_logs";`);
}
