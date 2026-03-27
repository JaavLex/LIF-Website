import type { CollectionConfig } from 'payload';

export const CharacterTimeline: CollectionConfig = {
	slug: 'character-timeline',
	admin: {
		useAsTitle: 'title',
		defaultColumns: ['character', 'type', 'title', 'date'],
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
			name: 'character',
			label: 'Personnage',
			type: 'relationship',
			relationTo: 'characters',
			required: true,
			index: true,
		},
		{
			name: 'type',
			label: 'Type d\'événement',
			type: 'select',
			required: true,
			options: [
				{ label: 'Promotion', value: 'promotion' },
				{ label: 'Mutation', value: 'mutation' },
				{ label: 'Blessure', value: 'wound' },
				{ label: 'Mission', value: 'mission' },
				{ label: 'Disciplinaire', value: 'disciplinary' },
				{ label: 'Médaille / Décoration', value: 'medal' },
				{ label: 'Formation', value: 'training' },
				{ label: 'Autre', value: 'other' },
			],
		},
		{
			name: 'title',
			label: 'Titre',
			type: 'text',
			required: true,
		},
		{
			name: 'description',
			label: 'Description',
			type: 'richText',
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
			name: 'image',
			label: 'Image',
			type: 'upload',
			relationTo: 'media',
		},
		{
			name: 'classification',
			label: 'Classification',
			type: 'select',
			defaultValue: 'public',
			options: [
				{ label: 'Public', value: 'public' },
				{ label: 'Confidentiel', value: 'confidential' },
				{ label: 'Secret', value: 'secret' },
			],
			admin: {
				position: 'sidebar',
			},
		},
	],
};
