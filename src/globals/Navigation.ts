import type { GlobalConfig } from 'payload';

export const Navigation: GlobalConfig = {
	slug: 'navigation',
	label: 'Navigation',
	access: {
		read: () => true,
	},
	fields: [
		{
			name: 'links',
			label: 'Liens de navigation',
			type: 'array',
			admin: {
				description: 'Gérez les liens affichés dans la barre de navigation',
			},
			fields: [
				{
					name: 'label',
					label: 'Texte du lien',
					type: 'text',
					required: true,
				},
				{
					name: 'type',
					label: 'Type de lien',
					type: 'select',
					defaultValue: 'internal',
					options: [
						{ label: 'Page interne', value: 'internal' },
						{ label: 'Lien externe', value: 'external' },
						{ label: 'Ancre (section)', value: 'anchor' },
					],
					required: true,
				},
				{
					name: 'page',
					label: 'Page',
					type: 'relationship',
					relationTo: 'pages',
					admin: {
						condition: (_, siblingData) => siblingData?.type === 'internal',
					},
				},
				{
					name: 'url',
					label: 'URL',
					type: 'text',
					admin: {
						condition: (_, siblingData) =>
							siblingData?.type === 'external' || siblingData?.type === 'anchor',
						description: 'URL complète pour externe, ou #section pour ancre',
					},
				},
				{
					name: 'openInNewTab',
					label: 'Ouvrir dans un nouvel onglet',
					type: 'checkbox',
					defaultValue: false,
					admin: {
						condition: (_, siblingData) => siblingData?.type === 'external',
					},
				},
				{
					name: 'isHighlighted',
					label: 'Mettre en évidence (style bouton)',
					type: 'checkbox',
					defaultValue: false,
					admin: {
						description: 'Affiche le lien comme un bouton (ex: Discord)',
					},
				},
			],
		},
		{
			name: 'discordUrl',
			label: 'URL Discord',
			type: 'text',
			admin: {
				description: 'URL du serveur Discord (utilisé pour le bouton Discord)',
			},
		},
	],
};
