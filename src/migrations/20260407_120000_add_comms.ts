import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "enum_comms_channels_type" AS ENUM ('faction', 'unit', 'dm', 'group');

    CREATE TABLE "comms_channels" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "type" "enum_comms_channels_type" NOT NULL,
      "faction_ref" varchar,
      "unit_ref_id" numeric,
      "members" jsonb,
      "created_by_character_id" numeric,
      "last_message_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX "comms_channels_type_idx" ON "comms_channels" USING btree ("type");
    CREATE INDEX "comms_channels_last_msg_idx" ON "comms_channels" USING btree ("last_message_at");
    CREATE INDEX "comms_channels_created_at_idx" ON "comms_channels" USING btree ("created_at");
    CREATE INDEX "comms_channels_updated_at_idx" ON "comms_channels" USING btree ("updated_at");

    CREATE TABLE "comms_messages" (
      "id" serial PRIMARY KEY NOT NULL,
      "channel_id" numeric NOT NULL,
      "sender_character_id" numeric NOT NULL,
      "sender_discord_id" varchar,
      "is_anonymous" boolean DEFAULT false,
      "body" varchar,
      "attachments" jsonb,
      "edited_at" timestamp(3) with time zone,
      "deleted_at" timestamp(3) with time zone,
      "deleted_by" varchar,
      "sender_ip" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX "comms_messages_channel_id_idx" ON "comms_messages" USING btree ("channel_id");
    CREATE INDEX "comms_messages_sender_character_id_idx" ON "comms_messages" USING btree ("sender_character_id");
    CREATE INDEX "comms_messages_sender_discord_id_idx" ON "comms_messages" USING btree ("sender_discord_id");
    CREATE INDEX "comms_messages_channel_created_idx" ON "comms_messages" USING btree ("channel_id", "created_at" DESC);
    CREATE INDEX "comms_messages_created_at_idx" ON "comms_messages" USING btree ("created_at");
    CREATE INDEX "comms_messages_updated_at_idx" ON "comms_messages" USING btree ("updated_at");

    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "comms_disclaimer_accepted_at" timestamp(3) with time zone;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "comms_banned" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "comms_messages";
    DROP TABLE IF EXISTS "comms_channels";
    DROP TYPE IF EXISTS "enum_comms_channels_type";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "comms_disclaimer_accepted_at";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "comms_banned";
  `)
}
