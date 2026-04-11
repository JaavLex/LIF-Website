import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
   ALTER TABLE "roleplay" ADD COLUMN IF NOT EXISTS "public_player_positions" boolean DEFAULT false;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`
   ALTER TABLE "roleplay" DROP COLUMN IF EXISTS "public_player_positions";`);
}
