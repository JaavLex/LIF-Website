import type { CollectionConfig } from 'payload';

export const BankHistory: CollectionConfig = {
	slug: 'bank-history',
	labels: { singular: 'Historique Bancaire', plural: 'Historiques Bancaires' },
	admin: {
		useAsTitle: 'id',
		defaultColumns: ['character', 'amount', 'source', 'createdAt'],
	},
	access: {
		read: () => true,
		create: () => true,
		update: () => false,
		delete: () => true,
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
