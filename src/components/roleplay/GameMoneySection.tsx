'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface GameMoneySectionProps {
	characterId: number;
	biId: string;
	initialSavedMoney: number | null;
	initialLastSyncAt: string | null;
	isAdmin: boolean;
	isOwner: boolean;
	bankAnonymous: boolean;
}

export function GameMoneySection({
	characterId,
	biId,
	initialSavedMoney,
	initialLastSyncAt,
	isAdmin,
	isOwner,
	bankAnonymous,
}: GameMoneySectionProps) {
	const [gameMoney, setGameMoney] = useState<number | null>(null);
	const [savedMoney, setSavedMoney] = useState<number | null>(initialSavedMoney);
	const [lastSyncAt, setLastSyncAt] = useState<string | null>(initialLastSyncAt);
	const [loading, setLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [adminAmount, setAdminAmount] = useState('');

	// Countdown state
	const [lastGlobalSync, setLastGlobalSync] = useState<string | null>(null);
	const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(15);
	const [countdown, setCountdown] = useState<{ minutes: number; seconds: number; progress: number } | null>(null);
	const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Anonymous toggle state
	const [isAnonymous, setIsAnonymous] = useState(bankAnonymous);
	const [anonymousLoading, setAnonymousLoading] = useState(false);

	const clearMessages = () => {
		setError('');
		setSuccess('');
	};

	// Update countdown every second
	useEffect(() => {
		if (!lastGlobalSync || !syncIntervalMinutes) return;

		const updateCountdown = () => {
			const lastSync = new Date(lastGlobalSync).getTime();
			const intervalMs = syncIntervalMinutes * 60 * 1000;
			const nextSync = lastSync + intervalMs;
			const now = Date.now();
			const remaining = Math.max(0, nextSync - now);
			const elapsed = now - lastSync;
			const progress = Math.min(1, elapsed / intervalMs);

			const totalSeconds = Math.ceil(remaining / 1000);
			const minutes = Math.floor(totalSeconds / 60);
			const seconds = totalSeconds % 60;

			setCountdown({ minutes, seconds, progress });
		};

		updateCountdown();
		countdownRef.current = setInterval(updateCountdown, 1000);

		return () => {
			if (countdownRef.current) clearInterval(countdownRef.current);
		};
	}, [lastGlobalSync, syncIntervalMinutes]);

	const fetchGameMoney = useCallback(async () => {
		setLoading(true);
		clearMessages();
		try {
			const res = await fetch(`/api/roleplay/characters/${characterId}/game-sync`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Erreur');
			setGameMoney(data.gameMoney);
			setSavedMoney(data.savedMoney);
			setLastSyncAt(data.lastSyncAt);
			setLastGlobalSync(data.lastGlobalSync);
			setSyncIntervalMinutes(data.syncIntervalMinutes || 15);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [characterId]);

	// Auto-fetch on mount
	useEffect(() => {
		fetchGameMoney();
	}, [fetchGameMoney]);

	const performAction = async (action: string, extra?: Record<string, any>) => {
		setActionLoading(action);
		clearMessages();
		try {
			const res = await fetch(`/api/roleplay/characters/${characterId}/game-sync`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, ...extra }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Erreur');

			switch (action) {
				case 'save-money':
					setSavedMoney(data.savedMoney);
					setLastSyncAt(new Date().toISOString());
					setSuccess(`Argent sauvegardé : ${formatMoney(data.savedMoney)}`);
					break;
				case 'restore-money':
					setSuccess(`Argent restauré sur le serveur : ${formatMoney(data.restoredMoney)}`);
					break;
				case 'set-money':
					setSuccess(`Argent défini à ${formatMoney(data.newMoney)} sur le serveur`);
					setAdminAmount('');
					break;
				case 'sync-name':
					setSuccess(`Nom synchronisé : ${data.name} [${data.prefix}]`);
					break;
			}
		} catch (err: any) {
			setError(err.message);
		} finally {
			setActionLoading(null);
		}
	};

	const toggleAnonymous = async () => {
		setAnonymousLoading(true);
		try {
			const res = await fetch(`/api/roleplay/characters/${characterId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bankAnonymous: !isAnonymous }),
			});
			if (!res.ok) throw new Error('Erreur lors de la modification');
			setIsAnonymous(!isAnonymous);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setAnonymousLoading(false);
		}
	};

	return (
		<div className="game-money-section">
			<h3>
				<span className="game-money-icon">$</span>
				Finances en jeu
			</h3>

			<div className="game-money-content">
				{/* Auto-sync countdown with progress bar */}
				{countdown && (
					<div className="game-sync-countdown">
						<div className="game-sync-countdown-header">
							<span className="game-sync-label">Prochaine mise à jour auto</span>
							<span className="game-sync-time">
								{countdown.minutes > 0 || countdown.seconds > 0
									? `${countdown.minutes}:${String(countdown.seconds).padStart(2, '0')}`
									: 'En cours...'}
							</span>
						</div>
						<div className="game-sync-progress-bar">
							<div
								className="game-sync-progress-fill"
								style={{ width: `${countdown.progress * 100}%` }}
							/>
						</div>
					</div>
				)}

				{/* Money display */}
				<div className="game-money-row">
					<span className="game-money-label">Argent en jeu</span>
					<span className="game-money-value">
						{loading ? (
							<span className="game-loading">Chargement...</span>
						) : gameMoney !== null ? (
							formatMoney(gameMoney)
						) : (
							<span className="game-muted">—</span>
						)}
					</span>
				</div>
				<div className="game-money-row">
					<span className="game-money-label">Dernier backup</span>
					<span className="game-money-value">
						{savedMoney !== null ? formatMoney(savedMoney) : <span className="game-muted">Aucun</span>}
					</span>
				</div>
				{lastSyncAt && (
					<div className="game-money-row">
						<span className="game-money-label">Date du backup</span>
						<span className="game-money-value game-muted" style={{ fontSize: '0.8rem' }}>
							{new Date(lastSyncAt).toLocaleString('fr-FR')}
						</span>
					</div>
				)}

				{/* Anonymous toggle — owner can toggle */}
				{isOwner && (
					<div className="game-money-row game-anonymous-toggle">
						<span className="game-money-label">Compte anonyme</span>
						<button
							type="button"
							onClick={toggleAnonymous}
							disabled={anonymousLoading}
							className={`game-btn-toggle ${isAnonymous ? 'active' : ''}`}
							title={isAnonymous ? 'Votre argent est masqué aux autres joueurs' : 'Votre argent est visible par tous'}
						>
							{anonymousLoading ? '...' : isAnonymous ? '🔒 Oui' : '🔓 Non'}
						</button>
					</div>
				)}

				{error && <div className="game-error">{error}</div>}
				{success && <div className="game-success">{success}</div>}

				{/* Actions */}
				<div className="game-money-actions">
					{(isOwner || isAdmin) && (
						<button
							type="button"
							onClick={fetchGameMoney}
							disabled={loading}
							className="game-btn game-btn-primary"
						>
							{loading ? '...' : 'Actualiser'}
						</button>
					)}
					{(isOwner || isAdmin) && (
						<button
							type="button"
							onClick={() => performAction('sync-name')}
							disabled={!!actionLoading}
							className="game-btn game-btn-name"
						>
							{actionLoading === 'sync-name' ? '...' : 'Sync nom'}
						</button>
					)}

					{/* Admin-only actions */}
					{isAdmin && (
						<>
							<button
								type="button"
								onClick={() => performAction('save-money')}
								disabled={!!actionLoading}
								className="game-btn game-btn-save"
							>
								{actionLoading === 'save-money' ? '...' : 'Sauvegarder'}
							</button>
							{savedMoney !== null && (
								<button
									type="button"
									onClick={() => {
										if (confirm(`Restaurer ${formatMoney(savedMoney)} sur le serveur ?`)) {
											performAction('restore-money');
										}
									}}
									disabled={!!actionLoading}
									className="game-btn game-btn-restore"
								>
									{actionLoading === 'restore-money' ? '...' : 'Restaurer'}
								</button>
							)}
						</>
					)}
				</div>

				{/* Admin: set arbitrary money */}
				{isAdmin && (
					<div className="game-admin-section">
						<span className="game-admin-label">Admin — Définir l&apos;argent</span>
						<div className="game-admin-controls">
							<input
								type="number"
								value={adminAmount}
								onChange={e => setAdminAmount(e.target.value)}
								placeholder="Montant"
								className="filter-input game-admin-input"
								min="0"
								step="0.01"
							/>
							<button
								type="button"
								onClick={() => {
									const amount = parseFloat(adminAmount);
									if (isNaN(amount) || amount < 0) {
										setError('Montant invalide');
										return;
									}
									if (confirm(`Définir l'argent à ${formatMoney(amount)} sur le serveur ?`)) {
										performAction('set-money', { amount });
									}
								}}
								disabled={!!actionLoading || !adminAmount}
								className="game-btn game-btn-admin"
							>
								{actionLoading === 'set-money' ? '...' : 'Appliquer'}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function formatMoney(amount: number): string {
	return new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(amount);
}
