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
							label: "Activer l'écran de chargement terminal",
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
							label: "Activer l'avertissement",
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
							defaultValue:
								'Vous devez être membre du serveur Discord et avoir complété votre entrée en service pour accéder à toutes les fonctionnalités.',
						},
						{
							name: 'discordInviteUrl',
							label: "URL d'invitation Discord",
							type: 'text',
							defaultValue: '',
						},
					],
				},
				{
					label: 'Règlement RP',
					fields: [
						{
							name: 'rpRulesPassword',
							label: 'Mot de passe caché dans le règlement',
							type: 'text',
							defaultValue: 'HONNEUR',
							admin: {
								description:
									'Ce mot de passe est caché dans le règlement RP. Les joueurs doivent le trouver pour confirmer leur lecture. Il remplace le marqueur >|PASSWORDHERE|< dans le contenu.',
							},
						},
						{
							name: 'rpRulesContent',
							label: 'Contenu du règlement RP (Markdown)',
							type: 'textarea',
							admin: {
								description:
									"Le règlement RP en format Markdown. Utilisez >|PASSWORDHERE|< à l'endroit où le mot de passe doit apparaître. Il sera remplacé par le mot de passe configuré ci-dessus, affiché entre >| et |<.",
							},
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
								description: "Rôles Discord qui ont accès à l'administration",
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
							name: 'operatorRoleId',
							label: 'ID du rôle Discord Opérateur',
							type: 'text',
							admin: {
								description:
									'Rôle Discord requis pour créer/modifier des personnages',
							},
						},
						{
							name: 'intelligenceRoleId',
							label: 'ID du rôle Discord Renseignement',
							type: 'text',
							admin: {
								description:
									'Rôle Discord autorisant la publication de renseignements',
							},
						},
					],
				},
				{
					label: 'Serveur de Jeu',
					fields: [
						{
							name: 'gameServerEnabled',
							label: "Activer l'intégration serveur de jeu",
							type: 'checkbox',
							defaultValue: true,
						},
						{
							name: 'gameServerUuid',
							label: 'UUID du serveur FeatherPanel',
							type: 'text',
							admin: {
								description:
									"UUID complet du serveur (ex: 6af86c71-c6a1-4c72-adec-5e142d32fdc3). Les 8 premiers caractères sont utilisés pour l'API.",
							},
						},
						{
							name: 'gameServerSavePath',
							label: 'Chemin de sauvegarde',
							type: 'text',
							defaultValue:
								'/profile/profile/.save/game/16402406C7FFB16E-MERAK-ISLAND-LIF',
							admin: {
								description:
									'Chemin vers le dossier de sauvegarde du monde sur le serveur.',
							},
						},
						{
							name: 'gameSyncInterval',
							label: 'Intervalle de synchronisation automatique (minutes)',
							type: 'number',
							defaultValue: 15,
							admin: {
								description:
									"L'argent de tous les joueurs liés est automatiquement lu et sauvegardé à cet intervalle.",
							},
						},
						{
							name: 'lastGlobalMoneySync',
							label: 'Dernière synchronisation globale',
							type: 'date',
							admin: {
								readOnly: true,
								description:
									'Mis à jour automatiquement lors de chaque synchronisation.',
							},
						},
					],
				},
				{
					label: 'Sélecteur d\'unité & Hero',
					description:
						"Textes affichés sur la page de création de personnage (étape 01 — choix d'unité) et sur la section « Faction principale » de la page roleplay. Ces textes étaient hardcodés avant — ils sont maintenant tous éditables.",
					fields: [
						{
							type: 'collapsible',
							label: 'Étape 01 — Sélecteur d\'unité (création de personnage)',
							admin: {
								initCollapsed: false,
								description:
									'Page affichée à l\'utilisateur quand il crée un nouveau personnage et doit choisir son unité.',
							},
							fields: [
								{
									name: 'unitSelectorEyebrow',
									label: 'Eyebrow (petit texte au-dessus du titre)',
									type: 'text',
									defaultValue: 'SECTION 01 — CHOIX D\'UNITÉ',
								},
								{
									name: 'unitSelectorTitleLine1',
									label: 'Titre — ligne 1',
									type: 'text',
									defaultValue: 'CHOISISSEZ',
								},
								{
									name: 'unitSelectorTitleLine2',
									label: 'Titre — ligne 2',
									type: 'text',
									defaultValue: 'VOTRE',
								},
								{
									name: 'unitSelectorTitleLine3',
									label: 'Titre — ligne 3 (accent)',
									type: 'text',
									defaultValue: 'ALLÉGEANCE.',
								},
								{
									name: 'unitSelectorBrief',
									label: 'Briefing (paragraphe principal)',
									type: 'textarea',
									defaultValue:
										"Toute mobilisation au sein de la Légion commence par une affectation. Le choix que vous ferez ici ne pourra plus être modifié par vous-même : seul le commandement peut réaffecter un opérateur entre unités.",
									admin: {
										description:
											"Le mot « Légion » sera automatiquement remplacé par le nom de la faction principale si défini.",
									},
								},
								{
									name: 'unitSelectorWarning',
									label: 'Avertissement (bandeau verrouillé)',
									type: 'text',
									defaultValue: 'DÉCISION DÉFINITIVE — LISEZ AVANT DE SIGNER',
								},
								{
									name: 'unitSelectorFooter',
									label: 'Texte de signature en bas',
									type: 'text',
									defaultValue: 'SIGNÉ // COMMANDEMENT',
									admin: {
										description:
											"Le nom de la faction principale est automatiquement ajouté après ce texte.",
									},
								},
								{
									name: 'unitSelectorRailLabel',
									label: 'Texte vertical à gauche (rail)',
									type: 'text',
									defaultValue: 'DOSSIER ENRÔLEMENT',
								},
							],
						},
						{
							type: 'collapsible',
							label: 'Hero « Faction principale » (page /roleplay section 02)',
							admin: {
								initCollapsed: false,
								description:
									'Bandeau hero qui met en vedette la faction marquée comme « principale » et ses unités fer-de-lance.',
							},
							fields: [
								{
									name: 'mainFactionBadge',
									label: 'Badge en haut à gauche du hero',
									type: 'text',
									defaultValue: 'FACTION PRINCIPALE',
								},
								{
									name: 'mainFactionSubtitleAllied',
									label: 'Sous-titre si la faction est ALLIÉE',
									type: 'text',
									defaultValue: 'ALLIÉE · COMMANDEMENT LIF',
								},
								{
									name: 'mainFactionSubtitleHostile',
									label: 'Sous-titre si la faction est HOSTILE',
									type: 'text',
									defaultValue: 'HOSTILE',
								},
								{
									name: 'mainFactionSubtitleNeutral',
									label: 'Sous-titre si la faction est NEUTRE',
									type: 'text',
									defaultValue: 'COMMANDEMENT LIF',
								},
								{
									name: 'mainFactionCta',
									label: 'Texte du bouton CTA',
									type: 'text',
									defaultValue: 'Ouvrir le dossier',
								},
								{
									name: 'mainUnitsStripLabel',
									label: 'Titre du bandeau « unités fer-de-lance »',
									type: 'text',
									defaultValue: 'FER DE LANCE',
								},
								{
									name: 'mainUnitsCardEyebrow',
									label: 'Eyebrow sur chaque carte d\'unité fer-de-lance',
									type: 'text',
									defaultValue: 'UNITÉ PRINCIPALE',
								},
							],
						},
					],
				},
				{
					label: 'Modération',
					fields: [
						{
							name: 'moderationEnabled',
							label: 'Activer le système de modération',
							type: 'checkbox',
							defaultValue: true,
						},
						{
							name: 'moderationLogChannelId',
							label: 'ID du salon de logs modération',
							type: 'text',
							admin: {
								description:
									'Salon Discord où les résultats des actions de modération sont envoyés. Configuré via /moderation-channel du bot.',
							},
						},
						{
							name: 'moderationReasons',
							label: 'Motifs de dossier personnalisés',
							type: 'array',
							admin: {
								description:
									'Motifs supplémentaires pour ouvrir un dossier (les motifs par défaut sont toujours disponibles)',
							},
							fields: [
								{
									name: 'label',
									label: 'Libellé',
									type: 'text',
									required: true,
								},
								{
									name: 'value',
									label: 'Valeur (slug)',
									type: 'text',
									required: true,
								},
							],
						},
					],
				},
			],
		},
	],
};
