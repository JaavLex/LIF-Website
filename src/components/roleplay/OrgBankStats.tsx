'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface LeaderboardEntry {
	id: number;
	firstName: string;
	lastName: string;
	callsign: string | null;
	unitName: string | null;
	unitInsignia: string | null;
	avatar: string | null;
	amount: number;
	delta: number;
}

interface OrgStats {
	totalMoney: number;
	memberCount: number;
	history: { date: string; total: number }[];
	leaderboard?: LeaderboardEntry[];
}

export default function OrgBankStats({ isAdmin }: { isAdmin?: boolean }) {
	const [stats, setStats] = useState<OrgStats | null>(null);
	const [resetting, setResetting] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const loadStats = useCallback(async () => {
		setRefreshing(true);
		try {
			const r = await fetch('/api/roleplay/org-stats', { cache: 'no-store' });
			if (!r.ok) throw new Error(`org-stats ${r.status}`);
			const data = await r.json();
			setStats(data);
		} catch (err) {
			console.error('[OrgBankStats] fetch failed', err);
		} finally {
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		loadStats();
	}, [loadStats]);

	const drawGraph = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container || !stats || stats.history.length < 2) {
			console.log('[OrgBankStats] skip draw', {
				hasCanvas: !!canvas,
				hasContainer: !!container,
				hasStats: !!stats,
				points: stats?.history.length,
			});
			return;
		}
		console.log('[OrgBankStats] drawing', { points: stats.history.length });

		const dpr = window.devicePixelRatio || 1;
		const rect = container.getBoundingClientRect();
		// Subtract horizontal padding (0.85rem each side ≈ 13.6px)
		const w = Math.max(0, rect.width - 27.2);
		const h = 280;
		console.log('[OrgBankStats] draw call', {
			rectWidth: rect.width,
			computedW: w,
			dpr,
			canvasOffsetWidth: canvas.offsetWidth,
			containerOffsetWidth: container.offsetWidth,
		});
		if (w < 50) {
			console.log('[OrgBankStats] container too narrow — skipping', { w, rect });
			return;
		}

		canvas.width = w * dpr;
		canvas.height = h * dpr;
		canvas.style.width = w + 'px';
		canvas.style.height = h + 'px';

		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.scale(dpr, dpr);

		const history = stats.history;
		const padLeft = 80;
		const padRight = 20;
		const padTop = 20;
		const padBottom = 40;
		const graphW = w - padLeft - padRight;
		const graphH = h - padTop - padBottom;

		const values = history.map(h => h.total);
		const minVal = Math.min(...values) * 0.95;
		const maxVal = Math.max(...values) * 1.05;
		const range = maxVal - minVal || 1;

		// Clear
		ctx.clearRect(0, 0, w, h);

		// Grid lines
		const gridLines = 5;
		ctx.strokeStyle = 'rgba(212, 175, 55, 0.10)';
		ctx.lineWidth = 0.5;
		ctx.font = '10px "Courier New", monospace';
		ctx.fillStyle = 'rgba(212, 175, 55, 0.55)';
		ctx.textAlign = 'right';

		for (let i = 0; i <= gridLines; i++) {
			const y = padTop + (graphH * i) / gridLines;
			const val = maxVal - (range * i) / gridLines;
			ctx.beginPath();
			ctx.moveTo(padLeft, y);
			ctx.lineTo(w - padRight, y);
			ctx.stroke();

			const label =
				val >= 1000000
					? (val / 1000000).toFixed(1) + 'M'
					: val >= 1000
						? (val / 1000).toFixed(0) + 'K'
						: val.toFixed(0);
			ctx.fillText('$' + label, padLeft - 8, y + 4);
		}

		// Axis
		ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(padLeft, padTop);
		ctx.lineTo(padLeft, h - padBottom);
		ctx.lineTo(w - padRight, h - padBottom);
		ctx.stroke();

		// Fill gradient under line
		const gradient = ctx.createLinearGradient(0, padTop, 0, h - padBottom);
		gradient.addColorStop(0, 'rgba(212, 175, 55, 0.32)');
		gradient.addColorStop(1, 'rgba(212, 175, 55, 0.02)');

		ctx.beginPath();
		ctx.moveTo(padLeft, h - padBottom);
		for (let i = 0; i < history.length; i++) {
			const x = padLeft + (i / (history.length - 1)) * graphW;
			const y = padTop + ((maxVal - history[i].total) / range) * graphH;
			if (i === 0) ctx.lineTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.lineTo(padLeft + graphW, h - padBottom);
		ctx.closePath();
		ctx.fillStyle = gradient;
		ctx.fill();

		// Glow line (drawn first, behind the main line)
		ctx.strokeStyle = 'rgba(212, 175, 55, 0.32)';
		ctx.lineWidth = 8;
		ctx.lineJoin = 'round';
		ctx.beginPath();
		for (let i = 0; i < history.length; i++) {
			const x = padLeft + (i / (history.length - 1)) * graphW;
			const y = padTop + ((maxVal - history[i].total) / range) * graphH;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		// Main line
		ctx.strokeStyle = 'rgba(212, 175, 55, 1)';
		ctx.lineWidth = 2;
		ctx.lineJoin = 'round';
		ctx.beginPath();
		for (let i = 0; i < history.length; i++) {
			const x = padLeft + (i / (history.length - 1)) * graphW;
			const y = padTop + ((maxVal - history[i].total) / range) * graphH;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		// Data points
		ctx.fillStyle = 'rgba(212, 175, 55, 1)';
		for (let i = 0; i < history.length; i++) {
			const x = padLeft + (i / (history.length - 1)) * graphW;
			const y = padTop + ((maxVal - history[i].total) / range) * graphH;
			ctx.beginPath();
			ctx.arc(x, y, 3, 0, Math.PI * 2);
			ctx.fill();
		}

		// Date labels on X axis
		ctx.fillStyle = 'rgba(212, 175, 55, 0.55)';
		ctx.font = '9px "Courier New", monospace';
		ctx.textAlign = 'center';

		// Show at most 7 date labels
		const maxLabels = Math.min(7, history.length);
		const step = Math.max(1, Math.floor(history.length / maxLabels));
		const formatLabel = (d: string) => {
			const day = d.slice(8, 10), month = d.slice(5, 7);
			const time = d.length > 10 ? d.slice(11, 16) : '';
			return time ? `${day}/${month} ${time}` : `${day}/${month}`;
		};
		for (let i = 0; i < history.length; i += step) {
			const x = padLeft + (i / (history.length - 1)) * graphW;
			ctx.fillText(formatLabel(history[i].date), x, h - padBottom + 16);
		}
		// Always show last date
		if ((history.length - 1) % step !== 0) {
			const x = padLeft + graphW;
			ctx.fillText(formatLabel(history[history.length - 1].date), x, h - padBottom + 16);
		}
	}, [stats]);

	useEffect(() => {
		// Draw multiple times to survive layout races: immediately, next frame,
		// frame-after-next, and a safety net at 100ms.
		drawGraph();
		const raf1 = requestAnimationFrame(() => {
			drawGraph();
			requestAnimationFrame(drawGraph);
		});
		const timeout = window.setTimeout(drawGraph, 100);

		window.addEventListener('resize', drawGraph);
		let ro: ResizeObserver | null = null;
		if (containerRef.current && typeof ResizeObserver !== 'undefined') {
			ro = new ResizeObserver(() => {
				console.log('[OrgBankStats] ResizeObserver fired');
				drawGraph();
			});
			ro.observe(containerRef.current);
		}
		return () => {
			cancelAnimationFrame(raf1);
			window.clearTimeout(timeout);
			window.removeEventListener('resize', drawGraph);
			ro?.disconnect();
		};
	}, [drawGraph]);

	if (!stats) return null;

	const formatted = stats.totalMoney.toLocaleString('fr-FR');

	// Recent change: last point vs previous point (stock-style delta)
	let changePercent: number | null = null;
	let changeAbsolute: number | null = null;
	if (stats.history.length >= 2) {
		const prev = stats.history[stats.history.length - 2].total;
		const last = stats.history[stats.history.length - 1].total;
		changeAbsolute = last - prev;
		if (prev > 0) {
			changePercent = ((last - prev) / prev) * 100;
		}
	}

	const leaderboard = stats.leaderboard || [];
	const formatMoney = (n: number) => n.toLocaleString('fr-FR');
	const formatDelta = (n: number) => {
		const sign = n > 0 ? '+' : n < 0 ? '−' : '';
		return sign + Math.abs(Math.round(n)).toLocaleString('fr-FR');
	};

	return (
		<div className="org-stats-section">
			<button
				type="button"
				className={`org-stats-refresh${refreshing ? ' is-spinning' : ''}`}
				onClick={loadStats}
				disabled={refreshing}
				aria-label="Rafraîchir le graphique"
				title="Rafraîchir"
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.25"
					strokeLinecap="square"
					strokeLinejoin="miter"
					aria-hidden
				>
					<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
					<path d="M21 3v5h-5" />
					<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
					<path d="M3 21v-5h5" />
				</svg>
				<span className="org-stats-refresh-label">SYNC</span>
			</button>
			<div className="org-stats-header">
				<div className="org-stats-big-number">
					<span className="org-stats-currency">$</span>
					<span className="org-stats-amount">{formatted}</span>
				</div>
				<div className="org-stats-label">
					REVENUS CONTRACTUELS AMASSÉS — LÉGION INTERNATIONALE FRANCOPHONE
				</div>
				<div className="org-stats-sub">
					<span>
						{stats.memberCount} opérateur{stats.memberCount !== 1 ? 's' : ''} actif
						{stats.memberCount !== 1 ? 's' : ''}
					</span>
					{changePercent !== null && (
						<span
							className={`org-stats-change ${changePercent >= 0 ? 'positive' : 'negative'}`}
							title="Évolution depuis le dernier relevé"
						>
							{changePercent >= 0 ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
							{changeAbsolute !== null && (
								<span className="org-stats-change-abs">
									{' '}({formatDelta(changeAbsolute)}$)
								</span>
							)}
						</span>
					)}
				</div>
			</div>
			{stats.history.length >= 2 && (
				<div className="org-stats-graph" ref={containerRef}>
					<canvas ref={canvasRef} />
				</div>
			)}
			{stats.history.length < 2 && (
				<div className="org-stats-no-data">
					Données historiques insuffisantes pour afficher le graphique
				</div>
			)}

			{leaderboard.length > 0 && (
				<div className="org-leaderboard">
					<div className="org-leaderboard-header">
						<span className="org-leaderboard-title">
							<span className="org-leaderboard-dot" /> CLASSEMENT TRÉSORERIE
						</span>
						<span className="org-leaderboard-meta">
							{leaderboard.length} opérateur{leaderboard.length !== 1 ? 's' : ''} listé
							{leaderboard.length !== 1 ? 's' : ''} · comptes non-anonymes
						</span>
					</div>
					<ol className="org-leaderboard-list">
						{leaderboard.map((entry, idx) => {
							const deltaPositive = entry.delta > 0;
							const deltaNegative = entry.delta < 0;
							const rank = idx + 1;
							return (
								<li
									key={entry.id}
									className={`org-leaderboard-row${rank <= 3 ? ' is-top' : ''}`}
									style={{ animationDelay: `${Math.min(idx * 40, 600)}ms` }}
								>
									<div className="org-lb-rank">
										<span className="org-lb-rank-num">
											{rank.toString().padStart(2, '0')}
										</span>
									</div>
									<div className="org-lb-avatar">
										{entry.avatar ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img src={entry.avatar} alt="" />
										) : (
											<span className="org-lb-avatar-fallback">
												{(entry.firstName[0] || '?') + (entry.lastName[0] || '')}
											</span>
										)}
									</div>
									<div className="org-lb-identity">
										<div className="org-lb-name">
											{entry.firstName} {entry.lastName.toUpperCase()}
											{entry.callsign && (
												<span className="org-lb-callsign">« {entry.callsign} »</span>
											)}
										</div>
										<div className="org-lb-unit">
											{entry.unitInsignia && (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													className="org-lb-unit-insignia"
													src={entry.unitInsignia}
													alt=""
												/>
											)}
											<span className="org-lb-unit-name">
												{entry.unitName || '— SANS UNITÉ —'}
											</span>
										</div>
									</div>
									<div className="org-lb-figures">
										<div className="org-lb-amount">
											<span className="org-lb-amount-currency">$</span>
											{formatMoney(entry.amount)}
										</div>
										<div
											className={`org-lb-delta${
												deltaPositive
													? ' positive'
													: deltaNegative
														? ' negative'
														: ' flat'
											}`}
										>
											{deltaPositive ? '▲' : deltaNegative ? '▼' : '—'}
											<span className="org-lb-delta-val">
												{formatDelta(entry.delta)}$
											</span>
										</div>
									</div>
								</li>
							);
						})}
					</ol>
				</div>
			)}
			{isAdmin && (
				<div style={{ textAlign: 'right', marginTop: '0.75rem' }}>
					<button
						type="button"
						disabled={resetting}
						onClick={async () => {
							if (!window.confirm('Êtes-vous sûr de vouloir réinitialiser le graphique des revenus ? Tout l\'historique bancaire sera supprimé.')) return;
							if (!window.confirm('Cette action est irréversible. Confirmer la suppression ?')) return;
							setResetting(true);
							try {
								const res = await fetch('/api/roleplay/org-stats', { method: 'DELETE' });
								if (res.ok) {
									setStats({ totalMoney: 0, memberCount: 0, history: [], leaderboard: [] });
								}
							} catch {}
							setResetting(false);
						}}
						style={{
							background: 'none',
							border: '1px solid var(--danger)',
							color: 'var(--danger)',
							padding: '0.4rem 0.75rem',
							fontSize: '0.75rem',
							cursor: resetting ? 'not-allowed' : 'pointer',
							opacity: resetting ? 0.5 : 1,
							fontFamily: 'inherit',
						}}
					>
						{resetting ? 'Suppression...' : 'Réinitialiser le graphique'}
					</button>
				</div>
			)}
		</div>
	);
}
