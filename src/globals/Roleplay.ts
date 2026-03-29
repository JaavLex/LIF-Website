import type { GlobalConfig } from 'payload';

export const Roleplay: GlobalConfig = {
	slug: 'roleplay',
	label: 'Roleplay',
	access: {
		read: () => true,
	},
	fields: [
		{
			type: 'tabs',
			tabs: [
				{
					label: 'En-tête',
					fields: [
						{
							name: 'headerTitle',
							label: 'Titre principal',
							type: 'text',
							defaultValue: 'Dossiers du Personnel',
						},
						{
							name: 'headerSubtitle',
							label: 'Sous-titre',
							type: 'text',
							defaultValue: 'Base de données militaire — Accès autorisé',
						},
						{
							name: 'headerLogo',
							label: 'Logo',
							type: 'upload',
							relationTo: 'media',
						},
						{
							name: 'headerBackground',
							label: 'Image de fond',
							type: 'upload',
							relationTo: 'media',
						},
					],
				},
				{
					label: 'Lore',
					fields: [
						{
							name: 'isLoreVisible',
							label: 'Afficher la section Lore',
							type: 'checkbox',
							defaultValue: true,
						},
						{
							name: 'loreTitle',
							label: 'Titre de la section Lore',
							type: 'text',
							defaultValue: 'Histoire & Lore',
						},
						{
							name: 'loreSections',
							label: 'Sections du Lore',
							type: 'blocks',
							blocks: [
								{
									slug: 'loreText',
									labels: { singular: 'Texte', plural: 'Textes' },
									fields: [
										{
											name: 'title',
											label: 'Titre',
											type: 'text',
										},
										{
											name: 'content',
											label: 'Contenu',
											type: 'richText',
											required: true,
										},
										{
											name: 'backgroundImage',
											label: 'Image de fond',
											type: 'upload',
											relationTo: 'media',
										},
									],
								},
								{
									slug: 'loreBanner',
									labels: { singular: 'Bannière', plural: 'Bannières' },
									fields: [
										{
											name: 'image',
											label: 'Image',
											type: 'upload',
											relationTo: 'media',
											required: true,
										},
										{
											name: 'caption',
											label: 'Légende',
											type: 'text',
										},
										{
											name: 'fullWidth',
											label: 'Pleine largeur',
											type: 'checkbox',
											defaultValue: true,
										},
									],
								},
								{
									slug: 'loreGallery',
									labels: { singular: 'Galerie', plural: 'Galeries' },
									fields: [
										{
											name: 'title',
											label: 'Titre',
											type: 'text',
										},
										{
											name: 'images',
											label: 'Images',
											type: 'array',
											fields: [
												{
													name: 'image',
													type: 'upload',
													relationTo: 'media',
													required: true,
												},
												{
													name: 'caption',
													type: 'text',
												},
											],
										},
									],
								},
							],
						},
					],
				},
				{
					label: 'Chronologie',
					fields: [
						{
							name: 'isTimelineVisible',
							label: 'Afficher la chronologie',
							type: 'checkbox',
							defaultValue: true,
						},
						{
							name: 'timelineTitle',
							label: 'Titre de la chronologie',
							type: 'text',
							defaultValue: 'Chronologie',
						},
						{
							name: 'timelineEvents',
							label: 'Événements',
							type: 'array',
							fields: [
								{
									name: 'date',
									label: 'Date',
									type: 'date',
									required: true,
									admin: {
										date: {
											pickerAppearance: 'dayOnly',
											displayFormat: 'dd/MM/yyyy',
										},
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
								},
								{
									name: 'image',
									label: 'Image',
									type: 'upload',
									relationTo: 'media',
								},
							],
						},
					],
				},
				{
					label: 'Configuration',
					fields: [
						{
							name: 'matriculePrefix',
							label: 'Préfixe du matricule',
							type: 'text',
							defaultValue: 'DA',
							admin: {
								description: 'Ex: DA pour DA-2042-001',
							},
						},
						{
							name: 'matriculeYear',
							label: 'Année du matricule',
							type: 'number',
							defaultValue: 2042,
						},
						{
							name: 'discordSyncInterval',
							label: 'Intervalle de sync Discord (minutes)',
							type: 'number',
							defaultValue: 30,
						},
						{
							name: 'defaultFaction',
							label: 'Faction par défaut',
							type: 'text',
							defaultValue: 'LIF',
						},
						{
							name: 'notificationChannelId',
							label: 'ID du salon de notifications Discord',
							type: 'text',
							admin: {
								description: 'Configuré via la commande /notificationdb du bot',
							},
						},
					],
				},
				{
					label: 'Écran de chargement',
					fields: [
						{
							name: 'loadingEnabled',
							label: 'Activer l\'écran de chargement terminal',
							type: 'checkbox',
							defaultValue: true,
						},
						{
							name: 'loadingMessages',
							label: 'Messages de chargement',
							type: 'array',
							defaultValue: [
								{ message: 'Chargement de la base de données...' },
								{ message: 'Authentification Discord...' },
								{ message: 'Vérification des habilitations...' },
								{ message: 'Synchronisation des dossiers...' },
								{ message: 'Accès autorisé.' },
							],
							fields: [
								{
									name: 'message',
									label: 'Message',
									type: 'text',
									required: true,
								},
							],
						},
					],
				},
				{
					label: 'Avertissement Discord',
					fields: [
						{
							name: 'disclaimerEnabled',
							label: 'Activer l\'avertissement',
							type: 'checkbox',
							defaultValue: true,
						},
						{
							name: 'disclaimerTitle',
							label: 'Titre',
							type: 'text',
							defaultValue: 'ACCÈS RESTREINT',
						},
						{
							name: 'disclaimerMessage',
							label: 'Message',
							type: 'textarea',
							defaultValue: 'Vous devez être membre du serveur Discord et avoir complété votre entrée en service pour accéder à toutes les fonctionnalités.',
						},
						{
							name: 'discordInviteUrl',
							label: 'URL d\'invitation Discord',
							type: 'text',
							defaultValue: '',
						},
					],
				},
				{
					label: 'Rôles Admin',
					fields: [
						{
							name: 'adminRoles',
							label: 'Rôles Discord administrateurs',
							type: 'array',
							admin: {
								description: 'Rôles Discord qui ont accès à l\'administration',
							},
							fields: [
								{
									name: 'roleId',
									label: 'ID du rôle Discord',
									type: 'text',
									required: true,
								},
								{
									name: 'roleName',
									label: 'Nom du rôle',
									type: 'text',
								},
								{
									name: 'permissionLevel',
									label: 'Niveau de permission',
									type: 'select',
									options: [
										{ label: 'Complet', value: 'full' },
										{ label: 'Limité', value: 'limited' },
									],
									defaultValue: 'full',
								},
							],
						},
						{
							name: 'intelligenceRoleId',
							label: 'ID du rôle Discord Renseignement',
							type: 'text',
							defaultValue: '1424804277813248091',
							admin: {
								description: 'Rôle Discord autorisant la publication de renseignements',
							},
						},
					],
				},
			],
		},
	],
};
