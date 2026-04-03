import type { CollectionConfig } from 'payload';

export const ModerationEvents: CollectionConfig = {
	slug: 'moderation-events',
	labels: {
		singular: 'Événement de modération',
		plural: 'Événements de modération',
	},
	admin: {
		useAsTitle: 'type',
		group: 'Modération',
		defaultColumns: ['case', 'type', 'authorDiscordUsername', 'createdAt'],
	},
	access: {
		read: ({ req }) => req.user?.role === 'admin',
		create: ({ req }) => req.user?.role === 'admin',
		update: () => false,
		delete: ({ req }) => req.user?.role === 'admin',
	},
	fields: [
		{
			name: 'case',
			label: 'Dossier',
			type: 'relationship',
			relationTo: 'moderation-cases',
			required: true,
			index: true,
		},
		{
			name: 'type',
			label: "Type d'événement",
			type: 'select',
			required: true,
			options: [
				{ label: 'Message staff', value: 'message' },
				{ label: 'Preuve ajoutée', value: 'evidence' },
				{ label: 'Action de modération', value: 'moderation-action' },
				{ label: 'Escalade automatique', value: 'auto-escalation' },
				{ label: 'Dossier réouvert', value: 'case-reopened' },
				{ label: 'Dossier archivé', value: 'case-archived' },
				{ label: 'Statut modifié', value: 'status-change' },
				{ label: 'Transcript lié', value: 'transcript-linked' },
				{ label: 'Événement positif', value: 'positive-event' },
				{ label: 'Événement négatif', value: 'negative-event' },
				{ label: 'Événement système', value: 'system' },
			],
		},
		{
			name: 'content',
			label: 'Contenu',
			type: 'textarea',
		},
		{
			name: 'authorDiscordId',
			label: 'Discord ID auteur',
			type: 'text',
			required: true,
		},
		{
			name: 'authorDiscordUsername',
			label: 'Nom Discord auteur',
			type: 'text',
			required: true,
		},
		{
			name: 'authorDiscordAvatar',
			label: 'Avatar Discord auteur',
			type: 'text',
		},
		// For moderation-action events
		{
			name: 'actionType',
			label: "Type d'action",
			type: 'select',
			options: [
				{ label: 'Avertissement', value: 'warn' },
				{ label: 'Expulsion', value: 'kick' },
				{ label: 'Bannissement temporaire', value: 'temp-ban' },
				{ label: 'Bannissement définitif', value: 'perm-ban' },
			],
			admin: {
				condition: (data, siblingData) =>
					siblingData?.type === 'moderation-action' ||
					siblingData?.type === 'auto-escalation',
			},
		},
		{
			name: 'actionReason',
			label: "Raison de l'action",
			type: 'textarea',
			admin: {
				condition: (data, siblingData) =>
					siblingData?.type === 'moderation-action' ||
					siblingData?.type === 'auto-escalation',
			},
		},
		{
			name: 'actionDuration',
			label: 'Durée (secondes)',
			type: 'number',
			admin: {
				condition: (data, siblingData) =>
					siblingData?.type === 'moderation-action' ||
					siblingData?.type === 'auto-escalation',
			},
		},
		{
			name: 'warnCountAfter',
			label: "Nombre d'avertissements après action",
			type: 'number',
			admin: {
				condition: (data, siblingData) =>
					siblingData?.type === 'moderation-action' ||
					siblingData?.type === 'auto-escalation',
			},
		},
		{
			name: 'discordSyncStatus',
			label: 'Statut sync Discord',
			type: 'select',
			options: [
				{ label: 'Succès', value: 'success' },
				{ label: 'Échec', value: 'failed' },
				{ label: 'Non applicable', value: 'na' },
			],
			defaultValue: 'na',
		},
		{
			name: 'discordSyncError',
			label: 'Erreur sync Discord',
			type: 'text',
		},
		// For transcript links
		{
			name: 'transcriptUrl',
			label: 'URL du transcript',
			type: 'text',
			admin: {
				condition: (data, siblingData) => siblingData?.type === 'transcript-linked',
			},
		},
		{
			name: 'transcriptName',
			label: 'Nom du transcript',
			type: 'text',
			admin: {
				condition: (data, siblingData) => siblingData?.type === 'transcript-linked',
			},
		},
		// Attachments
		{
			name: 'attachments',
			label: 'Pièces jointes',
			type: 'array',
			fields: [
				{
					name: 'file',
					label: 'Fichier',
					type: 'upload',
					relationTo: 'media',
					required: true,
				},
				{
					name: 'description',
					label: 'Description',
					type: 'text',
				},
			],
		},
	],
	timestamps: true,
};
