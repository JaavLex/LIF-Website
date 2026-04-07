import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add `is_main_faction` boolean to factions and mark LIF as the main faction
 * by default (case-insensitive match on name or slug).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "factions"
    ADD COLUMN IF NOT EXISTS "is_main_faction" boolean DEFAULT false;
  `)
  // Best-effort auto-mark LIF as main faction
  await db.execute(sql`
    UPDATE "factions"
    SET "is_main_faction" = true
    WHERE lower("slug") = 'lif' OR lower("name") = 'lif';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "factions" DROP COLUMN IF EXISTS "is_main_faction";
  `)
}
