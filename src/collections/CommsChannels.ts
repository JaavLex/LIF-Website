import type { CollectionConfig } from 'payload';

/**
 * comms-channels collection.
 *
 * Schema kept intentionally simple (no Payload relationships) so the SQL
 * schema is predictable and easy to migrate manually. Member lists are
 * stored as JSON arrays of character IDs and joined client-side / in API
 * routes.
 */
export const CommsChannels: CollectionConfig = {
	slug: 'comms-channels',
	admin: {
		useAsTitle: 'name',
		defaultColumns: ['name', 'type', 'lastMessageAt'],
		group: 'Comms',
	},
	access: {
		read: ({ req }) => req.user?.role === 'admin',
		create: ({ req }) => req.user?.role === 'admin',
		update: ({ req }) => req.user?.role === 'admin',
		delete: ({ req }) => req.user?.role === 'admin',
	},
	fields: [
		{ name: 'name', label: 'Nom', type: 'text', required: true },
		{
			name: 'type',
			label: 'Type',
			type: 'select',
			required: true,
			options: [
				{ label: 'Faction', value: 'faction' },
				{ label: 'Unité', value: 'unit' },
				{ label: 'Message direct', value: 'dm' },
				{ label: 'Groupe', value: 'group' },
			],
		},
		{ name: 'factionRef', label: 'Faction', type: 'text' },
		{ name: 'unitRefId', label: 'Unité (ID)', type: 'number' },
		{
			name: 'members',
			label: 'Membres (IDs)',
			type: 'json',
			admin: { description: 'Tableau JSON des IDs de personnages' },
		},
		{ name: 'createdByCharacterId', type: 'number' },
		{ name: 'lastMessageAt', type: 'date', admin: { readOnly: true } },
	],
};
