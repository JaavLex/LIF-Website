const PANEL_URL = process.env.FEATHERPANEL_URL || '';
const API_KEY = process.env.FEATHERPANEL_API_KEY || '';
const SERVER_ID = process.env.FEATHERPANEL_SERVER_ID || '';
const SAVE_BASE = process.env.FEATHERPANEL_SAVE_PATH || '/profile/profile/.save/game/16402406C7FFB16E-MERAK-ISLAND-LIF';
const CUSTOM_NAMES_PATH = '/profile/profile/CustomNames.json';

// FeatherPanel uses uuidShort (first 8 chars of server UUID)
function getUuidShort(): string {
	return SERVER_ID.substring(0, 8);
}

function apiUrl(path: string) {
	return `${PANEL_URL}/api/user/servers/${getUuidShort()}${path}`;
}

export function isGameServerConfigured(): boolean {
	return !!(PANEL_URL && API_KEY && SERVER_ID);
}

// List files in a directory
async function listFiles(directory: string): Promise<any[]> {
	const res = await fetch(
		apiUrl(`/files?path=${encodeURIComponent(directory)}`),
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
async function readFile(filePath: string): Promise<string> {
	const res = await fetch(
		apiUrl(`/file?path=${encodeURIComponent(filePath)}`),
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
async function writeFile(filePath: string, content: string): Promise<void> {
	const res = await fetch(
		apiUrl(`/write-file?path=${encodeURIComponent(filePath)}`),
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
async function findLatestPersistencePath(): Promise<string> {
	// Find latest playthrough
	const playthroughs = await listFiles(SAVE_BASE);
	const latestPlaythrough = findLatest(playthroughs, 'playthrough');
	if (!latestPlaythrough) throw new Error('Aucun playthrough trouvé');

	// Find latest savepoint
	const savepoints = await listFiles(`${SAVE_BASE}/${latestPlaythrough}`);
	const latestSavepoint = findLatest(savepoints, 'savepoint');
	if (!latestSavepoint) throw new Error('Aucun savepoint trouvé');

	// Find WorldState .json file
	const worldStatePath = `${SAVE_BASE}/${latestPlaythrough}/${latestSavepoint}/WorldState`;
	const wsFiles = await listFiles(worldStatePath);
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
	const filePath = await findLatestPersistencePath();
	const content = await readFile(filePath);
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
	const filePath = await findLatestPersistencePath();
	const content = await readFile(filePath);
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

	await writeFile(filePath, JSON.stringify(data));
}

// Read CustomNames.json
export async function readCustomNames(): Promise<Record<string, string>> {
	try {
		const content = await readFile(CUSTOM_NAMES_PATH);
		return JSON.parse(content);
	} catch {
		return {};
	}
}

// Update a player's custom name
export async function setCustomName(biId: string, name: string): Promise<void> {
	const names = await readCustomNames();
	names[biId] = name;
	await writeFile(CUSTOM_NAMES_PATH, JSON.stringify(names, null, 4));
}
