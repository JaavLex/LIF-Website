import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "characters" ADD COLUMN "bi_id" varchar;
  ALTER TABLE "characters" ADD COLUMN "saved_money" numeric;
  ALTER TABLE "characters" ADD COLUMN "last_money_sync_at" timestamp(3) with time zone;
  CREATE UNIQUE INDEX "characters_bi_id_idx" ON "characters" USING btree ("bi_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "characters_bi_id_idx";
  ALTER TABLE "characters" DROP COLUMN "bi_id";
  ALTER TABLE "characters" DROP COLUMN "saved_money";
  ALTER TABLE "characters" DROP COLUMN "last_money_sync_at";`)
}
