import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Add unit selector fields (is_main, selector_tagline, selector_pitch) to
 * `units`, plus a `units_selector_traits` array table. Also auto-mark the
 * units whose slug matches "cerberus" / "specter" / "spectre" as main units.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		ALTER TABLE "units"
		ADD COLUMN IF NOT EXISTS "is_main" boolean DEFAULT false;
	`);
	await db.execute(sql`
		ALTER TABLE "units"
		ADD COLUMN IF NOT EXISTS "selector_tagline" varchar;
	`);
	await db.execute(sql`
		ALTER TABLE "units"
		ADD COLUMN IF NOT EXISTS "selector_pitch" varchar;
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "units_selector_traits" (
			"_order" integer NOT NULL,
			"_parent_id" integer NOT NULL,
			"id" varchar PRIMARY KEY NOT NULL,
			"label" varchar NOT NULL
		);
	`);

	// Add FK + indexes only if they don't already exist
	await db.execute(sql`
		DO $$ BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'units_selector_traits_parent_id_fk'
			) THEN
				ALTER TABLE "units_selector_traits"
				ADD CONSTRAINT "units_selector_traits_parent_id_fk"
				FOREIGN KEY ("_parent_id") REFERENCES "public"."units"("id")
				ON DELETE cascade ON UPDATE no action;
			END IF;
		END $$;
	`);

	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "units_selector_traits_order_idx"
		ON "units_selector_traits" USING btree ("_order");
	`);
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "units_selector_traits_parent_id_idx"
		ON "units_selector_traits" USING btree ("_parent_id");
	`);

	// Best-effort: flag well-known main LIF units as isMain
	await db.execute(sql`
		UPDATE "units"
		SET "is_main" = true
		WHERE lower("slug") IN ('cerberus', 'specter', 'spectre');
	`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`DROP TABLE IF EXISTS "units_selector_traits" CASCADE;`);
	await db.execute(sql`ALTER TABLE "units" DROP COLUMN IF EXISTS "selector_pitch";`);
	await db.execute(sql`ALTER TABLE "units" DROP COLUMN IF EXISTS "selector_tagline";`);
	await db.execute(sql`ALTER TABLE "units" DROP COLUMN IF EXISTS "is_main";`);
}
