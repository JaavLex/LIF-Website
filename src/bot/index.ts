import {
	Client,
	GatewayIntentBits,
	SlashCommandBuilder,
	REST,
	Routes,
	EmbedBuilder,
	type ChatInputCommandInteraction,
} from 'discord.js';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://lif-arma.com';
const DATABASE_URI = process.env.DATABASE_URI;

if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
	console.error('Missing DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID');
	process.exit(1);
}

// Register slash commands
async function registerCommands() {
	const command = new SlashCommandBuilder()
		.setName('ouvrirdossiers')
		.setDescription('Afficher les dossiers de personnage liés à un utilisateur Discord')
		.addUserOption(option =>
			option
				.setName('utilisateur')
				.setDescription("L'utilisateur Discord dont on veut voir les dossiers")
				.setRequired(true),
		);

	const rest = new REST({ version: '10' }).setToken(BOT_TOKEN!);

	try {
		console.log('Registering slash commands...');
		await rest.put(Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID!), {
			body: [command.toJSON()],
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

async function handleCommand(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply();

	const targetUser = interaction.options.getUser('utilisateur', true);

	try {
		const characters = await getCharactersByDiscordId(targetUser.id);

		if (characters.length === 0) {
			const embed = new EmbedBuilder()
				.setColor(0x8b4513)
				.setTitle('Aucun dossier trouvé')
				.setDescription(`Aucun personnage n'est lié au compte de ${targetUser.toString()}.`)
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		const embed = new EmbedBuilder()
			.setColor(0x8b4513)
			.setTitle(`Dossiers de ${targetUser.displayName}`)
			.setDescription(`${characters.length} dossier${characters.length > 1 ? 's' : ''} trouvé${characters.length > 1 ? 's' : ''}`)
			.setThumbnail(targetUser.displayAvatarURL())
			.setTimestamp();

		for (const char of characters) {
			const rank = typeof char.rank === 'object' && char.rank ? (char.rank as any).abbreviation || (char.rank as any).name : null;
			const unit = typeof char.unit === 'object' && char.unit ? (char.unit as any).name : null;
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

// Start bot
const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.on('clientReady', () => {
	console.log(`Bot logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	if (interaction.commandName === 'ouvrirdossiers') {
		await handleCommand(interaction);
	}
});

// Register commands and start
registerCommands().then(() => {
	client.login(BOT_TOKEN);
});
