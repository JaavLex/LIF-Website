import {
	Client,
	GatewayIntentBits,
	SlashCommandBuilder,
	REST,
	Routes,
	EmbedBuilder,
	ChannelType,
	type ChatInputCommandInteraction,
	type TextChannel,
} from 'discord.js';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const SITE_URL =
	process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://lif-arma.com';
const DATABASE_URI = process.env.DATABASE_URI;

if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
	console.error('Missing DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID');
	process.exit(1);
}

// In-memory notification channel storage (persisted via Payload global)
let notificationChannelId: string | null = null;

async function loadNotificationChannel() {
	try {
		const { getPayload } = await import('payload');
		const { default: config } = await import('../payload.config');
		const payload = await getPayload({ config });
		const roleplayConfig = await payload
			.findGlobal({ slug: 'roleplay' })
			.catch(() => null);
		notificationChannelId = (roleplayConfig as any)?.notificationChannelId || null;
	} catch {
		// ignore
	}
}

async function saveNotificationChannel(channelId: string) {
	try {
		const { getPayload } = await import('payload');
		const { default: config } = await import('../payload.config');
		const payload = await getPayload({ config });
		await payload.updateGlobal({
			slug: 'roleplay',
			data: { notificationChannelId: channelId } as any,
		});
		notificationChannelId = channelId;
	} catch (err) {
		console.error('Failed to save notification channel:', err);
	}
}

export async function sendNotification(embed: EmbedBuilder) {
	if (!notificationChannelId) return;
	try {
		const channel = client.channels.cache.get(notificationChannelId) as
			| TextChannel
			| undefined;
		if (channel && channel.type === ChannelType.GuildText) {
			await channel.send({ embeds: [embed] });
		}
	} catch (err) {
		console.error('Failed to send notification:', err);
	}
}

// Register slash commands
async function registerCommands() {
	const ouvrirDossiers = new SlashCommandBuilder()
		.setName('ouvrirdossiers')
		.setDescription(
			'Afficher les dossiers de personnage liés à un utilisateur Discord',
		)
		.addUserOption(option =>
			option
				.setName('utilisateur')
				.setDescription("L'utilisateur Discord dont on veut voir les dossiers")
				.setRequired(true),
		);

	const nouveauRenseignement = new SlashCommandBuilder()
		.setName('nouveaurenseignement')
		.setDescription('Lien vers la page de création de renseignement');

	const notificationDb = new SlashCommandBuilder()
		.setName('notificationdb')
		.setDescription(
			'Définir le salon de notifications pour les nouvelles fiches et renseignements',
		)
		.addChannelOption(option =>
			option
				.setName('salon')
				.setDescription('Le salon où envoyer les notifications')
				.setRequired(true),
		);

	const ouvrirRenseignements = new SlashCommandBuilder()
		.setName('ouvrirrenseignements')
		.setDescription(
			'Voir les renseignements postés par un utilisateur ou un personnage',
		)
		.addUserOption(option =>
			option
				.setName('utilisateur')
				.setDescription('Utilisateur Discord dont on veut voir les renseignements')
				.setRequired(false),
		)
		.addIntegerOption(option =>
			option
				.setName('charid')
				.setDescription('ID du personnage dont on veut voir les renseignements')
				.setRequired(false),
		);

	const rest = new REST({ version: '10' }).setToken(BOT_TOKEN!);

	try {
		console.log('Registering slash commands...');
		await rest.put(Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID!), {
			body: [
				ouvrirDossiers.toJSON(),
				nouveauRenseignement.toJSON(),
				notificationDb.toJSON(),
				ouvrirRenseignements.toJSON(),
			],
		});
		console.log('Slash commands registered.');
	} catch (error) {
		console.error('Failed to register commands:', error);
	}
}

// Query characters from the database using Payload's local API
async function getCharactersByDiscordId(discordId: string) {
	// Use dynamic import to load payload
	const { getPayload } = await import('payload');
	const { default: config } = await import('../payload.config');

	const payload = await getPayload({ config });

	const result = await payload.find({
		collection: 'characters',
		where: {
			discordId: { equals: discordId },
		},
		depth: 2,
		limit: 20,
	});

	return result.docs;
}

const STATUS_LABELS: Record<string, string> = {
	'in-service': '🟢 En service',
	kia: '💀 KIA',
	mia: '❓ MIA',
	retired: '🔵 Retraité',
	'honourable-discharge': '🏅 Réformé avec honneur',
	'dishonourable-discharge': '⚠️ Réformé sans honneur',
	executed: '☠️ Exécuté',
};

async function handleOuvrirDossiers(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply();

	const targetUser = interaction.options.getUser('utilisateur', true);

	try {
		const characters = await getCharactersByDiscordId(targetUser.id);

		if (characters.length === 0) {
			const embed = new EmbedBuilder()
				.setColor(0x8b4513)
				.setTitle('Aucun dossier trouvé')
				.setDescription(
					`Aucun personnage n'est lié au compte de ${targetUser.toString()}.`,
				)
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		const embed = new EmbedBuilder()
			.setColor(0x8b4513)
			.setTitle(`Dossiers de ${targetUser.displayName}`)
			.setDescription(
				`${characters.length} dossier${characters.length > 1 ? 's' : ''} trouvé${characters.length > 1 ? 's' : ''}`,
			)
			.setThumbnail(targetUser.displayAvatarURL())
			.setTimestamp();

		for (const char of characters) {
			const rank =
				typeof char.rank === 'object' && char.rank
					? (char.rank as any).abbreviation || (char.rank as any).name
					: null;
			const unit =
				typeof char.unit === 'object' && char.unit ? (char.unit as any).name : null;
			const status = STATUS_LABELS[char.status] || char.status;
			const url = `${SITE_URL}/roleplay/personnage/${char.id}`;

			const parts: string[] = [];
			if (rank) parts.push(`**Grade:** ${rank}`);
			parts.push(`**Statut:** ${status}`);
			if (unit) parts.push(`**Unité:** ${unit}`);
			if (char.isMainCharacter) parts.push('⭐ Personnage principal');
			parts.push(`[Ouvrir le dossier](${url})`);

			embed.addFields({
				name: `${char.isMainCharacter ? '★ ' : ''}${rank ? `${rank} ` : ''}${char.fullName}`,
				value: parts.join('\n'),
				inline: characters.length <= 4,
			});
		}

		await interaction.editReply({ embeds: [embed] });
	} catch (error) {
		console.error('Error fetching characters:', error);
		await interaction.editReply({
			content: '❌ Erreur lors de la récupération des dossiers.',
		});
	}
}

async function handleNouveauRenseignement(interaction: ChatInputCommandInteraction) {
	const embed = new EmbedBuilder()
		.setColor(0x8b4513)
		.setTitle('📋 Nouveau rapport de renseignement')
		.setDescription(
			`Rendez-vous sur le site pour créer un nouveau rapport de renseignement.\n\n[➡️ Créer un rapport](${SITE_URL}/roleplay)`,
		)
		.setTimestamp();

	await interaction.reply({ embeds: [embed] });
}

async function handleNotificationDb(interaction: ChatInputCommandInteraction) {
	const channel = interaction.options.getChannel('salon', true);

	if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
		await interaction.reply({
			content: '❌ Veuillez sélectionner un salon textuel ou d\'annonces.',
			ephemeral: true,
		});
		return;
	}

	await interaction.deferReply();

	try {
		await saveNotificationChannel(channel.id);

		const embed = new EmbedBuilder()
			.setColor(0x4a7c23)
			.setTitle('✅ Notifications configurées')
			.setDescription(
				`Les notifications de nouvelles fiches de personnage et rapports de renseignement seront envoyées dans <#${channel.id}>.`,
			)
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });
	} catch (error) {
		console.error('Error setting notification channel:', error);
		await interaction.editReply({ content: '❌ Erreur lors de la configuration.' });
	}
}

async function handleOuvrirRenseignements(interaction: ChatInputCommandInteraction) {
	const targetUser = interaction.options.getUser('utilisateur');
	const charId = interaction.options.getInteger('charid');

	if (!targetUser && !charId) {
		await interaction.reply({
			content: '❌ Veuillez spécifier un utilisateur ou un ID de personnage.',
			ephemeral: true,
		});
		return;
	}

	await interaction.deferReply();

	try {
		const { getPayload } = await import('payload');
		const { default: config } = await import('../payload.config');
		const payload = await getPayload({ config });

		let reports: any[] = [];

		if (charId) {
			// Search by character ID (postedBy)
			const result = await payload.find({
				collection: 'intelligence',
				where: { postedBy: { equals: charId } },
				sort: '-date',
				limit: 10,
				depth: 2,
			});
			reports = result.docs;
		} else if (targetUser) {
			// Search by Discord user → find their characters → find reports by those characters
			const characters = await payload.find({
				collection: 'characters',
				where: { discordId: { equals: targetUser.id } },
				limit: 50,
				depth: 0,
			});

			if (characters.docs.length > 0) {
				const charIds = characters.docs.map((c: any) => c.id);
				const result = await payload.find({
					collection: 'intelligence',
					where: { postedBy: { in: charIds } },
					sort: '-date',
					limit: 10,
					depth: 2,
				});
				reports = result.docs;
			}
		}

		if (reports.length === 0) {
			const embed = new EmbedBuilder()
				.setColor(0x8b4513)
				.setTitle('Aucun renseignement trouvé')
				.setDescription(
					charId
						? `Aucun rapport de renseignement trouvé pour le personnage #${charId}.`
						: `Aucun rapport de renseignement trouvé pour ${targetUser!.toString()}.`,
				)
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		const embed = new EmbedBuilder()
			.setColor(0x8b4513)
			.setTitle(
				charId
					? `Renseignements du personnage #${charId}`
					: `Renseignements de ${targetUser!.displayName}`,
			)
			.setDescription(
				`${reports.length} rapport${reports.length > 1 ? 's' : ''} trouvé${reports.length > 1 ? 's' : ''}`,
			)
			.setTimestamp();

		if (targetUser) embed.setThumbnail(targetUser.displayAvatarURL());

		const TYPE_LABELS_FR: Record<string, string> = {
			observation: 'Observation',
			interception: 'Interception',
			reconnaissance: 'Reconnaissance',
			infiltration: 'Infiltration',
			sigint: 'SIGINT',
			humint: 'HUMINT',
			other: 'Autre',
		};

		for (const report of reports.slice(0, 10)) {
			const postedBy =
				typeof report.postedBy === 'object' && report.postedBy
					? report.postedBy.fullName
					: '—';
			const date = new Date(report.date).toLocaleDateString('fr-FR');
			const type = TYPE_LABELS_FR[report.type] || report.type;
			const url = `${SITE_URL}/roleplay/renseignement/${report.id}`;

			embed.addFields({
				name: `📋 ${report.title}`,
				value: `**Type:** ${type}\n**Date:** ${date}\n**Par:** ${postedBy}\n**Classification:** ${report.classification}\n[Ouvrir le rapport](${url})`,
				inline: reports.length <= 4,
			});
		}

		await interaction.editReply({ embeds: [embed] });
	} catch (error) {
		console.error('Error fetching intelligence:', error);
		await interaction.editReply({
			content: '❌ Erreur lors de la récupération des renseignements.',
		});
	}
}

// Start bot
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
});

client.on('clientReady', async () => {
	console.log(`Bot logged in as ${client.user?.tag}`);
	await loadNotificationChannel();
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	switch (interaction.commandName) {
		case 'ouvrirdossiers':
			await handleOuvrirDossiers(interaction);
			break;
		case 'nouveaurenseignement':
			await handleNouveauRenseignement(interaction);
			break;
		case 'notificationdb':
			await handleNotificationDb(interaction);
			break;
		case 'ouvrirrenseignements':
			await handleOuvrirRenseignements(interaction);
			break;
	}
});

// Register commands and start
registerCommands().then(() => {
	client.login(BOT_TOKEN);
});
