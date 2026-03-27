import type { CollectionConfig, CollectionBeforeChangeHook } from 'payload';

const generateMatricule: CollectionBeforeChangeHook = async ({
	data,
	operation,
	req,
}) => {
	if (operation === 'create' && !data?.militaryId) {
		const payload = req.payload;

		// Get config from Roleplay global
		let prefix = 'DA';
		let year = new Date().getFullYear().toString();
		try {
			const roleplayConfig = await payload.findGlobal({ slug: 'roleplay' });
			if (roleplayConfig?.matriculePrefix) prefix = roleplayConfig.matriculePrefix;
			if (roleplayConfig?.matriculeYear) year = String(roleplayConfig.matriculeYear);
		} catch {
			// Use defaults if global not found
		}

		// Count existing characters to generate sequence number
		const { totalDocs } = await payload.count({ collection: 'characters' });
		const sequence = String(totalDocs + 1).padStart(3, '0');

		data.militaryId = `${prefix}-${year}-${sequence}`;
	}
	return data;
};

const generateFullName: CollectionBeforeChangeHook = ({ data }) => {
	if (data?.firstName && data?.lastName) {
		data.fullName = `${data.firstName} ${data.lastName}`;
	}
	return data;
};

export const Characters: CollectionConfig = {
	slug: 'characters',
	admin: {
		useAsTitle: 'fullName',
		defaultColumns: ['fullName', 'rank', 'status', 'faction', 'isMainCharacter'],
		group: 'Roleplay',
	},
	access: {
		read: () => true,
		create: ({ req }) => !!req.user,
		update: ({ req }) => {
			if (!req.user) return false;
			if (req.user.role === 'admin') return true;
			return { discordId: { equals: req.user.discordId } };
		},
		delete: ({ req }) => {
			if (!req.user) return false;
			if (req.user.role === 'admin') return true;
			return { discordId: { equals: req.user.discordId } };
		},
	},
	hooks: {
		beforeChange: [generateFullName, generateMatricule],
	},
	fields: [
		{
			name: 'fullName',
			type: 'text',
			admin: {
				hidden: true,
			},
		},
		// Identity
		{
			type: 'tabs',
			tabs: [
				{
					label: 'Identité',
					fields: [
						{
							type: 'row',
							fields: [
								{
									name: 'firstName',
									label: 'Prénom',
									type: 'text',
									required: true,
								},
								{
									name: 'lastName',
									label: 'Nom',
									type: 'text',
									required: true,
								},
							],
						},
						{
							type: 'row',
							fields: [
								{
									name: 'dateOfBirth',
									label: 'Date de naissance',
									type: 'date',
									admin: {
										date: {
											pickerAppearance: 'dayOnly',
											displayFormat: 'dd/MM/yyyy',
										},
									},
								},
								{
									name: 'placeOfOrigin',
									label: "Lieu d'origine",
									type: 'text',
								},
							],
						},
						{
							type: 'row',
							fields: [
								{
									name: 'height',
									label: 'Taille (cm)',
									type: 'number',
								},
								{
									name: 'weight',
									label: 'Poids (kg)',
									type: 'number',
								},
							],
						},
						{
							name: 'physicalDescription',
							label: 'Description physique',
							type: 'textarea',
						},
						{
							name: 'avatar',
							label: 'Photo du personnel',
							type: 'upload',
							relationTo: 'media',
						},
						{
							name: 'motto',
							label: 'Devise',
							type: 'text',
						},
					],
				},
				{
					label: 'Parcours',
					fields: [
						{
							name: 'previousUnit',
							label: 'Unité / Armée précédente',
							type: 'text',
						},
						{
							name: 'specialisations',
							label: 'Spécialisations',
							type: 'array',
							fields: [
								{
									name: 'name',
									label: 'Spécialisation',
									type: 'text',
									required: true,
								},
							],
						},
						{
							name: 'civilianBackground',
							label: 'Parcours civil',
							type: 'richText',
						},
						{
							name: 'militaryBackground',
							label: 'Parcours militaire',
							type: 'richText',
						},
						{
							name: 'legalBackground',
							label: 'Parcours judiciaire',
							type: 'richText',
						},
					],
				},
				{
					label: 'Divers',
					fields: [
						{
							name: 'miscellaneous',
							label: 'Informations complémentaires',
							type: 'richText',
							admin: {
								description: 'Supporte les sections expurgées (classifiées)',
							},
						},
					],
				},
				{
					label: 'Administration',
					fields: [
						{
							name: 'etatMajorNotes',
							label: 'Notes État-Major',
							type: 'richText',
							access: {
								read: ({ req }) => req.user?.role === 'admin',
								update: ({ req }) => req.user?.role === 'admin',
							},
							admin: {
								description: 'Visible uniquement par les administrateurs',
							},
						},
					],
				},
			],
		},
		// Sidebar fields
		{
			name: 'militaryId',
			label: 'Matricule',
			type: 'text',
			unique: true,
			admin: {
				position: 'sidebar',
				description: 'Généré automatiquement (ex: DA-2042-001)',
				readOnly: true,
			},
		},
		{
			name: 'rank',
			label: 'Grade',
			type: 'relationship',
			relationTo: 'ranks',
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'rankOverride',
			label: 'Grade forcé (désactive la sync Discord)',
			type: 'checkbox',
			defaultValue: false,
			admin: {
				position: 'sidebar',
				description: 'Si activé, le grade ne sera pas synchronisé depuis Discord',
			},
		},
		{
			name: 'status',
			label: 'Statut',
			type: 'select',
			defaultValue: 'in-service',
			options: [
				{ label: 'En service', value: 'in-service' },
				{ label: 'KIA (Mort au combat)', value: 'kia' },
				{ label: 'MIA (Disparu)', value: 'mia' },
				{ label: 'Retraité', value: 'retired' },
				{ label: 'Réformé avec honneur', value: 'honourable-discharge' },
				{ label: 'Réformé sans honneur', value: 'dishonourable-discharge' },
				{ label: 'Exécuté', value: 'executed' },
			],
			required: true,
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'classification',
			label: 'Classification',
			type: 'select',
			defaultValue: 'public',
			options: [
				{ label: 'Public', value: 'public' },
				{ label: 'Restreint', value: 'restricted' },
				{ label: 'Classifié', value: 'classified' },
			],
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'faction',
			label: 'Faction',
			type: 'text',
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'isMainCharacter',
			label: 'Personnage principal',
			type: 'checkbox',
			defaultValue: false,
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'isTarget',
			label: 'Cible / Ennemi',
			type: 'checkbox',
			defaultValue: false,
			admin: {
				position: 'sidebar',
				description: 'Marquer comme cible ou ennemi',
			},
		},
		{
			name: 'unit',
			label: 'Unité',
			type: 'relationship',
			relationTo: 'units',
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'superiorOfficer',
			label: 'Officier supérieur',
			type: 'relationship',
			relationTo: 'characters',
			admin: {
				position: 'sidebar',
			},
		},
		// Discord linkage
		{
			name: 'discordId',
			label: 'Discord ID',
			type: 'text',
			admin: {
				position: 'sidebar',
				readOnly: true,
			},
		},
		{
			name: 'discordUsername',
			label: 'Discord Username',
			type: 'text',
			admin: {
				position: 'sidebar',
				readOnly: true,
			},
		},
		// Soft delete
		{
			name: 'isArchived',
			type: 'checkbox',
			defaultValue: false,
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'archivedAt',
			type: 'date',
			admin: {
				position: 'sidebar',
				condition: data => data?.isArchived,
			},
		},
	],
};
