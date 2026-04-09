// ============================================
// Shared label maps and constants
// Keep all user-facing labels here to avoid duplication.
// ============================================

// --- Public base URL ---
//
// Use this for any link that ends up in front of a user OUTSIDE the Next.js
// process (Discord embeds, emails, game mod dialogs, etc.). Resolution order:
//
//   1. NEXT_PUBLIC_BASE_URL — the authoritative public domain injected by
//      Ansible (e.g. "https://lif-arma.com" on prod, "https://dev.lif-arma.com"
//      on dev). Always set in deployed environments.
//   2. NEXT_PUBLIC_SITE_URL — legacy name, kept for backward compatibility.
//   3. Hardcoded "https://lif-arma.com" — last-resort fallback.
//
// DO NOT fall back to process.env.SITE_URL here: in production that variable
// is set to http://127.0.0.1:3001 for server-side health-checks / internal
// fetches and must never be used for user-facing links. Historically that
// fallback leaked into Discord notifications and rendered them useless
// (v1.6.41 fixed the bot slash commands; v1.6.54 finishes the job for all
// notification builders via this shared constant).
export const PUBLIC_BASE_URL =
	process.env.NEXT_PUBLIC_BASE_URL ||
	process.env.NEXT_PUBLIC_SITE_URL ||
	'https://lif-arma.com';

// --- Moderation ---

export const MODERATION_REASON_LABELS: Record<string, string> = {
	'joueur-problematique': 'Joueur problématique',
	surveillance: 'Surveillance',
	'comportement-a-verifier': 'Comportement à vérifier',
	'potentiel-staff': 'Potentiel helper/modérateur',
	autre: 'Autre',
};

export const MODERATION_STATUS_LABELS: Record<string, string> = {
	open: 'Ouvert',
	pending: 'En attente',
	resolved: 'Résolu',
	archived: 'Archivé',
};

export const MODERATION_EVENT_TYPE_LABELS: Record<string, string> = {
	message: 'Commentaire',
	evidence: 'Preuve',
	'moderation-action': 'Action',
	'auto-escalation': 'Escalade auto',
	'case-reopened': 'Réouverture',
	'case-archived': 'Archivage',
	'status-change': 'Statut',
	'transcript-linked': 'Transcript',
	'positive-event': 'Positif',
	'negative-event': 'Négatif',
	system: 'Système',
};

export const SANCTION_LABELS: Record<string, string> = {
	warn: 'Warn',
	kick: 'Kick',
	'temp-ban': 'Ban temp.',
	'perm-ban': 'Ban déf.',
};

export const SANCTION_LABELS_LONG: Record<string, string> = {
	warn: 'Avertissement',
	kick: 'Expulsion',
	'temp-ban': 'Ban temporaire',
	'perm-ban': 'Ban définitif',
};

// --- Character statuses ---

export const CHARACTER_STATUS_LABELS: Record<string, string> = {
	'in-service': 'En service',
	kia: 'Tué au combat (KIA)',
	mia: 'Porté disparu (MIA)',
	retired: 'Retraité',
	'honourable-discharge': 'Décharge honorable',
	'dishonourable-discharge': 'Décharge déshonorante',
	executed: 'Exécuté',
};

export const CHARACTER_STATUS_COLORS: Record<string, string> = {
	'in-service': 'var(--accent)',
	kia: '#8b0000',
	mia: '#b8860b',
	retired: '#4682b4',
	'honourable-discharge': '#4682b4',
	'dishonourable-discharge': '#8b4513',
	executed: '#2f0000',
};

// Discord embed colors (numeric for Discord API)
export const CHARACTER_STATUS_EMBED_COLORS: Record<string, number> = {
	'in-service': 0x4a7c23,
	kia: 0x8b0000,
	mia: 0xb8860b,
	retired: 0x4682b4,
	executed: 0x2f0000,
};

// --- Intelligence ---

export const INTELLIGENCE_TYPE_LABELS: Record<string, string> = {
	observation: 'Observation',
	interception: 'Interception',
	reconnaissance: 'Reconnaissance',
	infiltration: 'Infiltration',
	sigint: 'SIGINT',
	humint: 'HUMINT',
	other: 'Autre',
};

export const INTELLIGENCE_CLASSIFICATION_LABELS: Record<string, string> = {
	public: 'Public',
	restricted: 'Restreint',
	classified: 'Classifié',
	'top-secret': 'Top Secret',
};

// --- Timeline ---

export const TIMELINE_TYPE_LABELS: Record<string, string> = {
	promotion: 'Promotion',
	mutation: 'Mutation',
	blessure: 'Blessure',
	medaille: 'Médaille',
	sanction: 'Sanction',
	autre: 'Autre',
};

export const TIMELINE_EMOJIS: Record<string, string> = {
	promotion: '⬆️',
	mutation: '🔄',
	blessure: '🩹',
	medaille: '🎖️',
	sanction: '⚠️',
	autre: '📝',
};

// --- Formatting ---

/** Format a duration in seconds to a short French string */
export function formatDuration(seconds: number): string {
	if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
	return `${Math.floor(seconds / 86400)}j`;
}

/** Format a duration in seconds to a longer French string */
export function formatDurationLong(seconds: number): string {
	if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)} heures`;
	return `${Math.floor(seconds / 86400)} jours`;
}

// --- Lexical rich text utilities ---

/** Convert Lexical JSON to plain text for display/editing */
export function lexicalToText(content: unknown): string {
	if (!content) return '';
	if (typeof content === 'string') return content;
	const root = (content as { root?: { children?: { children?: { text?: string }[] }[] } })
		.root;
	if (!root?.children) return '';
	return root.children
		.map((node) => {
			if (node.children) {
				return node.children.map((child) => child.text || '').join('');
			}
			return '';
		})
		.join('\n');
}

/** Convert plain text to Lexical JSON for Payload richText fields */
/**
 * Serialize Payload CMS data for passing to client components.
 * Strips non-serializable properties (class instances, functions, etc.)
 * This replaces the JSON.parse(JSON.stringify(data)) pattern.
 *
 * Returns `any` intentionally — this is a serialization boundary between
 * server (Payload types) and client (component prop types).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serialize(data: any): any {
	return JSON.parse(JSON.stringify(data));
}

export function textToLexical(text: string) {
	if (!text || !text.trim()) return undefined;
	const paragraphs = text.split('\n');
	return {
		root: {
			type: 'root',
			children: paragraphs.map((p) => ({
				type: 'paragraph',
				children: p.trim()
					? [
							{
								type: 'text',
								text: p,
								mode: 'normal',
								detail: 0,
								format: 0,
								style: '',
								version: 1,
							},
						]
					: [],
				direction: 'ltr',
				format: '',
				indent: 0,
				version: 1,
				textFormat: 0,
				textStyle: '',
			})),
			direction: 'ltr',
			format: '',
			indent: 0,
			version: 1,
		},
	};
}
