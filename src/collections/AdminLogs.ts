import type { CollectionConfig } from 'payload';
import { isFullAdmin } from '@/lib/payload-access';

export const AdminLogs: CollectionConfig = {
	slug: 'admin-logs',
	labels: {
		singular: 'Journal admin',
		plural: 'Journaux admin',
	},
	admin: {
		hidden: true,
		defaultColumns: ['createdAt', 'actorDiscordUsername', 'action', 'summary'],
		useAsTitle: 'summary',
	},
	access: {
		read: ({ req }) => isFullAdmin(req),
		create: () => false,
		update: () => false,
		delete: ({ req }) => isFullAdmin(req),
	},
	fields: [
		// ── Actor (Discord session snapshot, denormalized) ──
		{ name: 'actorDiscordId', type: 'text', required: true, index: true },
		{ name: 'actorDiscordUsername', type: 'text', required: true },
		{ name: 'actorDiscordAvatar', type: 'text' },
		{ name: 'actorAdminLevel', type: 'text' },

		// ── Action ──
		{ name: 'action', type: 'text', required: true, index: true },
		{ name: 'summary', type: 'text', required: true },

		// ── Target entity (nullable for non-mutation events) ──
		{ name: 'entityType', type: 'text', index: true },
		{ name: 'entityId', type: 'text' },
		{ name: 'entityLabel', type: 'text' },

		// ── Diff (uniform shape) ──
		{ name: 'diff', type: 'json' },
		{ name: 'metadata', type: 'json' },

		// ── Request context ──
		{ name: 'ip', type: 'text' },
		{ name: 'userAgent', type: 'text' },
	],
	timestamps: true,
};
