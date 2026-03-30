'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface SessionUser {
	userId: number;
	discordId: string;
	discordUsername: string;
	discordAvatar: string;
	roles: string[];
}

export function SessionBar({
	canCreateCharacter = false,
}: {
	canCreateCharacter?: boolean;
}) {
	const [user, setUser] = useState<SessionUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch('/api/auth/me')
			.then(res => (res.ok ? res.json() : null))
			.then(data => {
				if (data?.authenticated) setUser(data.user);
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return null;

	if (!user) {
		return (
			<div className="session-bar">
				<span style={{ color: 'var(--muted)' }}>NON AUTHENTIFIÉ</span>
				<div className="session-actions">
					<a
						href="/api/auth/discord"
						className="discord-login-btn"
						style={{ padding: '0.35rem 1rem', fontSize: '0.8rem' }}
					>
						Connexion Discord
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="session-bar">
			<Image
				src={user.discordAvatar}
				alt={user.discordUsername}
				width={28}
				height={28}
				className="session-avatar"
				unoptimized
			/>
			<span className="session-name">{user.discordUsername}</span>
			<div className="session-actions">
				{canCreateCharacter && (
					<Link href="/roleplay/personnage/nouveau" className="session-btn">
						+ Nouveau personnage
					</Link>
				)}
				<a href="/api/auth/logout" className="session-btn danger">
					Déconnexion
				</a>
			</div>
		</div>
	);
}
