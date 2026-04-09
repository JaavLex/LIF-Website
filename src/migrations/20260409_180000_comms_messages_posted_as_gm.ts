import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "comms_messages" ADD COLUMN IF NOT EXISTS "posted_as_gm" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "comms_messages" DROP COLUMN IF EXISTS "posted_as_gm";
  `)
}
