import { getPayloadClient } from '@/lib/payload';

const PANEL_URL = process.env.FEATHERPANEL_URL || '';
const API_KEY = process.env.FEATHERPANEL_API_KEY || '';
const ENV_SERVER_ID = process.env.FEATHERPANEL_SERVER_ID || '';
const ENV_SAVE_BASE = process.env.FEATHERPANEL_SAVE_PATH || '/profile/profile/.save/game/16402406C7FFB16E-MERAK-ISLAND-LIF';
const CUSTOM_NAMES_PATH = '/profile/profile/CustomNames.json';

// Fetch game server settings from Payload global (with env fallback)
async function getGameServerSettings(): Promise<{ serverId: string; saveBase: string; enabled: boolean }> {
	try {
		const payload = await getPayloadClient();
		const roleplay = await payload.findGlobal({ slug: 'roleplay' }) as any;
		return {
			enabled: roleplay.gameServerEnabled !== false,
			serverId: roleplay.gameServerUuid || ENV_SERVER_ID,
			saveBase: roleplay.gameServerSavePath || ENV_SAVE_BASE,
		};
	} catch {
		return { enabled: true, serverId: ENV_SERVER_ID, saveBase: ENV_SAVE_BASE };
	}
}

function getUuidShort(serverId: string): string {
	return serverId.substring(0, 8);
}

function apiUrl(serverId: string, path: string) {
	return `${PANEL_URL}/api/user/servers/${getUuidShort(serverId)}${path}`;
}

export async function isGameServerConfigured(): Promise<boolean> {
	const settings = await getGameServerSettings();
	return !!(PANEL_URL && API_KEY && settings.serverId && settings.enabled);
}

// List files in a directory
async function listFiles(serverId: string, directory: string): Promise<any[]> {
	const res = await fetch(
		apiUrl(serverId, `/files?path=${encodeURIComponent(directory)}`),
		{
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				Accept: 'application/json',
			},
		},
	);
	if (!res.ok) throw new Error(`Panel API error ${res.status}: ${await res.text()}`);
	const data = await res.json();
	// FeatherPanel returns { success, data: { contents: [...] } }
	const contents = data.data?.contents || [];
	return contents.map((f: any) => ({
		name: f.name,
		is_file: f.file !== undefined ? f.file : f.isFile !== undefined ? f.isFile : !f.directory,
		size: f.size,
	}));
}

// Read file contents
async function readFile(serverId: string, filePath: string): Promise<string> {
	const res = await fetch(
		apiUrl(serverId, `/file?path=${encodeURIComponent(filePath)}`),
		{
			headers: {
				Authorization: `Bearer ${API_KEY}`,
			},
		},
	);
	if (!res.ok) throw new Error(`Panel API error ${res.status}: ${await res.text()}`);
	return res.text();
}

// Write file contents
async function writeFile(serverId: string, filePath: string, content: string): Promise<void> {
	const res = await fetch(
		apiUrl(serverId, `/write-file?path=${encodeURIComponent(filePath)}`),
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				'Content-Type': 'text/plain',
			},
			body: content,
		},
	);
	if (!res.ok) throw new Error(`Panel API error ${res.status}: ${await res.text()}`);
}

// Find latest numbered directory (playthroughN, savepointN)
function findLatest(dirs: any[], prefix: string): string | null {
	const matching = dirs
		.filter((d) => !d.is_file && d.name.startsWith(prefix))
		.map((d) => ({
			name: d.name,
			num: parseInt(d.name.replace(prefix, ''), 10),
		}))
		.filter((d) => !isNaN(d.num))
		.sort((a, b) => b.num - a.num);
	return matching.length > 0 ? matching[0].name : null;
}

// Find the latest persistence file path
async function findLatestPersistencePath(serverId: string, saveBase: string): Promise<string> {
	// Find latest playthrough
	const playthroughs = await listFiles(serverId, saveBase);
	const latestPlaythrough = findLatest(playthroughs, 'playthrough');
	if (!latestPlaythrough) throw new Error('Aucun playthrough trouvé');

	// Find latest savepoint
	const savepoints = await listFiles(serverId, `${saveBase}/${latestPlaythrough}`);
	const latestSavepoint = findLatest(savepoints, 'savepoint');
	if (!latestSavepoint) throw new Error('Aucun savepoint trouvé');

	// Find WorldState .json file
	const worldStatePath = `${saveBase}/${latestPlaythrough}/${latestSavepoint}/WorldState`;
	const wsFiles = await listFiles(serverId, worldStatePath);
	const jsonFile = wsFiles.find((f) => f.is_file && f.name.endsWith('.json'));
	if (!jsonFile) throw new Error('Aucun fichier WorldState trouvé');

	return `${worldStatePath}/${jsonFile.name}`;
}

export interface PlayerGameData {
	biId: string;
	playerEntityId: string;
	money: number;
}

// Read all players' money from the persistence file
export async function readGamePersistence(): Promise<{
	players: PlayerGameData[];
	filePath: string;
}> {
	const settings = await getGameServerSettings();
	const filePath = await findLatestPersistencePath(settings.serverId, settings.saveBase);
	const content = await readFile(settings.serverId, filePath);
	const data = JSON.parse(content);

	const players: PlayerGameData[] = [];
	if (Array.isArray(data.Player)) {
		for (const player of data.Player) {
			const biId = player.id;
			const playerEntityId = player.entity?.playerEntity || '';
			let money = 0;

			// Find money in components
			if (player.components) {
				for (const compKey of Object.keys(player.components)) {
					const comp = player.components[compKey];
					if (comp?.resources && Array.isArray(comp.resources)) {
						const moneyRes = comp.resources.find(
							(r: any) => r.m_eResourceType === 2,
						);
						if (moneyRes) {
							money = moneyRes.m_fValue || 0;
						}
					}
				}
			}

			if (biId) {
				players.push({ biId, playerEntityId, money });
			}
		}
	}

	return { players, filePath };
}

// Get a specific player's money by BI ID
export async function getPlayerMoney(biId: string): Promise<{
	money: number;
	playerEntityId: string;
	filePath: string;
} | null> {
	const { players, filePath } = await readGamePersistence();
	const player = players.find((p) => p.biId === biId);
	if (!player) return null;
	return { money: player.money, playerEntityId: player.playerEntityId, filePath };
}

// Write money back to a player's persistence file
export async function setPlayerMoney(biId: string, newMoney: number): Promise<void> {
	const settings = await getGameServerSettings();
	const filePath = await findLatestPersistencePath(settings.serverId, settings.saveBase);
	const content = await readFile(settings.serverId, filePath);
	const data = JSON.parse(content);

	if (!Array.isArray(data.Player)) throw new Error('Pas de données Player dans le fichier');

	let found = false;
	for (const player of data.Player) {
		if (player.id !== biId) continue;
		found = true;
		if (player.components) {
			for (const compKey of Object.keys(player.components)) {
				const comp = player.components[compKey];
				if (comp?.resources && Array.isArray(comp.resources)) {
					const moneyRes = comp.resources.find(
						(r: any) => r.m_eResourceType === 2,
					);
					if (moneyRes) {
						moneyRes.m_fValue = newMoney;
					}
				}
			}
		}
		break;
	}

	if (!found) throw new Error('Joueur non trouvé dans la persistence');

	await writeFile(settings.serverId, filePath, JSON.stringify(data));
}

export interface CustomNameEntry {
	customName: string;
	customPrefix: string;
	lastUpdated: number;
	lastPlayerName: string;
}

// Read CustomNames.json
export async function readCustomNames(): Promise<Record<string, CustomNameEntry>> {
	try {
		const settings = await getGameServerSettings();
		const content = await readFile(settings.serverId, CUSTOM_NAMES_PATH);
		return JSON.parse(content);
	} catch {
		return {};
	}
}

// Update a player's custom name
export async function setCustomName(
	biId: string,
	customName: string,
	customPrefix: string,
): Promise<void> {
	const settings = await getGameServerSettings();
	const names = await readCustomNames();
	const existing = names[biId];
	names[biId] = {
		customName,
		customPrefix,
		lastUpdated: Math.floor(Date.now() / 1000),
		lastPlayerName: existing?.lastPlayerName || '',
	};
	await writeFile(settings.serverId, CUSTOM_NAMES_PATH, JSON.stringify(names, null, 4));
}
