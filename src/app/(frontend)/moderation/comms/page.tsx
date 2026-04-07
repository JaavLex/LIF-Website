'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import '../moderation.css';

interface ModChannel {
	id: number;
	name: string;
	type: 'faction' | 'unit' | 'dm' | 'group';
	memberCount: number;
	lastMessageAt?: string | null;
	createdAt: string;
}

interface ModAttachment {
	messageId: number;
	channelId: number;
	channelName?: string;
	createdAt: string;
	senderName?: string;
	kind: string;
	meta: any;
}

interface ModLink {
	messageId: number;
	channelId: number;
	channelName?: string;
	createdAt: string;
	senderName?: string;
	url: string;
}

interface ModMessage {
	id: number;
	body: string;
	attachments: any[];
	isAnonymous: boolean;
	realSender: { id?: number; fullName: string; discordUsername?: string; rankName?: string | null };
	senderDiscordId?: string;
	senderIp?: string;
	editedAt?: string | null;
	deletedAt?: string | null;
	deletedBy?: string | null;
	createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
	faction: 'Faction',
	unit: 'Unité',
	dm: 'DM',
	group: 'Groupe',
};

export default function ModerationCommsPage() {
	const [channels, setChannels] = useState<ModChannel[]>([]);
	const [activeId, setActiveId] = useState<number | null>(null);
	const [messages, setMessages] = useState<ModMessage[]>([]);
	const [loading, setLoading] = useState(true);
	const [typeFilter, setTypeFilter] = useState('');
	const [search, setSearch] = useState('');
	const [msgSearch, setMsgSearch] = useState('');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [error, setError] = useState('');
	const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
	const [recentAttachments, setRecentAttachments] = useState<ModAttachment[]>([]);
	const [recentLinks, setRecentLinks] = useState<ModLink[]>([]);
	const [attachmentsLoading, setAttachmentsLoading] = useState(false);

	const loadAttachments = useCallback(async () => {
		setAttachmentsLoading(true);
		try {
			const res = await fetch('/api/moderation/comms/attachments?limit=300');
			if (!res.ok) {
				const d = await res.json().catch(() => ({}));
				throw new Error(d.error || `Erreur ${res.status}`);
			}
			const data = await res.json();
			setRecentAttachments(data.attachments || []);
			setRecentLinks(data.links || []);
		} catch (e: any) {
			setError(e.message);
		} finally {
			setAttachmentsLoading(false);
		}
	}, []);

	const loadChannels = useCallback(async () => {
		try {
			const params = new URLSearchParams();
			if (typeFilter) params.set('type', typeFilter);
			if (search) params.set('search', search);
			const res = await fetch(`/api/moderation/comms/channels?${params}`);
			if (!res.ok) {
				const d = await res.json().catch(() => ({}));
				throw new Error(d.error || `Erreur ${res.status}`);
			}
			const data = await res.json();
			setChannels(data.channels || []);
			setLoading(false);
		} catch (e: any) {
			setError(e.message);
			setLoading(false);
		}
	}, [typeFilter, search]);

	const loadMessages = useCallback(
		async (channelId: number) => {
			try {
				const params = new URLSearchParams();
				if (msgSearch) params.set('search', msgSearch);
				if (dateFrom) params.set('dateFrom', dateFrom);
				if (dateTo) params.set('dateTo', dateTo);
				const res = await fetch(
					`/api/moderation/comms/channels/${channelId}/messages?${params}`,
				);
				if (!res.ok) {
					const d = await res.json().catch(() => ({}));
					throw new Error(d.error || `Erreur ${res.status}`);
				}
				const data = await res.json();
				setMessages(data.messages || []);
			} catch (e: any) {
				setError(e.message);
			}
		},
		[msgSearch, dateFrom, dateTo],
	);

	useEffect(() => {
		loadChannels();
	}, [loadChannels]);

	useEffect(() => {
		if (activeId) loadMessages(activeId);
	}, [activeId, loadMessages]);

	async function handleAction(messageId: number, action: 'delete' | 'restore') {
		const res = await fetch(`/api/moderation/comms/messages/${messageId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action }),
		});
		if (!res.ok) {
			const d = await res.json().catch(() => ({}));
			setError(d.error || 'Erreur');
			return;
		}
		if (activeId) loadMessages(activeId);
	}

	if (loading) {
		return (
			<div className="mod-page">
				<div className="mod-container">
					<div className="mod-loading">Chargement des canaux...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mod-page">
			<div className="mod-container">
				<div className="mod-header">
					<div className="mod-header-left">
						<span className="mod-header-title">⚖️ Modération COMMS</span>
					</div>
					<div className="mod-header-right">
						<button
							className="mod-header-btn"
							onClick={() => {
								setShowAttachmentsModal(true);
								loadAttachments();
							}}
						>
							📎 Pièces jointes & liens
						</button>
						<Link href="/moderation" className="mod-header-btn">
							← Modération
						</Link>
					</div>
				</div>

				{error && <div className="mod-error">{error}</div>}

				<div
					className="mod-panel"
					style={{
						display: 'grid',
						gridTemplateColumns: '320px 1fr',
						gap: '0.75rem',
						minHeight: '70vh',
					}}
				>
					{/* Channel sidebar */}
					<div style={{ borderRight: '1px solid var(--primary-dim)', paddingRight: '0.75rem' }}>
						<div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
							<select
								value={typeFilter}
								onChange={(e) => setTypeFilter(e.target.value)}
								style={{
									flex: 1,
									background: 'rgba(0,0,0,0.6)',
									border: '1px solid var(--primary)',
									color: 'var(--text)',
									padding: '0.3rem',
								}}
							>
								<option value="">Tous types</option>
								<option value="faction">Factions</option>
								<option value="unit">Unités</option>
								<option value="group">Groupes</option>
								<option value="dm">DMs</option>
							</select>
						</div>
						<input
							type="text"
							placeholder="Rechercher canal..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							style={{
								width: '100%',
								marginBottom: '0.5rem',
								background: 'rgba(0,0,0,0.6)',
								border: '1px solid var(--primary)',
								color: 'var(--text)',
								padding: '0.3rem',
							}}
						/>
						<div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
							{channels.map((ch) => (
								<div
									key={ch.id}
									onClick={() => setActiveId(ch.id)}
									style={{
										padding: '0.5rem',
										cursor: 'pointer',
										borderBottom: '1px solid rgba(255,255,255,0.05)',
										background:
											activeId === ch.id ? 'rgba(0,255,170,0.1)' : 'transparent',
									}}
								>
									<div style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
										[{TYPE_LABELS[ch.type]}] {ch.name}
									</div>
									<div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
										{ch.memberCount} membres ·{' '}
										{ch.lastMessageAt
											? new Date(ch.lastMessageAt).toLocaleString('fr-FR')
											: 'jamais'}
									</div>
								</div>
							))}
							{channels.length === 0 && (
								<p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Aucun canal</p>
							)}
						</div>
					</div>

					{/* Messages */}
					<div>
						{!activeId ? (
							<p style={{ color: 'var(--muted)' }}>Sélectionnez un canal</p>
						) : (
							<>
								<div
									style={{
										display: 'flex',
										gap: '0.4rem',
										marginBottom: '0.5rem',
										flexWrap: 'wrap',
									}}
								>
									<input
										type="text"
										placeholder="Rechercher dans messages..."
										value={msgSearch}
										onChange={(e) => setMsgSearch(e.target.value)}
										style={{
											flex: '1 1 200px',
											background: 'rgba(0,0,0,0.6)',
											border: '1px solid var(--primary)',
											color: 'var(--text)',
											padding: '0.3rem',
										}}
									/>
									<input
										type="date"
										value={dateFrom}
										onChange={(e) => setDateFrom(e.target.value)}
										style={{
											background: 'rgba(0,0,0,0.6)',
											border: '1px solid var(--primary)',
											color: 'var(--text)',
											padding: '0.3rem',
										}}
									/>
									<input
										type="date"
										value={dateTo}
										onChange={(e) => setDateTo(e.target.value)}
										style={{
											background: 'rgba(0,0,0,0.6)',
											border: '1px solid var(--primary)',
											color: 'var(--text)',
											padding: '0.3rem',
										}}
									/>
									<button
										className="mod-btn"
										onClick={() => activeId && loadMessages(activeId)}
									>
										Filtrer
									</button>
								</div>
								<div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
									{messages.map((m) => (
										<div
											key={m.id}
											style={{
												padding: '0.5rem',
												borderBottom: '1px solid rgba(255,255,255,0.05)',
												opacity: m.deletedAt ? 0.5 : 1,
											}}
										>
											<div
												style={{
													display: 'flex',
													gap: '0.5rem',
													alignItems: 'baseline',
													fontSize: '0.75rem',
												}}
											>
												<strong style={{ color: 'var(--primary)' }}>
													{m.realSender.rankName ? `${m.realSender.rankName} ` : ''}
													{m.realSender.fullName}
												</strong>
												{m.realSender.discordUsername && (
													<span style={{ color: 'var(--muted)' }}>
														@{m.realSender.discordUsername}
													</span>
												)}
												{m.isAnonymous && (
													<span style={{ color: 'var(--danger)' }}>[ANON]</span>
												)}
												<span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>
													{new Date(m.createdAt).toLocaleString('fr-FR')}
												</span>
											</div>
											<div
												style={{
													fontSize: '0.85rem',
													marginTop: '0.25rem',
													whiteSpace: 'pre-wrap',
													textDecoration: m.deletedAt ? 'line-through' : 'none',
												}}
											>
												{m.body}
											</div>
											{m.attachments && m.attachments.length > 0 && (
												<div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
													📎 {m.attachments.length} pièce(s) jointe(s):{' '}
													{m.attachments
														.map(
															(a: any) =>
																`${a.kind}${a.meta?.filename || a.meta?.fullName || a.meta?.title ? `:${a.meta?.filename || a.meta?.fullName || a.meta?.title}` : ''}`,
														)
														.join(', ')}
												</div>
											)}
											<div
												style={{
													fontSize: '0.65rem',
													color: 'var(--muted)',
													marginTop: '0.25rem',
												}}
											>
												ID: {m.id}
												{m.senderIp && ` · IP: ${m.senderIp}`}
												{m.editedAt && ` · modifié ${new Date(m.editedAt).toLocaleString('fr-FR')}`}
												{m.deletedAt &&
													` · supprimé ${new Date(m.deletedAt).toLocaleString('fr-FR')}`}
											</div>
											<div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.25rem' }}>
												{m.deletedAt ? (
													<button
														className="mod-btn"
														onClick={() => handleAction(m.id, 'restore')}
													>
														Restaurer
													</button>
												) : (
													<button
														className="mod-btn danger"
														onClick={() => handleAction(m.id, 'delete')}
													>
														Supprimer
													</button>
												)}
											</div>
										</div>
									))}
									{messages.length === 0 && (
										<p style={{ color: 'var(--muted)' }}>Aucun message</p>
									)}
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{showAttachmentsModal && (
				<div
					className="comms-modal-backdrop"
					onClick={() => setShowAttachmentsModal(false)}
					style={{
						position: 'fixed',
						inset: 0,
						background: 'rgba(0,0,0,0.85)',
						zIndex: 1000,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: '1rem',
					}}
				>
					<div
						onClick={(e) => e.stopPropagation()}
						style={{
							background: 'var(--background)',
							border: '1px solid var(--primary)',
							maxWidth: '900px',
							width: '100%',
							maxHeight: '90vh',
							overflowY: 'auto',
							padding: '1.5rem',
						}}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '0.75rem',
							}}
						>
							<h2 style={{ color: 'var(--primary)', margin: 0 }}>
								Pièces jointes & liens récents
							</h2>
							<button
								className="mod-btn"
								onClick={() => setShowAttachmentsModal(false)}
							>
								✕
							</button>
						</div>
						{attachmentsLoading ? (
							<div style={{ color: 'var(--muted)' }}>Chargement…</div>
						) : (
							<>
								<h3 style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
									Médias ({recentAttachments.filter((a) => a.kind === 'media').length})
								</h3>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
										gap: '0.5rem',
										marginBottom: '1rem',
									}}
								>
									{recentAttachments
										.filter((a) => a.kind === 'media')
										.map((a, idx) => {
											const mime = a.meta?.mimeType || '';
											const url = a.meta?.url || '';
											return (
												<div
													key={`m${idx}`}
													style={{
														border: '1px solid var(--primary)',
														padding: '0.4rem',
														fontSize: '0.7rem',
														background: 'rgba(0,0,0,0.4)',
													}}
												>
													{mime.startsWith('image/') ? (
														<a href={url} target="_blank" rel="noopener noreferrer">
															<img
																src={url}
																alt=""
																style={{ width: '100%', height: 100, objectFit: 'cover' }}
															/>
														</a>
													) : (
														<a
															href={url}
															target="_blank"
															rel="noopener noreferrer"
															style={{ color: 'var(--primary)' }}
														>
															{a.meta?.filename || 'Fichier'}
														</a>
													)}
													<div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
														{a.senderName || '?'} · {a.channelName || `#${a.channelId}`}
													</div>
													<div style={{ color: 'var(--muted)' }}>
														{new Date(a.createdAt).toLocaleString('fr-FR')}
													</div>
												</div>
											);
										})}
									{recentAttachments.filter((a) => a.kind === 'media').length === 0 && (
										<div style={{ color: 'var(--muted)', gridColumn: '1/-1' }}>
											Aucun média
										</div>
									)}
								</div>

								<h3 style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
									Liens détectés ({recentLinks.length})
								</h3>
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '0.3rem',
										fontSize: '0.75rem',
									}}
								>
									{recentLinks.map((l, idx) => (
										<div
											key={`l${idx}`}
											style={{
												borderBottom: '1px solid rgba(255,255,255,0.05)',
												padding: '0.3rem 0',
											}}
										>
											<a
												href={l.url}
												target="_blank"
												rel="noopener noreferrer"
												style={{
													color: 'var(--primary)',
													wordBreak: 'break-all',
												}}
											>
												{l.url}
											</a>
											<div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
												{l.senderName || '?'} · {l.channelName || `#${l.channelId}`} ·{' '}
												{new Date(l.createdAt).toLocaleString('fr-FR')}
											</div>
										</div>
									))}
									{recentLinks.length === 0 && (
										<div style={{ color: 'var(--muted)' }}>Aucun lien détecté</div>
									)}
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
