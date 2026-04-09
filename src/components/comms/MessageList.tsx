'use client';

import { useEffect, useRef, useState } from 'react';
import { Reply, ArrowRight, FileText, Newspaper } from 'lucide-react';
import { SafeMarkdown } from '@/lib/safe-markdown';
import type { CommsMessage } from './CommsLayout';
import { AnonymousAvatar } from './AnonymousAvatar';

function formatTimestamp(iso: string): string {
	const d = new Date(iso);
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `[${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
}

export function MessageList({
	messages,
	onDelete,
	onEdit,
	onOpenCharacter,
	onOpenIntel,
	onReply,
	viewerId,
}: {
	messages: CommsMessage[];
	onDelete: (id: number) => void;
	onEdit: (id: number, body: string) => void;
	onOpenCharacter: (id: number) => void;
	onOpenIntel: (id: number) => void;
	onReply?: (message: CommsMessage) => void;
	viewerId?: number;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editText, setEditText] = useState('');

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages.length]);

	if (messages.length === 0) {
		return <div className="comms-message-list comms-empty">Aucun message</div>;
	}

	return (
		<div className="comms-message-list" ref={scrollRef}>
			{messages.map((m) => {
				const sender = m.senderCharacter;
				const initials = sender?.fullName
					? sender.fullName
							.split(' ')
							.map((p) => p[0])
							.slice(0, 2)
							.join('')
					: '?';
				const isEditing = editingId === m.id;
				const mentionsViewer =
					viewerId != null &&
					Array.isArray(m.mentions) &&
					m.mentions.some((x) => x.id === viewerId);

				return (
					<div
						key={m.id}
						id={`comms-msg-${m.id}`}
						className={`comms-message${m.isOwn ? ' own' : ''}${m.isAnonymous ? ' anonymous' : ''}${mentionsViewer ? ' mentions-me' : ''}`}
					>
						<div className="comms-message-avatar">
							{m.isAnonymous ? (
								<AnonymousAvatar size={36} />
							) : sender?.avatarUrl ? (
								<img src={sender.avatarUrl} alt="" />
							) : (
								initials
							)}
						</div>
						<div className="comms-message-body">
							{m.replyTo && (
								<div
									className="comms-message-reply-preview"
									onClick={() => {
										const el = document.getElementById(`comms-msg-${m.replyTo!.id}`);
										if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
									}}
									title="Aller au message d'origine"
								>
									<span className="comms-message-reply-preview-name">
										<Reply size={11} />
										<span>{m.replyTo.senderName}</span>
									</span>
									<span>{m.replyTo.snippet}</span>
								</div>
							)}
							<div className="comms-message-header">
								{!m.isAnonymous && sender?.id ? (
									<button
										type="button"
										className="comms-message-sender comms-sender-link"
										onClick={() => onOpenCharacter(sender.id!)}
									>
										{sender.rankIconUrl && (
											<img
												className="comms-message-rank-icon"
												src={sender.rankIconUrl}
												alt={sender.rankName || ''}
												title={sender.rankName || ''}
											/>
										)}
										{sender.callsign || sender.fullName}
									</button>
								) : (
									<span
										className={`comms-message-sender${m.isAnonymous ? ' anonymous' : ''}`}
									>
										{sender?.rankIconUrl && (
											<img
												className="comms-message-rank-icon"
												src={sender.rankIconUrl}
												alt={sender.rankName || ''}
												title={sender.rankName || ''}
											/>
										)}
										{sender?.callsign || sender?.fullName || '[INCONNU]'}
									</span>
								)}
								{m.postedAsGm && (
									<span className="comms-message-mj-tag" title="Posté en mode MJ (visible aux admins uniquement)">
										[MJ]
									</span>
								)}
								<span className="comms-message-time">
									{formatTimestamp(m.createdAt)}
								</span>
								{m.editedAt && (
									<span className="comms-message-edited">(modifié)</span>
								)}
								<div className="comms-message-actions">
									{onReply && !isEditing && (
										<button
											className="comms-message-action comms-icon-btn-with-icon"
											onClick={() => onReply(m)}
											title="Répondre"
										>
											<Reply size={11} />
											<span>Répondre</span>
										</button>
									)}
									{m.isOwn && !isEditing && (
										<>
											<button
												className="comms-message-action"
												onClick={() => {
													setEditingId(m.id);
													setEditText(m.body);
												}}
											>
												Modifier
											</button>
											<button
												className="comms-message-action"
												onClick={() => onDelete(m.id)}
											>
												Supprimer
											</button>
										</>
									)}
								</div>
							</div>
							{isEditing ? (
								<div>
									<textarea
										value={editText}
										onChange={(e) => setEditText(e.target.value)}
										style={{
											width: '100%',
											minHeight: '60px',
											background: 'rgba(0,0,0,0.6)',
											border: '1px solid var(--primary)',
											color: 'var(--text)',
											padding: '0.4rem',
											fontFamily: 'inherit',
										}}
									/>
									<div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.25rem' }}>
										<button
											className="comms-message-action"
											onClick={() => {
												onEdit(m.id, editText);
												setEditingId(null);
											}}
										>
											Sauvegarder
										</button>
										<button
											className="comms-message-action"
											onClick={() => setEditingId(null)}
										>
											Annuler
										</button>
									</div>
								</div>
							) : (
								<>
									<SafeMarkdown source={m.body} />
									{m.attachments && m.attachments.length > 0 && (
										<div className="comms-attachments">
											{m.attachments.map((att: any, idx: number) => (
												<AttachmentCard
													key={idx}
													att={att}
													onOpenCharacter={onOpenCharacter}
													onOpenIntel={onOpenIntel}
												/>
											))}
										</div>
									)}
								</>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function AttachmentCard({
	att,
	onOpenCharacter,
	onOpenIntel,
}: {
	att: any;
	onOpenCharacter: (id: number) => void;
	onOpenIntel: (id: number) => void;
}) {
	if (att.kind === 'character') {
		return (
			<button
				type="button"
				className="comms-attachment comms-attachment-button"
				onClick={() => onOpenCharacter(att.refId)}
			>
				<FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
				<span style={{ color: 'var(--primary)' }}>FICHE</span>
				<span style={{ color: 'var(--text)' }}>
					{att.meta?.fullName || `Personnage #${att.refId}`}
				</span>
				{att.meta?.rankName && (
					<span style={{ color: 'var(--muted)' }}>· {att.meta.rankName}</span>
				)}
				<span
					style={{
						color: 'var(--muted)',
						marginLeft: 'auto',
						fontSize: '0.7rem',
						display: 'flex',
						alignItems: 'center',
						gap: '0.2rem',
					}}
				>
					Ouvrir <ArrowRight size={11} />
				</span>
			</button>
		);
	}
	if (att.kind === 'intel') {
		return (
			<button
				type="button"
				className="comms-attachment comms-attachment-button"
				onClick={() => onOpenIntel(att.refId)}
			>
				<Newspaper size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
				<span style={{ color: 'var(--primary)' }}>RENS</span>
				<span style={{ color: 'var(--text)' }}>
					{att.meta?.title || `Renseignement #${att.refId}`}
				</span>
				<span
					style={{
						color: 'var(--muted)',
						marginLeft: 'auto',
						fontSize: '0.7rem',
						display: 'flex',
						alignItems: 'center',
						gap: '0.2rem',
					}}
				>
					Ouvrir <ArrowRight size={11} />
				</span>
			</button>
		);
	}
	if (att.kind === 'media') {
		const url = att.meta?.url || '';
		const mime = att.meta?.mimeType || '';
		if (mime.startsWith('image/')) {
			return (
				<div className="comms-attachment">
					<img src={url} alt={att.meta?.filename || ''} />
				</div>
			);
		}
		if (mime.startsWith('video/')) {
			return (
				<div className="comms-attachment">
					<video src={url} controls />
				</div>
			);
		}
		return (
			<div className="comms-attachment">
				<a href={url} target="_blank" rel="noopener noreferrer">
					{att.meta?.filename || 'Fichier'}
				</a>
			</div>
		);
	}
	return null;
}
