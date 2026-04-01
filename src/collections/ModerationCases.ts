import type { CollectionConfig } from 'payload';

export const ModerationCases: CollectionConfig = {
	slug: 'moderation-cases',
	labels: { singular: 'Dossier de modération', plural: 'Dossiers de modération' },
	admin: {
		useAsTitle: 'caseNumber',
		group: 'Modération',
		defaultColumns: ['caseNumber', 'targetDiscordUsername', 'status', 'reason', 'createdAt'],
	},
	access: {
		read: () => true,
		create: () => true,
		update: () => true,
		delete: () => true,
	},
	hooks: {
		beforeDelete: [
			async ({ id, req }) => {
				const payload = req.payload;
				// Delete related events
				const events = await payload.find({
					collection: 'moderation-events',
					where: { case: { equals: id } },
					limit: 10000,
					depth: 0,
				});
				for (const event of events.docs) {
					await payload.delete({ collection: 'moderation-events', id: event.id });
				}
				// Delete related sanctions
				const sanctions = await payload.find({
					collection: 'moderation-sanctions',
					where: { case: { equals: id } },
					limit: 10000,
					depth: 0,
				});
				for (const sanction of sanctions.docs) {
					await payload.delete({ collection: 'moderation-sanctions', id: sanction.id });
				}
			},
		],
	},
	fields: [
		{
			name: 'caseNumber',
			label: 'Numéro de dossier',
			type: 'number',
			unique: true,
			index: true,
			admin: { readOnly: true },
		},
		{
			name: 'targetDiscordId',
			label: 'Discord ID de la cible',
			type: 'text',
			required: true,
			index: true,
		},
		{
			name: 'targetDiscordUsername',
			label: 'Nom Discord de la cible',
			type: 'text',
			required: true,
		},
		{
			name: 'targetServerUsername',
			label: 'Nom serveur de la cible',
			type: 'text',
		},
		{
			name: 'targetDiscordAvatar',
			label: 'Avatar Discord de la cible',
			type: 'text',
		},
		{
			name: 'createdByDiscordId',
			label: 'Discord ID du créateur',
			type: 'text',
			required: true,
		},
		{
			name: 'createdByDiscordUsername',
			label: 'Nom Discord du créateur',
			type: 'text',
			required: true,
		},
		{
			name: 'reason',
			label: 'Motif',
			type: 'select',
			required: true,
			options: [
				{ label: 'Joueur problématique', value: 'joueur-problematique' },
				{ label: 'Surveillance', value: 'surveillance' },
				{ label: 'Comportement à vérifier', value: 'comportement-a-verifier' },
				{ label: 'Potentiel helper/modérateur', value: 'potentiel-staff' },
				{ label: 'Autre', value: 'autre' },
			],
		},
		{
			name: 'reasonDetail',
			label: 'Détail du motif',
			type: 'textarea',
		},
		{
			name: 'status',
			label: 'Statut',
			type: 'select',
			required: true,
			defaultValue: 'open',
			options: [
				{ label: 'Ouvert', value: 'open' },
				{ label: 'En attente', value: 'pending' },
				{ label: 'Résolu', value: 'resolved' },
				{ label: 'Archivé', value: 'archived' },
			],
			index: true,
		},
		{
			name: 'warnCount',
			label: "Nombre d'avertissements au moment du dossier",
			type: 'number',
			defaultValue: 0,
			admin: { readOnly: true },
		},
	],
	timestamps: true,
};
