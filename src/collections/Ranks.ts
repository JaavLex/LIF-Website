import type { CollectionConfig } from 'payload';

export const Ranks: CollectionConfig = {
	slug: 'ranks',
	admin: {
		useAsTitle: 'name',
		defaultColumns: ['name', 'abbreviation', 'order', 'discordRoleId'],
		group: 'Roleplay',
	},
	access: {
		read: () => true,
	},
	fields: [
		{
			name: 'name',
			label: 'Nom du grade',
			type: 'text',
			required: true,
		},
		{
			name: 'abbreviation',
			label: 'Abréviation',
			type: 'text',
			required: true,
			admin: {
				description: 'Ex: Sdt, Cpl, Sgt, Adj, Lt, Cpt, Cdt, Col, Gén',
			},
		},
		{
			name: 'order',
			label: 'Ordre hiérarchique',
			type: 'number',
			required: true,
			defaultValue: 0,
			admin: {
				description: 'Plus le nombre est élevé, plus le grade est haut',
			},
		},
		{
			name: 'discordRoleId',
			label: 'ID du rôle Discord',
			type: 'text',
			admin: {
				description: 'ID du rôle Discord correspondant à ce grade',
			},
		},
		{
			name: 'icon',
			label: 'Icône du grade',
			type: 'upload',
			relationTo: 'media',
		},
		{
			name: 'color',
			label: 'Couleur',
			type: 'text',
			defaultValue: '#c9a227',
			admin: {
				description: "Couleur hex pour l'affichage (ex: #c9a227)",
			},
		},
	],
};
