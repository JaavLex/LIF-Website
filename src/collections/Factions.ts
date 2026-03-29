import type { CollectionConfig } from 'payload';

export const Factions: CollectionConfig = {
	slug: 'factions',
	admin: {
		useAsTitle: 'name',
		defaultColumns: ['name', 'type', 'updatedAt'],
		group: 'Roleplay',
	},
	access: {
		read: () => true,
		create: ({ req }) => req.user?.role === 'admin',
		update: ({ req }) => req.user?.role === 'admin',
		delete: ({ req }) => req.user?.role === 'admin',
	},
	fields: [
		{
			name: 'name',
			label: 'Nom de la faction',
			type: 'text',
			required: true,
		},
		{
			name: 'slug',
			label: 'Slug',
			type: 'text',
			required: true,
			unique: true,
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'type',
			label: 'Type',
			type: 'select',
			options: [
				{ label: 'Alliée', value: 'allied' },
				{ label: 'Neutre', value: 'neutral' },
				{ label: 'Hostile', value: 'hostile' },
			],
			defaultValue: 'neutral',
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'description',
			label: 'Description',
			type: 'richText',
		},
		{
			name: 'logo',
			label: 'Logo',
			type: 'upload',
			relationTo: 'media',
		},
		{
			name: 'color',
			label: 'Couleur',
			type: 'text',
			defaultValue: '#8b9a7d',
			admin: {
				position: 'sidebar',
				description: "Couleur hex pour l'affichage",
			},
		},
	],
};
