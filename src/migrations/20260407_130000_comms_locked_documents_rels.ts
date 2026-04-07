import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "comms_channels_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "comms_messages_id" integer;

    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_comms_channels_fk";
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comms_channels_fk" FOREIGN KEY ("comms_channels_id") REFERENCES "comms_channels"("id") ON DELETE CASCADE;

    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_comms_messages_fk";
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comms_messages_fk" FOREIGN KEY ("comms_messages_id") REFERENCES "comms_messages"("id") ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_comms_channels_id_idx" ON "payload_locked_documents_rels" ("comms_channels_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_comms_messages_id_idx" ON "payload_locked_documents_rels" ("comms_messages_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_comms_channels_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_comms_messages_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_comms_channels_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_comms_messages_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "comms_channels_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "comms_messages_id";
  `)
}
