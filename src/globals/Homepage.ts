import type { GlobalConfig } from 'payload';

export const Homepage: GlobalConfig = {
	slug: 'homepage',
	label: "Page d'accueil",
	access: {
		read: () => true,
	},
	fields: [
		{
			type: 'tabs',
			tabs: [
				{
					label: 'Identité visuelle',
					fields: [
						{
							name: 'logo',
							label: 'Logo de la communauté',
							type: 'upload',
							relationTo: 'media',
							admin: {
								description:
									'Logo affiché dans la navbar et au-dessus du titre principal',
							},
						},
						{
							name: 'heroBackground',
							label: 'Image de fond Hero',
							type: 'upload',
							relationTo: 'media',
							admin: {
								description: 'Image de fond pour la section principale (hero)',
							},
						},
					],
				},
				{
					label: 'Hero',
					fields: [
						{
							name: 'heroTitle',
							label: 'Titre principal',
							type: 'text',
							defaultValue: 'Légion Internationale Francophone',
							required: true,
						},
						{
							name: 'heroTitleAccent',
							label: 'Mot accentué (doré)',
							type: 'text',
							defaultValue: 'Légion',
							admin: {
								description: 'Ce mot apparaîtra en doré dans le titre',
							},
						},
						{
							name: 'heroSubtitle',
							label: 'Sous-titre',
							type: 'text',
							defaultValue: 'Communauté francophone sur Arma Reforger',
						},
						{
							name: 'heroDescription',
							label: 'Description',
							type: 'textarea',
							defaultValue:
								'Rejoignez notre communauté de joueurs passionnés et vivez des opérations militaires immersives sur nos deux serveurs dédiés.',
						},
						{
							name: 'heroPrimaryButtonText',
							label: 'Texte bouton principal',
							type: 'text',
							defaultValue: 'Rejoindre le Discord',
						},
						{
							name: 'heroPrimaryButtonUrl',
							label: 'URL bouton principal',
							type: 'text',
							defaultValue: 'https://discord.gg/votre-discord',
						},
						{
							name: 'heroSecondaryButtonText',
							label: 'Texte bouton secondaire',
							type: 'text',
							defaultValue: 'Nos Serveurs',
						},
						{
							name: 'heroSecondaryButtonUrl',
							label: 'URL bouton secondaire',
							type: 'text',
							defaultValue: '/#serveurs',
						},
					],
				},
				{
					label: 'Serveurs',
					fields: [
						{
							name: 'serversTitle',
							label: 'Titre de la section',
							type: 'text',
							defaultValue: 'Nos Serveurs',
						},
						{
							name: 'serversIcon',
							label: 'Icône Lucide',
							type: 'text',
							defaultValue: 'Swords',
							admin: {
								description: "Nom de l'icône Lucide (ex: Swords, Server, Gamepad2)",
							},
						},
						{
							name: 'servers',
							label: 'Liste des serveurs',
							type: 'array',
							minRows: 1,
							maxRows: 4,
							fields: [
								{
									name: 'name',
									label: 'Nom du serveur',
									type: 'text',
									required: true,
								},
								{
									name: 'mode',
									label: 'Mode de jeu',
									type: 'text',
									required: true,
								},
								{
									name: 'description',
									label: 'Description',
									type: 'textarea',
								},
								{
									name: 'maxPlayers',
									label: 'Joueurs max',
									type: 'number',
									defaultValue: 64,
								},
								{
									name: 'map',
									label: 'Carte',
									type: 'text',
									defaultValue: 'Everon',
								},
								{
									name: 'ip',
									label: 'Adresse IP',
									type: 'text',
									admin: {
										description: 'Adresse IP du serveur (ex: 51.75.68.111)',
									},
								},
								{
									name: 'gamePort',
									label: 'Port de jeu',
									type: 'number',
									defaultValue: 2001,
									admin: {
										description: 'Port de connexion au jeu',
									},
								},
								{
									name: 'queryPort',
									label: 'Port A2S (Query)',
									type: 'number',
									defaultValue: 17777,
									admin: {
										description:
											'Port pour interroger le serveur (Steam Query / A2S). Généralement gamePort + 1 ou un port dédié.',
									},
								},
								{
									name: 'isOnline',
									label: 'En ligne (manuel)',
									type: 'checkbox',
									defaultValue: true,
									admin: {
										description: 'Statut manuel si la requête A2S échoue',
									},
								},
							],
						},
					],
				},
				{
					label: 'Fonctionnalités',
					fields: [
						{
							name: 'featuresTitle',
							label: 'Titre de la section',
							type: 'text',
							defaultValue: 'Pourquoi nous rejoindre ?',
						},
						{
							name: 'featuresIcon',
							label: 'Icône Lucide de section',
							type: 'text',
							defaultValue: 'Star',
							admin: {
								description:
									"Nom de l'icône Lucide pour le titre (ex: Star, Award, Sparkles)",
							},
						},
						{
							name: 'features',
							label: 'Liste des fonctionnalités',
							type: 'array',
							minRows: 1,
							maxRows: 6,
							fields: [
								{
									name: 'icon',
									label: 'Icône Lucide',
									type: 'text',
									required: true,
									admin: {
										description:
											"Nom de l'icône Lucide (ex: Medal, Target, ClipboardList, Shield, Users, Gamepad2)",
									},
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
									type: 'textarea',
									required: true,
								},
							],
						},
					],
				},
				{
					label: 'Actualités',
					fields: [
						{
							name: 'newsTitle',
							label: 'Titre de la section',
							type: 'text',
							defaultValue: 'Actualités',
						},
						{
							name: 'newsIcon',
							label: 'Icône Lucide',
							type: 'text',
							defaultValue: 'Newspaper',
							admin: {
								description:
									"Nom de l'icône Lucide (ex: Newspaper, Bell, Megaphone)",
							},
						},
					],
				},
				{
					label: "Appel à l'action",
					fields: [
						{
							name: 'ctaTitle',
							label: 'Titre',
							type: 'text',
							defaultValue: 'Prêt à rejoindre les rangs ?',
						},
						{
							name: 'ctaDescription',
							label: 'Description',
							type: 'textarea',
							defaultValue:
								"Rejoignez notre Discord pour commencer l'aventure avec la Légion Internationale Francophone.",
						},
						{
							name: 'ctaButtonText',
							label: 'Texte du bouton',
							type: 'text',
							defaultValue: 'Rejoindre la LIF',
						},
						{
							name: 'ctaButtonUrl',
							label: 'URL du bouton',
							type: 'text',
							defaultValue: 'https://discord.gg/votre-discord',
						},
					],
				},
				{
					label: 'Liens sociaux',
					fields: [
						{
							name: 'discordUrl',
							label: 'URL Discord',
							type: 'text',
							defaultValue: 'https://discord.gg/votre-discord',
						},
						{
							name: 'youtubeUrl',
							label: 'URL YouTube',
							type: 'text',
						},
						{
							name: 'twitterUrl',
							label: 'URL Twitter/X',
							type: 'text',
						},
					],
				},
			],
		},
	],
};
