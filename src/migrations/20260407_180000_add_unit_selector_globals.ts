import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

/**
 * Add page-level configurable text fields for the unit selector page
 * (character creation step 01) and the « Faction principale » hero on
 * /roleplay section 02. Everything was hardcoded before this migration.
 *
 * All columns live on the singleton `roleplay` global table.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
	const cols: Array<{ name: string; default: string }> = [
		// Unit selector page (character creation step 01)
		{ name: 'unit_selector_eyebrow',     default: "SECTION 01 — CHOIX D'UNITÉ" },
		{ name: 'unit_selector_title_line1', default: 'CHOISISSEZ' },
		{ name: 'unit_selector_title_line2', default: 'VOTRE' },
		{ name: 'unit_selector_title_line3', default: 'ALLÉGEANCE.' },
		{
			name: 'unit_selector_brief',
			default:
				"Toute mobilisation au sein de la Légion commence par une affectation. Le choix que vous ferez ici ne pourra plus être modifié par vous-même : seul le commandement peut réaffecter un opérateur entre unités.",
		},
		{ name: 'unit_selector_warning', default: 'DÉCISION DÉFINITIVE — LISEZ AVANT DE SIGNER' },
		{ name: 'unit_selector_footer',  default: 'SIGNÉ // COMMANDEMENT' },
		{ name: 'unit_selector_rail_label', default: 'DOSSIER ENRÔLEMENT' },
		// Main faction hero
		{ name: 'main_faction_badge',             default: 'FACTION PRINCIPALE' },
		{ name: 'main_faction_subtitle_allied',   default: 'ALLIÉE · COMMANDEMENT LIF' },
		{ name: 'main_faction_subtitle_hostile',  default: 'HOSTILE' },
		{ name: 'main_faction_subtitle_neutral',  default: 'COMMANDEMENT LIF' },
		{ name: 'main_faction_cta',               default: 'Ouvrir le dossier' },
		{ name: 'main_units_strip_label',         default: 'FER DE LANCE' },
		{ name: 'main_units_card_eyebrow',        default: 'UNITÉ PRINCIPALE' },
	];

	for (const col of cols) {
		// Escape single quotes in the default value
		const safeDefault = col.default.replace(/'/g, "''");
		await db.execute(
			sql.raw(
				`ALTER TABLE "roleplay" ADD COLUMN IF NOT EXISTS "${col.name}" varchar DEFAULT '${safeDefault}';`,
			),
		);
	}
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	const cols = [
		'unit_selector_eyebrow',
		'unit_selector_title_line1',
		'unit_selector_title_line2',
		'unit_selector_title_line3',
		'unit_selector_brief',
		'unit_selector_warning',
		'unit_selector_footer',
		'unit_selector_rail_label',
		'main_faction_badge',
		'main_faction_subtitle_allied',
		'main_faction_subtitle_hostile',
		'main_faction_subtitle_neutral',
		'main_faction_cta',
		'main_units_strip_label',
		'main_units_card_eyebrow',
	];
	for (const col of cols) {
		await db.execute(sql.raw(`ALTER TABLE "roleplay" DROP COLUMN IF EXISTS "${col}";`));
	}
}
