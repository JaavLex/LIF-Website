import type { CollectionConfig } from 'payload';

export const MapPOI: CollectionConfig = {
	slug: 'map-poi',
	labels: { singular: "Point d'intérêt carte", plural: "Points d'intérêt carte" },
	admin: {
		useAsTitle: 'name',
		defaultColumns: ['name', 'type', 'createdAt'],
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
			label: 'Nom',
			type: 'text',
			required: true,
		},
		{
			name: 'type',
			label: 'Type',
			type: 'select',
			required: true,
			defaultValue: 'bar',
			options: [
				{ label: 'Bar / Pub', value: 'bar' },
				{ label: 'Magasin', value: 'shop' },
				{ label: 'Station-service', value: 'gas' },
			],
		},
		{
			name: 'description',
			label: 'Description',
			type: 'textarea',
		},
		{
			name: 'x',
			label: 'Position X (mètres)',
			type: 'number',
			required: true,
		},
		{
			name: 'z',
			label: 'Position Z (mètres)',
			type: 'number',
			required: true,
		},
	],
	timestamps: true,
};
