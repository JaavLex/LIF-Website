import type { CollectionConfig } from 'payload';

export const BankHistory: CollectionConfig = {
	slug: 'bank-history',
	labels: { singular: 'Historique Bancaire', plural: 'Historiques Bancaires' },
	admin: {
		useAsTitle: 'id',
		defaultColumns: ['character', 'amount', 'source', 'createdAt'],
	},
	access: {
		read: ({ req }) => req.user?.role === 'admin',
		create: ({ req }) => req.user?.role === 'admin',
		update: () => false,
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
			name: 'amount',
			label: 'Montant',
			type: 'number',
			required: true,
		},
		{
			name: 'previousAmount',
			label: 'Montant précédent',
			type: 'number',
		},
		{
			name: 'source',
			label: 'Source',
			type: 'select',
			required: true,
			options: [
				{ label: 'Synchronisation auto', value: 'auto-sync' },
				{ label: 'Sauvegarde manuelle', value: 'manual-save' },
				{ label: 'Restauration', value: 'restore' },
				{ label: 'Modification admin', value: 'admin-set' },
			],
		},
	],
	timestamps: true,
};
