import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "comms_channels" ADD COLUMN IF NOT EXISTS "anon_for_character_id" numeric;

    ALTER TABLE "comms_messages" ADD COLUMN IF NOT EXISTS "reply_to_message_id" numeric;
    ALTER TABLE "comms_messages" ADD COLUMN IF NOT EXISTS "mentions" jsonb;

    CREATE INDEX IF NOT EXISTS "comms_messages_reply_to_message_id_idx" ON "comms_messages" USING btree ("reply_to_message_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "comms_messages_reply_to_message_id_idx";
    ALTER TABLE "comms_messages" DROP COLUMN IF EXISTS "mentions";
    ALTER TABLE "comms_messages" DROP COLUMN IF EXISTS "reply_to_message_id";
    ALTER TABLE "comms_channels" DROP COLUMN IF EXISTS "anon_for_character_id";
  `)
}
