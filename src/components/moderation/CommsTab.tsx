'use client';

import { useEffect, useState, useCallback } from 'react';

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
	realSender: {
		id?: number;
		fullName: string;
		discordUsername?: string;
		rankName?: string | null;
	};
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

interface CommsTabProps {
	authorized: boolean;
	onError: (error: string) => void;
}

export default function CommsTab({ authorized, onError }: CommsTabProps) {
	const [channels, setChannels] = useState<ModChannel[]>([]);
	const [activeId, setActiveId] = useState<number | null>(null);
	const [messages, setMessages] = useState<ModMessage[]>([]);
	const [loading, setLoading] = useState(true);
	const [typeFilter, setTypeFilter] = useState('');
	const [search, setSearch] = useState('');
	const [msgSearch, setMsgSearch] = useState('');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
	const [recentAttachments, setRecentAttachments] = useState<ModAttachment[]>(
		[],
	);
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
			onError(e.message);
		} finally {
			setAttachmentsLoading(false);
		}
	}, [onError]);

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
			onError(e.message);
			setLoading(false);
		}
	}, [typeFilter, search, onError]);

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
				onError(e.message);
			}
		},
		[msgSearch, dateFrom, dateTo, onError],
	);

	useEffect(() => {
		if (authorized) loadChannels();
	}, [loadChannels, authorized]);

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
			onError(d.error || 'Erreur');
			return;
		}
		if (activeId) loadMessages(activeId);
	}

	if (loading) {
		return <div className="mod-loading">Chargement des canaux</div>;
	}

	const activeChannel = channels.find(c => c.id === activeId) || null;

	return (
		<div className="mod-comms">
			<div className="mod-comms-toolbar">
				<button
					className="mod-btn"
					onClick={() => {
						setShowAttachmentsModal(true);
						loadAttachments();
					}}
				>
					Pièces jointes & liens
				</button>
			</div>

			<div className="mod-comms-grid">
				{/* Channel sidebar */}
				<aside className="mod-comms-sidebar">
					<div className="mod-comms-sidebar-filters">
						<select
							className="mod-comms-select"
							value={typeFilter}
							onChange={e => setTypeFilter(e.target.value)}
						>
							<option value="">Tous types</option>
							<option value="faction">Factions</option>
							<option value="unit">Unités</option>
							<option value="group">Groupes</option>
							<option value="dm">DMs</option>
						</select>
						<input
							className="mod-comms-input"
							type="text"
							placeholder="Rechercher canal…"
							value={search}
							onChange={e => setSearch(e.target.value)}
						/>
					</div>
					<div className="mod-comms-channel-list">
						{channels.map(ch => (
							<button
								type="button"
								key={ch.id}
								onClick={() => setActiveId(ch.id)}
								className={`mod-comms-channel${activeId === ch.id ? ' active' : ''}`}
							>
								<span className="mod-comms-channel-type">
									{TYPE_LABELS[ch.type]}
								</span>
								<span className="mod-comms-channel-name">{ch.name}</span>
								<span className="mod-comms-channel-meta">
									{ch.memberCount} membres ·{' '}
									{ch.lastMessageAt
										? new Date(ch.lastMessageAt).toLocaleString('fr-FR')
										: 'jamais'}
								</span>
							</button>
						))}
						{channels.length === 0 && (
							<p className="mod-comms-empty">Aucun canal</p>
						)}
					</div>
				</aside>

				{/* Messages */}
				<section className="mod-comms-messages">
					{!activeId ? (
						<p className="mod-comms-empty">Sélectionnez un canal</p>
					) : (
						<>
							<div className="mod-comms-header">
								<div className="mod-comms-header-title">
									{activeChannel && (
										<>
											<span className="mod-comms-channel-type">
												{TYPE_LABELS[activeChannel.type]}
											</span>
											<strong>{activeChannel.name}</strong>
										</>
									)}
								</div>
								<div className="mod-comms-filters">
									<input
										className="mod-comms-input"
										type="text"
										placeholder="Rechercher dans messages…"
										value={msgSearch}
										onChange={e => setMsgSearch(e.target.value)}
									/>
									<input
										className="mod-comms-input"
										type="date"
										value={dateFrom}
										onChange={e => setDateFrom(e.target.value)}
									/>
									<input
										className="mod-comms-input"
										type="date"
										value={dateTo}
										onChange={e => setDateTo(e.target.value)}
									/>
									<button
										className="mod-btn"
										onClick={() => activeId && loadMessages(activeId)}
									>
										Filtrer
									</button>
								</div>
							</div>
							<div className="mod-comms-message-list">
								{messages.map(m => (
									<article
										key={m.id}
										className={`mod-comms-message${m.deletedAt ? ' deleted' : ''}`}
									>
										<header className="mod-comms-message-header">
											<strong className="mod-comms-message-sender">
												{m.realSender.rankName ? `${m.realSender.rankName} ` : ''}
												{m.realSender.fullName}
											</strong>
											{m.realSender.discordUsername && (
												<span className="mod-comms-message-discord">
													@{m.realSender.discordUsername}
												</span>
											)}
											{m.isAnonymous && (
												<span className="mod-comms-message-anon">[ANON]</span>
											)}
											<span className="mod-comms-message-date">
												{new Date(m.createdAt).toLocaleString('fr-FR')}
											</span>
										</header>
										<div className="mod-comms-message-body">{m.body}</div>
										{m.attachments && m.attachments.length > 0 && (
											<div className="mod-comms-message-attachments">
												{m.attachments.length} pièce(s) jointe(s):{' '}
												{m.attachments
													.map(
														(a: any) =>
															`${a.kind}${a.meta?.filename || a.meta?.fullName || a.meta?.title ? `:${a.meta?.filename || a.meta?.fullName || a.meta?.title}` : ''}`,
													)
													.join(', ')}
											</div>
										)}
										<div className="mod-comms-message-meta">
											ID: {m.id}
											{m.senderIp && ` · IP: ${m.senderIp}`}
											{m.editedAt &&
												` · modifié ${new Date(m.editedAt).toLocaleString('fr-FR')}`}
											{m.deletedAt &&
												` · supprimé ${new Date(m.deletedAt).toLocaleString('fr-FR')}`}
										</div>
										<div className="mod-comms-message-actions">
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
									</article>
								))}
								{messages.length === 0 && (
									<p className="mod-comms-empty">Aucun message</p>
								)}
							</div>
						</>
					)}
				</section>
			</div>

			{showAttachmentsModal && (
				<div
					className="mod-comms-modal-backdrop"
					onClick={() => setShowAttachmentsModal(false)}
				>
					<div
						className="mod-comms-modal"
						onClick={e => e.stopPropagation()}
					>
						<div className="mod-comms-modal-header">
							<h2>Pièces jointes & liens récents</h2>
							<button
								className="mod-btn"
								onClick={() => setShowAttachmentsModal(false)}
							>
								✕
							</button>
						</div>
						{attachmentsLoading ? (
							<div className="mod-loading">Chargement</div>
						) : (
							<>
								<h3 className="mod-comms-modal-section-title">
									Médias (
									{recentAttachments.filter(a => a.kind === 'media').length})
								</h3>
								<div className="mod-comms-media-grid">
									{recentAttachments
										.filter(a => a.kind === 'media')
										.map((a, idx) => {
											const mime = a.meta?.mimeType || '';
											const url = a.meta?.url || '';
											return (
												<div className="mod-comms-media-card" key={`m${idx}`}>
													{mime.startsWith('image/') ? (
														<a
															href={url}
															target="_blank"
															rel="noopener noreferrer"
														>
															<img src={url} alt="" />
														</a>
													) : (
														<a
															href={url}
															target="_blank"
															rel="noopener noreferrer"
															className="mod-comms-media-link"
														>
															{a.meta?.filename || 'Fichier'}
														</a>
													)}
													<div className="mod-comms-media-meta">
														{a.senderName || '?'} ·{' '}
														{a.channelName || `#${a.channelId}`}
													</div>
													<div className="mod-comms-media-meta">
														{new Date(a.createdAt).toLocaleString('fr-FR')}
													</div>
												</div>
											);
										})}
									{recentAttachments.filter(a => a.kind === 'media').length ===
										0 && <div className="mod-comms-empty">Aucun média</div>}
								</div>

								<h3 className="mod-comms-modal-section-title">
									Liens détectés ({recentLinks.length})
								</h3>
								<div className="mod-comms-link-list">
									{recentLinks.map((l, idx) => (
										<div className="mod-comms-link-row" key={`l${idx}`}>
											<a
												href={l.url}
												target="_blank"
												rel="noopener noreferrer"
												className="mod-comms-link-url"
											>
												{l.url}
											</a>
											<div className="mod-comms-media-meta">
												{l.senderName || '?'} ·{' '}
												{l.channelName || `#${l.channelId}`} ·{' '}
												{new Date(l.createdAt).toLocaleString('fr-FR')}
											</div>
										</div>
									))}
									{recentLinks.length === 0 && (
										<div className="mod-comms-empty">Aucun lien détecté</div>
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
