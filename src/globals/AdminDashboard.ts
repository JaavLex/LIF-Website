import type { GlobalConfig } from 'payload';

const defaultLinks = [
	{
		title: 'Métriques',
		description: 'Surveillance et performances des serveurs',
		url: 'https://monitor.lif-arma.com',
		icon: '📊',
		color: '#4a7c23',
	},
	{
		title: 'Base de données',
		description: 'Interface de gestion MongoDB',
		url: 'https://mongo.lif-arma.com',
		icon: '🗄️',
		color: '#13aa52',
	},
	{
		title: 'Panel Serveurs',
		description: 'Tableau de bord des serveurs de jeu',
		url: 'https://panel.lif-arma.com',
		icon: '🖥️',
		color: '#5865F2',
	},
];

export const AdminDashboard: GlobalConfig = {
	slug: 'admin-dashboard',
	label: 'Dashboard Admin',
	access: {
		read: () => true,
	},
	fields: [
		{
			name: 'links',
			label: 'Liens rapides',
			type: 'array',
			admin: {
				description:
					'Ajoutez des cartes de lien affichées sous le dashboard admin. Utilisez le bouton pour ajouter un nouveau lien.',
			},
			defaultValue: defaultLinks,
			fields: [
				{
					name: 'title',
					label: 'Titre',
					type: 'text',
					required: true,
				},
				{
					name: 'description',
					label: 'Description',
					type: 'text',
					required: true,
				},
				{
					name: 'url',
					label: 'URL',
					type: 'text',
					required: true,
					admin: {
						description: 'Ex: https://monitor.lif-arma.com',
					},
				},
				{
					name: 'icon',
					label: 'Icône',
					type: 'text',
					required: true,
					defaultValue: '🔗',
					admin: {
						description: 'Emoji ou texte court (ex: 📊, 🖥️, DB)',
					},
				},
				{
					name: 'color',
					label: 'Couleur (hex)',
					type: 'text',
					required: true,
					defaultValue: '#4a7c23',
					admin: {
						description: 'Format hexadécimal, ex: #4a7c23',
					},
					validate: value => {
						if (!value) return 'La couleur est requise';
						return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(value)
							? true
							: 'Utilisez un code hex valide (ex: #4a7c23)';
					},
				},
			],
		},
	],
};
