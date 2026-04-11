import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "map_poi" (
			"id" serial PRIMARY KEY NOT NULL,
			"name" varchar NOT NULL,
			"type" varchar NOT NULL DEFAULT 'bar',
			"description" varchar,
			"x" numeric NOT NULL,
			"z" numeric NOT NULL,
			"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
			"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
		);
		CREATE INDEX IF NOT EXISTS "map_poi_type_idx" ON "map_poi" ("type");
		CREATE INDEX IF NOT EXISTS "map_poi_created_at_idx" ON "map_poi" ("created_at");

		-- Payload auto-generates a relation column in payload_locked_documents_rels
		-- for every collection, and fails with a 500 on ANY /admin query if missing.
		ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "map_poi_id" integer;

		ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_map_poi_fk";
		ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_map_poi_fk" FOREIGN KEY ("map_poi_id") REFERENCES "map_poi"("id") ON DELETE CASCADE;

		CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_map_poi_id_idx" ON "payload_locked_documents_rels" ("map_poi_id");
	`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`
		ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_map_poi_fk";
		DROP INDEX IF EXISTS "payload_locked_documents_rels_map_poi_id_idx";
		ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "map_poi_id";
		DROP TABLE IF EXISTS "map_poi";
	`);
}
