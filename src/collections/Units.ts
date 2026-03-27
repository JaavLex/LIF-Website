import type { CollectionConfig } from 'payload';

export const Units: CollectionConfig = {
	slug: 'units',
	admin: {
		useAsTitle: 'name',
		defaultColumns: ['name', 'commander', 'updatedAt'],
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
			label: "Nom de l'unité",
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
			name: 'description',
			label: 'Description',
			type: 'richText',
		},
		{
			name: 'insignia',
			label: 'Insigne',
			type: 'upload',
			relationTo: 'media',
		},
		{
			name: 'commander',
			label: 'Commandant',
			type: 'relationship',
			relationTo: 'characters',
		},
		{
			name: 'parentUnit',
			label: 'Unité parente',
			type: 'relationship',
			relationTo: 'units',
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'color',
			label: 'Couleur',
			type: 'text',
			defaultValue: '#4a7c23',
			admin: {
				position: 'sidebar',
				description: "Couleur hex pour l'affichage",
			},
		},
	],
};
