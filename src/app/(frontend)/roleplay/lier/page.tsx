'use client';

import { useState, useEffect } from 'react';

export default function LinkAccountPage() {
	const [code, setCode] = useState('');
	const [status, setStatus] = useState<
		| 'idle'
		| 'loading'
		| 'success'
		| 'error'
		| 'select'
	>('idle');
	const [message, setMessage] = useState('');
	const [characters, setCharacters] = useState<
		{ id: number; fullName: string }[]
	>([]);
	const [biId, setBiId] = useState('');
	const [characterName, setCharacterName] = useState('');
	const [authState, setAuthState] = useState<{
		loading: boolean;
		eligible: boolean;
		reason?: string;
		discordInviteUrl?: string;
	}>({ loading: true, eligible: false });

	useEffect(() => {
		fetch('/api/roleplay/link/eligibility')
			.then(res => res.json())
			.then(data => setAuthState({ loading: false, eligible: data.eligible, reason: data.reason, discordInviteUrl: data.discordInviteUrl }))
			.catch(() => setAuthState({ loading: false, eligible: false, reason: 'not_authenticated' }));
	}, []);

	async function handleSubmit(characterId?: number) {
		if (!code.trim() && !characterId) return;

		setStatus('loading');
		setMessage('');

		try {
			const res = await fetch('/api/roleplay/link/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code: code.trim().toUpperCase(),
					...(characterId ? { characterId } : {}),
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				setStatus('error');
				setMessage(data.error || 'Erreur inconnue');
				return;
			}

			if (data.needsSelection) {
				setStatus('select');
				setCharacters(data.characters);
				setBiId(data.biId);
				return;
			}

			setStatus('success');
			setCharacterName(data.characterName);
			setMessage(
				`Compte lié avec succès au personnage ${data.characterName}.`,
			);
		} catch {
			setStatus('error');
			setMessage('Erreur de connexion au serveur.');
		}
	}

	async function handleSelectCharacter(characterId: number) {
		// Re-generate a code since the previous one was consumed
		// Actually, the confirm endpoint consumed it and returned biId for re-linking
		// We need a different approach: store the biId and link directly
		setStatus('loading');
		try {
			const res = await fetch('/api/roleplay/link/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code: code.trim().toUpperCase(),
					characterId,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				// If code expired, the user needs a new one
				setStatus('error');
				setMessage(data.error || 'Erreur inconnue');
				return;
			}

			setStatus('success');
			setCharacterName(data.characterName);
			setMessage(
				`Compte lié avec succès au personnage ${data.characterName}.`,
			);
		} catch {
			setStatus('error');
			setMessage('Erreur de connexion au serveur.');
		}
	}

	if (authState.loading) {
		return (
			<div className="terminal-container">
				<div style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center', padding: '3rem' }}>
					<p style={{ color: 'var(--muted)' }}>Chargement...</p>
				</div>
			</div>
		);
	}

	if (!authState.eligible) {
		const isNotLoggedIn = authState.reason === 'not_authenticated';
		return (
			<div className="terminal-container">
				<div
					style={{
						maxWidth: '500px',
						margin: '2rem auto',
						border: '1px solid var(--border)',
						padding: '2rem',
						background: 'rgba(12, 15, 10, 0.9)',
						textAlign: 'center',
					}}
				>
					<h1
						style={{
							fontFamily: 'var(--font-heading)',
							fontSize: '1.5rem',
							color: 'var(--primary)',
							marginBottom: '0.5rem',
							textTransform: 'uppercase',
							letterSpacing: '0.1em',
						}}
					>
						Liaison de compte
					</h1>
					{isNotLoggedIn ? (
						<>
							<p
								style={{
									color: 'var(--muted)',
									fontSize: '0.9rem',
									marginBottom: '1.5rem',
									lineHeight: '1.5',
								}}
							>
								Vous devez vous connecter via Discord avant de pouvoir lier votre compte.
							</p>
							<a
								href="/api/auth/discord"
								style={{
									display: 'inline-block',
									padding: '0.75rem 1.5rem',
									background: '#5865F2',
									color: '#fff',
									textDecoration: 'none',
									fontSize: '0.9rem',
									fontWeight: 600,
									borderRadius: '4px',
								}}
							>
								Connexion Discord
							</a>
						</>
					) : (
						<>
							<p
								style={{
									color: 'var(--muted)',
									fontSize: '0.9rem',
									marginBottom: '1.5rem',
									lineHeight: '1.5',
								}}
							>
								Veuillez rejoindre le serveur Discord et effectuer votre entrée en service avant de pouvoir lier votre compte.
							</p>
							{authState.discordInviteUrl && (
								<a
									href={authState.discordInviteUrl}
									target="_blank"
									rel="noopener noreferrer"
									style={{
										display: 'inline-block',
										padding: '0.75rem 1.5rem',
										background: '#5865F2',
										color: '#fff',
										textDecoration: 'none',
										fontSize: '0.9rem',
										fontWeight: 600,
										borderRadius: '4px',
									}}
								>
									Rejoindre le Discord
								</a>
							)}
						</>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="terminal-container">
			<div
				style={{
					maxWidth: '500px',
					margin: '2rem auto',
					border: '1px solid var(--border)',
					padding: '2rem',
					background: 'rgba(12, 15, 10, 0.9)',
				}}
			>
				<h1
					style={{
						fontFamily: 'var(--font-heading)',
						fontSize: '1.5rem',
						color: 'var(--primary)',
						marginBottom: '0.5rem',
						textTransform: 'uppercase',
						letterSpacing: '0.1em',
					}}
				>
					Liaison de compte
				</h1>
				<p
					style={{
						color: 'var(--muted)',
						fontSize: '0.85rem',
						marginBottom: '1.5rem',
						lineHeight: '1.5',
					}}
				>
					Entrez le code affiché dans Arma Reforger pour lier votre
					identifiant Bohemia Interactive à votre fiche de personnage.
				</p>

				{status === 'success' ? (
					<div
						style={{
							padding: '1rem',
							border: '1px solid var(--primary)',
							color: 'var(--primary)',
							textAlign: 'center',
						}}
					>
						<p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
							Liaison réussie
						</p>
						<p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
							{message}
						</p>
						<a
							href="/roleplay"
							style={{
								display: 'inline-block',
								marginTop: '1rem',
								padding: '0.5rem 1rem',
								border: '1px solid var(--primary)',
								color: 'var(--primary)',
								textDecoration: 'none',
								fontSize: '0.85rem',
							}}
						>
							Retour au roleplay
						</a>
					</div>
				) : status === 'select' ? (
					<div>
						<p
							style={{
								color: 'var(--muted)',
								fontSize: '0.85rem',
								marginBottom: '1rem',
							}}
						>
							Vous avez plusieurs personnages non liés. Choisissez
							celui à associer :
						</p>
						{characters.map((char) => (
							<button
								key={char.id}
								onClick={() => handleSelectCharacter(char.id)}
								style={{
									display: 'block',
									width: '100%',
									padding: '0.75rem 1rem',
									marginBottom: '0.5rem',
									background: 'transparent',
									border: '1px solid var(--border)',
									color: 'var(--primary)',
									cursor: 'pointer',
									fontFamily: 'inherit',
									fontSize: '0.9rem',
									textAlign: 'left',
								}}
							>
								{char.fullName}
							</button>
						))}
					</div>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleSubmit();
						}}
					>
						<label
							htmlFor="link-code"
							style={{
								display: 'block',
								color: 'var(--muted)',
								fontSize: '0.8rem',
								marginBottom: '0.4rem',
								textTransform: 'uppercase',
								letterSpacing: '0.05em',
							}}
						>
							Code de liaison
						</label>
						<input
							id="link-code"
							type="text"
							maxLength={6}
							placeholder="Ex: ABC123"
							value={code}
							onChange={(e) =>
								setCode(e.target.value.toUpperCase())
							}
							disabled={status === 'loading'}
							style={{
								width: '100%',
								padding: '0.75rem',
								background: 'rgba(0,0,0,0.5)',
								border: '1px solid var(--border)',
								color: '#fff',
								fontFamily: 'inherit',
								fontSize: '1.5rem',
								textAlign: 'center',
								letterSpacing: '0.3em',
								marginBottom: '1rem',
								outline: 'none',
							}}
							autoFocus
						/>

						{status === 'error' && (
							<p
								style={{
									color: '#c44',
									fontSize: '0.85rem',
									marginBottom: '1rem',
								}}
							>
								{message}
							</p>
						)}

						<button
							type="submit"
							disabled={
								status === 'loading' || code.trim().length < 6
							}
							style={{
								width: '100%',
								padding: '0.75rem',
								background:
									code.trim().length >= 6
										? 'var(--primary)'
										: 'var(--border)',
								border: 'none',
								color: '#fff',
								fontFamily: 'inherit',
								fontSize: '0.9rem',
								cursor:
									code.trim().length >= 6
										? 'pointer'
										: 'not-allowed',
								textTransform: 'uppercase',
								letterSpacing: '0.05em',
							}}
						>
							{status === 'loading'
								? 'Vérification...'
								: 'Confirmer la liaison'}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
