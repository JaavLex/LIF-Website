import type { CollectionConfig } from 'payload';

/**
 * comms-messages collection.
 *
 * Schema kept intentionally simple. Attachments are stored as a JSON array
 * to avoid Payload's array sub-table generation. All access flows through
 * the custom /api/comms routes; the Payload admin UI is admin-only and
 * read-only for safety.
 */
export const CommsMessages: CollectionConfig = {
	slug: 'comms-messages',
	admin: {
		useAsTitle: 'id',
		defaultColumns: ['channelId', 'senderCharacterId', 'createdAt'],
		group: 'Comms',
	},
	access: {
		read: ({ req }) => req.user?.role === 'admin',
		create: ({ req }) => req.user?.role === 'admin',
		update: ({ req }) => req.user?.role === 'admin',
		delete: ({ req }) => req.user?.role === 'admin',
	},
	fields: [
		{ name: 'channelId', type: 'number', required: true, index: true },
		{ name: 'senderCharacterId', type: 'number', required: true, index: true },
		{ name: 'senderDiscordId', type: 'text', index: true },
		{
			name: 'postedAsGm',
			type: 'checkbox',
			defaultValue: false,
			admin: {
				description: 'Écrit par un admin en mode MJ (impersonation NPC/cible). Flag d\'audit masqué aux non-admins.',
			},
		},
		{ name: 'isAnonymous', type: 'checkbox', defaultValue: false },
		{ name: 'body', type: 'textarea' },
		{
			name: 'attachments',
			type: 'json',
			admin: {
				description:
					'JSON array of { kind: "character"|"intel"|"media", refId: number, meta?: any }',
			},
		},
		{
			name: 'replyToMessageId',
			type: 'number',
			index: true,
			admin: { description: 'ID du message auquel celui-ci répond' },
		},
		{
			name: 'mentions',
			type: 'json',
			admin: {
				description: "Tableau JSON d'IDs de personnages mentionnés (@ping)",
			},
		},
		{ name: 'editedAt', type: 'date', admin: { readOnly: true } },
		{ name: 'deletedAt', type: 'date', admin: { readOnly: true } },
		{ name: 'deletedBy', type: 'text', admin: { readOnly: true } },
		{ name: 'senderIp', type: 'text', admin: { readOnly: true } },
	],
};
