import type { CollectionConfig } from 'payload';

export const Intelligence: CollectionConfig = {
	slug: 'intelligence',
	admin: {
		useAsTitle: 'title',
		defaultColumns: ['title', 'type', 'status', 'date', 'postedBy'],
		group: 'Roleplay',
	},
	access: {
		read: () => true,
		create: ({ req }) => !!req.user,
		update: ({ req }) => req.user?.role === 'admin',
		delete: ({ req }) => req.user?.role === 'admin',
	},
	fields: [
		{
			name: 'title',
			label: 'Titre',
			type: 'text',
			required: true,
		},
		{
			name: 'date',
			label: 'Date',
			type: 'date',
			required: true,
			admin: {
				date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
			},
		},
		{
			name: 'description',
			label: 'Description',
			type: 'richText',
			required: true,
		},
		{
			name: 'type',
			label: 'Type',
			type: 'select',
			required: true,
			options: [
				{ label: 'Observation', value: 'observation' },
				{ label: 'Interception', value: 'interception' },
				{ label: 'Reconnaissance', value: 'reconnaissance' },
				{ label: 'Infiltration', value: 'infiltration' },
				{ label: 'SIGINT', value: 'sigint' },
				{ label: 'HUMINT', value: 'humint' },
				{ label: 'Autre', value: 'other' },
			],
		},
		{
			name: 'coordinates',
			label: 'Coordonnées',
			type: 'text',
			admin: {
				description: 'Coordonnées géographiques (ex: 48.8566, 2.3522)',
			},
		},
		{
			name: 'media',
			label: 'Médias',
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
					name: 'caption',
					label: 'Légende',
					type: 'text',
				},
			],
		},
		{
			name: 'linkedTarget',
			label: 'Cible liée',
			type: 'relationship',
			relationTo: 'characters',
			admin: {
				description: 'Personnage cible lié à ce renseignement',
			},
		},
		{
			name: 'linkedFaction',
			label: 'Faction liée',
			type: 'relationship',
			relationTo: 'factions',
		},
		{
			name: 'postedBy',
			label: 'Rapporté par',
			type: 'relationship',
			relationTo: 'characters',
			admin: {
				description: 'Personnage qui a posté ce renseignement',
			},
		},
		{
			name: 'postedByDiscordId',
			label: 'Discord ID du rapporteur',
			type: 'text',
			admin: {
				readOnly: true,
				position: 'sidebar',
			},
		},
		{
			name: 'postedByDiscordUsername',
			label: 'Discord Username du rapporteur',
			type: 'text',
			admin: {
				readOnly: true,
				position: 'sidebar',
			},
		},
		// Admin-only fields
		{
			name: 'status',
			label: 'Statut (Admin)',
			type: 'select',
			defaultValue: 'to-investigate',
			options: [
				{ label: 'À vérifier', value: 'to-investigate' },
				{ label: 'Vérifié', value: 'verified' },
				{ label: 'Fausse information', value: 'false-info' },
				{ label: 'Non concluant', value: 'inconclusive' },
			],
			access: {
				update: ({ req }) => req.user?.role === 'admin',
			},
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'classification',
			label: 'Classification',
			type: 'select',
			defaultValue: 'restricted',
			options: [
				{ label: 'Public', value: 'public' },
				{ label: 'Restreint', value: 'restricted' },
				{ label: 'Classifié', value: 'classified' },
			],
			admin: {
				position: 'sidebar',
			},
		},
	],
};
