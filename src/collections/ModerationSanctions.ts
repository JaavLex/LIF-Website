import type { CollectionConfig } from 'payload';

export const ModerationSanctions: CollectionConfig = {
	slug: 'moderation-sanctions',
	labels: { singular: 'Sanction', plural: 'Sanctions' },
	admin: {
		useAsTitle: 'type',
		group: 'Modération',
		defaultColumns: ['targetDiscordUsername', 'type', 'reason', 'createdAt'],
	},
	access: {
		read: () => true,
		create: () => true,
		update: () => true,
		delete: () => true,
	},
	fields: [
		{
			name: 'targetDiscordId',
			label: 'Discord ID de la cible',
			type: 'text',
			required: true,
			index: true,
		},
		{
			name: 'targetDiscordUsername',
			label: 'Nom Discord de la cible',
			type: 'text',
			required: true,
		},
		{
			name: 'type',
			label: 'Type de sanction',
			type: 'select',
			required: true,
			options: [
				{ label: 'Avertissement', value: 'warn' },
				{ label: 'Expulsion', value: 'kick' },
				{ label: 'Bannissement temporaire', value: 'temp-ban' },
				{ label: 'Bannissement définitif', value: 'perm-ban' },
			],
		},
		{
			name: 'reason',
			label: 'Raison',
			type: 'textarea',
			required: true,
		},
		{
			name: 'duration',
			label: 'Durée (secondes)',
			type: 'number',
			admin: {
				description: 'Durée en secondes pour les bannissements temporaires',
			},
		},
		{
			name: 'case',
			label: 'Dossier associé',
			type: 'relationship',
			relationTo: 'moderation-cases',
			required: true,
			index: true,
		},
		{
			name: 'event',
			label: 'Événement associé',
			type: 'relationship',
			relationTo: 'moderation-events',
		},
		{
			name: 'moderatorDiscordId',
			label: 'Discord ID du modérateur',
			type: 'text',
			required: true,
		},
		{
			name: 'moderatorDiscordUsername',
			label: 'Nom Discord du modérateur',
			type: 'text',
			required: true,
		},
		{
			name: 'warnNumber',
			label: 'Numéro de warn (1-7)',
			type: 'number',
			admin: {
				description: 'Numéro séquentiel du warn pour cet utilisateur',
			},
		},
		{
			name: 'discordSyncStatus',
			label: 'Statut sync Discord',
			type: 'select',
			options: [
				{ label: 'Succès', value: 'success' },
				{ label: 'Échec', value: 'failed' },
				{ label: 'En attente', value: 'pending' },
			],
			defaultValue: 'pending',
		},
		{
			name: 'discordSyncError',
			label: 'Erreur sync Discord',
			type: 'text',
		},
	],
	timestamps: true,
};
