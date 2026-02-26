'use client';

import { useEffect, useState } from 'react';
import { DynamicIcon } from './DynamicIcon';
import { RefreshCw, Gamepad2 } from 'lucide-react';

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
	serverName?: string;
}

interface ServerListProps {
	title: string;
	titleIcon: string;
	fallbackServers: {
		name: string;
		mode: string;
		description?: string | null;
		maxPlayers?: number | null;
		map?: string | null;
		isOnline?: boolean | null;
		ip?: string | null;
		gamePort?: number | null;
	}[];
}

export function ServerList({ title, titleIcon, fallbackServers }: ServerListProps) {
	const [servers, setServers] = useState<ServerStatus[]>([]);
	const [loading, setLoading] = useState(true);
	const [lastUpdate, setLastUpdate] = useState<string>('');

	const fetchServers = async () => {
		try {
			const res = await fetch('/api/servers', { cache: 'no-store' });
			const data = await res.json();

			if (data.servers && data.servers.length > 0) {
				setServers(data.servers);
				setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
			} else {
				// Use fallback servers
				setServers(
					fallbackServers.map(s => ({
						name: s.name,
						mode: s.mode,
						description: s.description ?? undefined,
						map: s.map ?? 'Everon',
						players: 0,
						maxPlayers: s.maxPlayers ?? 64,
						isOnline: s.isOnline ?? false,
						ip: s.ip ?? undefined,
						gamePort: s.gamePort ?? undefined,
					})),
				);
			}
		} catch (error) {
			console.error('Failed to fetch servers:', error);
			// Use fallback servers on error
			setServers(
				fallbackServers.map(s => ({
					name: s.name,
					mode: s.mode,
					description: s.description ?? undefined,
					map: s.map ?? 'Everon',
					players: 0,
					maxPlayers: s.maxPlayers ?? 64,
					isOnline: s.isOnline ?? false,
					ip: s.ip ?? undefined,
					gamePort: s.gamePort ?? undefined,
				})),
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchServers();

		// Refresh every 30 seconds
		const interval = setInterval(fetchServers, 30000);
		return () => clearInterval(interval);
	}, []);

	const joinServer = (ip?: string, port?: number) => {
		if (ip && port) {
			// Arma Reforger Steam App ID: 1874880
			// Launch with connect parameter
			window.location.href = `steam://rungameid/1874880//-connect ${ip}:${port}`;
		}
	};

	return (
		<section id="serveurs" className="servers-section">
			<div className="section-container">
				<h2 className="section-title">
					<span className="title-icon">
						<DynamicIcon name={titleIcon} size={32} />
					</span>
					{title}
				</h2>

				{lastUpdate && (
					<p className="servers-update">
						Dernière mise à jour: {lastUpdate}
						<button
							onClick={fetchServers}
							className="refresh-btn"
							disabled={loading}
						>
							<RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualiser
						</button>
					</p>
				)}

				<div className="servers-grid">
					{loading && servers.length === 0 ? (
						<>
							<div className="server-card loading">
								<div className="skeleton skeleton-title"></div>
								<div className="skeleton skeleton-text"></div>
								<div className="skeleton skeleton-text-sm"></div>
							</div>
							<div className="server-card loading">
								<div className="skeleton skeleton-title"></div>
								<div className="skeleton skeleton-text"></div>
								<div className="skeleton skeleton-text-sm"></div>
							</div>
						</>
					) : (
						servers.map((server, index) => (
							<div key={index} className="server-card">
								<div
									className={`server-status ${server.isOnline ? 'online' : 'offline'}`}
								></div>
								<h3>{server.serverName || server.name}</h3>
								<p className="server-mode">{server.mode}</p>
								{server.description && (
									<p className="server-description">{server.description}</p>
								)}
								<div className="server-info">
									<span className="server-players">
										<span className={server.players > 0 ? 'players-active' : ''}>
											{server.players}
										</span>
										/{server.maxPlayers} joueurs
									</span>
									<span className="server-map">{server.map}</span>
								</div>
								{server.ping !== undefined && server.ping > 0 && (
									<div className="server-ping">Ping: {server.ping}ms</div>
								)}
								{server.ip && server.gamePort && (
									<button
										className="btn btn-server btn-join"
										onClick={() => joinServer(server.ip, server.gamePort)}
									>
										<Gamepad2 size={18} /> Rejoindre
									</button>
								)}
							</div>
						))
					)}
				</div>
			</div>
		</section>
	);
}
