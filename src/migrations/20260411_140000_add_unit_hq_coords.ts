import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		ALTER TABLE "units"
		ADD COLUMN IF NOT EXISTS "hq_x" numeric;
	`);
	await db.execute(sql`
		ALTER TABLE "units"
		ADD COLUMN IF NOT EXISTS "hq_z" numeric;
	`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.execute(sql`ALTER TABLE "units" DROP COLUMN IF EXISTS "hq_z";`);
	await db.execute(sql`ALTER TABLE "units" DROP COLUMN IF EXISTS "hq_x";`);
}
