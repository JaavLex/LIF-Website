import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "characters"
      ADD COLUMN IF NOT EXISTS "requires_improvements" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "improvement_reason" varchar,
      ADD COLUMN IF NOT EXISTS "improvement_requested_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "improvement_requested_by" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "characters"
      DROP COLUMN IF EXISTS "requires_improvements",
      DROP COLUMN IF EXISTS "improvement_reason",
      DROP COLUMN IF EXISTS "improvement_requested_at",
      DROP COLUMN IF EXISTS "improvement_requested_by";
  `)
}
