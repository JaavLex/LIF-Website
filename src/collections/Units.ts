import type { CollectionConfig } from 'payload';

export const Units: CollectionConfig = {
	slug: 'units',
	admin: {
		useAsTitle: 'name',
		defaultColumns: ['name', 'commander', 'updatedAt'],
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
			label: "Nom de l'unité",
			type: 'text',
			required: true,
		},
		{
			name: 'slug',
			label: 'Slug',
			type: 'text',
			required: true,
			unique: true,
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'description',
			label: 'Description',
			type: 'richText',
		},
		{
			name: 'insignia',
			label: 'Insigne',
			type: 'upload',
			relationTo: 'media',
		},
		{
			name: 'commander',
			label: 'Commandant',
			type: 'relationship',
			relationTo: 'characters',
		},
		{
			name: 'parentFaction',
			label: 'Faction parente',
			type: 'relationship',
			relationTo: 'factions',
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'color',
			label: 'Couleur',
			type: 'text',
			defaultValue: '#4a7c23',
			admin: {
				position: 'sidebar',
				description: "Couleur hex pour l'affichage",
			},
		},
		{
			name: 'isMain',
			label: 'Unité principale',
			type: 'checkbox',
			defaultValue: false,
			admin: {
				position: 'sidebar',
				description:
					"Marque cette unité comme principale sous la faction principale (Cerberus, Spectre…). Affichée dans le sélecteur de création de personnage.",
			},
		},
		{
			name: 'selectorTagline',
			label: '🟢 SÉLECTEUR — Tagline (sous-titre court)',
			type: 'text',
			admin: {
				placeholder: "Ex : Force d'assaut blindée",
				description:
					"Affiché sur la carte de cette unité dans la fenêtre de choix d'unité (création de personnage). Si vide, un texte par défaut sera utilisé.",
			},
		},
		{
			name: 'selectorPitch',
			label: '🟢 SÉLECTEUR — Pitch (paragraphe de présentation)',
			type: 'textarea',
			admin: {
				placeholder:
					"Décrivez en 2-3 phrases la doctrine, la mission et l'identité de l'unité.",
				description:
					"Paragraphe affiché sur la carte de cette unité dans le sélecteur de création de personnage. Si vide, un texte par défaut sera utilisé.",
			},
		},
		{
			name: 'selectorTraits',
			label: '🟢 SÉLECTEUR — Traits / spécialités',
			type: 'array',
			labels: { singular: 'Trait', plural: 'Traits' },
			admin: {
				description:
					'3 à 5 traits courts affichés en liste à puces sur la carte du sélecteur (ex : « Combat conventionnel », « Service actif »).',
				initCollapsed: false,
			},
			fields: [
				{
					name: 'label',
					label: 'Trait',
					type: 'text',
					required: true,
				},
			],
		},
	],
};
