import { NextResponse } from 'next/server';
import { GameDig } from 'gamedig';
import { getPayload } from 'payload';
import config from '@payload-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ServerConfig {
	name: string;
	mode: string;
	description?: string;
	maxPlayers?: number;
	map?: string;
	ip?: string;
	gamePort?: number;
	queryPort?: number;
	isOnline?: boolean;
}

interface ServerStatus {
	name: string;
	mode: string;
	description?: string;
	map: string;
	players: number;
	maxPlayers: number;
	isOnline: boolean;
	ip?: string;
	gamePort?: number;
	ping?: number;
	serverName?: string; // Live name from A2S
}

async function queryServer(
	ip: string,
	queryPort: number,
): Promise<{
	online: boolean;
	players?: number;
	maxPlayers?: number;
	map?: string;
	name?: string;
	ping?: number;
}> {
	try {
		const result = await GameDig.query({
			type: 'arma3', // Arma Reforger uses similar protocol
			host: ip,
			port: queryPort,
			socketTimeout: 3000,
			attemptTimeout: 5000,
		});

		return {
			online: true,
			players: result.numplayers ?? result.players?.length ?? 0,
			maxPlayers: result.maxplayers,
			map: result.map,
			name: result.name,
			ping: result.ping,
		};
	} catch {
		// Try with enfusion protocol for Arma Reforger
		try {
			const result = await GameDig.query({
				type: 'armareforger',
				host: ip,
				port: queryPort,
				socketTimeout: 3000,
				attemptTimeout: 5000,
			});

			return {
				online: true,
				players: result.numplayers ?? result.players?.length ?? 0,
				maxPlayers: result.maxplayers,
				map: result.map,
				name: result.name,
				ping: result.ping,
			};
		} catch {
			return { online: false };
		}
	}
}

export async function GET() {
	try {
		const payload = await getPayload({ config });

		let homepage;
		try {
			homepage = await payload.findGlobal({ slug: 'homepage' });
		} catch {
			return NextResponse.json({ servers: [] });
		}

		const servers = (homepage?.servers as ServerConfig[]) || [];

		const serverStatuses: ServerStatus[] = await Promise.all(
			servers.map(async server => {
				const baseStatus: ServerStatus = {
					name: server.name,
					mode: server.mode,
					description: server.description,
					map: server.map || 'Everon',
					players: 0,
					maxPlayers: server.maxPlayers || 64,
					isOnline: server.isOnline ?? true,
					ip: server.ip,
					gamePort: server.gamePort,
				};

				// If we have IP and query port, try A2S query
				if (server.ip && server.queryPort) {
					const liveData = await queryServer(server.ip, server.queryPort);

					if (liveData.online) {
						return {
							...baseStatus,
							isOnline: true,
							players: liveData.players ?? 0,
							maxPlayers: liveData.maxPlayers ?? baseStatus.maxPlayers,
							map: liveData.map ?? baseStatus.map,
							serverName: liveData.name,
							ping: liveData.ping,
						};
					}
				}

				return baseStatus;
			}),
		);

		return NextResponse.json({
			servers: serverStatuses,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Error fetching server status:', error);
		return NextResponse.json(
			{ servers: [], error: 'Failed to fetch server status' },
			{ status: 500 },
		);
	}
}
