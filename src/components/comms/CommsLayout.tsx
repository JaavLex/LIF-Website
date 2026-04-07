'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
	playNotification,
	playRadioPing,
	isCommsMuted,
	setCommsMuted,
} from '@/lib/comms-sounds';
import type { ActiveCharacter } from '@/lib/comms';
import { ChannelList } from './ChannelList';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { DisclaimerModal } from './DisclaimerModal';
import { NewDmModal } from './NewDmModal';
import { NewGroupModal } from './NewGroupModal';
import { MembersPanel } from './MembersPanel';
import { CharacterProfileModal } from './CharacterProfileModal';
import { IntelPreviewModal } from './IntelPreviewModal';

export interface CommsChannelDisplayMember {
	id: number;
	fullName: string;
	avatarUrl: string | null;
}

export interface CommsChannel {
	id: number;
	name: string;
	type: 'faction' | 'unit' | 'dm' | 'group';
	factionRef?: string | null;
	unitRefId?: number | null;
	memberCount: number;
	members: number[];
	createdByCharacterId?: number | null;
	lastMessageAt?: string | null;
	lastMessagePreview?: string | null;
	lastMessageMentionsViewer?: boolean;
	iconUrl?: string | null;
	subtitle?: string | null;
	displayMembers?: CommsChannelDisplayMember[];
	dmOther?: CommsChannelDisplayMember | null;
	anonForCharacterId?: number | null;
	isAnonForViewer?: boolean;
	isAnonInitiatedByViewer?: boolean;
}

export interface CommsMessage {
	id: number;
	channelId: number;
	body: string;
	attachments: any[];
	isAnonymous: boolean;
	senderCharacter: {
		id?: number;
		fullName: string;
		avatarUrl?: string | null;
		rankName?: string | null;
		rankIconUrl?: string | null;
	} | null;
	senderCharacterId?: number | null;
	replyTo?: { id: number; snippet: string; senderName: string } | null;
	mentions?: Array<{ id: number; name: string }>;
	editedAt?: string | null;
	createdAt: string;
	isOwn: boolean;
}

export function CommsLayout({ character }: { character: ActiveCharacter }) {
	const searchParams = useSearchParams();
	const requestedChannelId = (() => {
		const v = searchParams?.get('channel');
		const n = v ? parseInt(v, 10) : NaN;
		return isNaN(n) ? null : n;
	})();
	const [channels, setChannels] = useState<CommsChannel[]>([]);
	const [activeId, setActiveId] = useState<number | null>(null);
	const [messages, setMessages] = useState<CommsMessage[]>([]);
	const [loading, setLoading] = useState(true);
	const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean | null>(null);
	const [bannerClosed, setBannerClosed] = useState(false);
	const [muted, setMuted] = useState(false);
	const [showNewDm, setShowNewDm] = useState(false);
	const [showNewGroup, setShowNewGroup] = useState(false);
	const [showMembers, setShowMembers] = useState(false);
	const [profileCharacterId, setProfileCharacterId] = useState<number | null>(null);
	const [previewIntelId, setPreviewIntelId] = useState<number | null>(null);
	const [mobileShowMain, setMobileShowMain] = useState(false);
	const [replyingTo, setReplyingTo] = useState<CommsMessage | null>(null);
	const [channelMembers, setChannelMembers] = useState<
		Array<{ id: number; fullName: string; avatarUrl: string | null }>
	>([]);
	const [typingUsers, setTypingUsers] = useState<Array<{ id: number; fullName: string }>>([]);
	const lastTypingPingRef = useRef<number>(0);
	const [onlineMemberIds, setOnlineMemberIds] = useState<number[]>([]);
	const [toasts, setToasts] = useState<Array<{ id: number; channelId: number; channelName: string; snippet: string }>>([]);
	// Tracks the last seen lastMessageAt per channel so we only toast on advances
	const seenLastMessageAtRef = useRef<Map<number, string>>(new Map());
	const initializedSeenRef = useRef(false);
	const toastIdRef = useRef(0);
	const pollingRef = useRef<NodeJS.Timeout | null>(null);

	const loadChannels = useCallback(async () => {
		try {
			const res = await fetch('/api/comms/channels');
			if (!res.ok) return;
			const data = await res.json();
			const newChannels: CommsChannel[] = data.channels || [];
			setChannels(newChannels);
			if (!activeId && newChannels.length) {
				const requested =
					requestedChannelId &&
					newChannels.find((c) => c.id === requestedChannelId);
				setActiveId(requested ? requested.id : newChannels[0].id);
			}

			// Detect channels that advanced since last poll → toast (skip active
			// channel and skip the very first load).
			const seen = seenLastMessageAtRef.current;
			if (initializedSeenRef.current) {
				for (const ch of newChannels) {
					if (!ch.lastMessageAt) continue;
					const prev = seen.get(ch.id);
					if (prev && ch.lastMessageAt > prev) {
						const isActive = ch.id === activeId;
						const mention = !!ch.lastMessageMentionsViewer;
						if (!isActive) {
							const toastId = ++toastIdRef.current;
							setToasts((t) => [
								...t,
								{
									id: toastId,
									channelId: ch.id,
									channelName: ch.name,
									snippet: ch.lastMessagePreview || '',
								},
							]);
							setTimeout(() => {
								setToasts((t) => t.filter((x) => x.id !== toastId));
							}, 6000);
							if (mention) playRadioPing();
							else playNotification();
						} else if (mention) {
							// Active channel but mentions us → still play radio ping
							playRadioPing();
						}
					}
				}
			}
			for (const ch of newChannels) {
				if (ch.lastMessageAt) seen.set(ch.id, ch.lastMessageAt);
			}
			initializedSeenRef.current = true;
		} catch {}
	}, [activeId, requestedChannelId]);

	const loadMessages = useCallback(async (channelId: number) => {
		try {
			const res = await fetch(`/api/comms/channels/${channelId}/messages`);
			if (!res.ok) return;
			const data = await res.json();
			setMessages(data.messages || []);
		} catch {}
	}, []);

	const loadTyping = useCallback(async (channelId: number) => {
		try {
			const res = await fetch(`/api/comms/channels/${channelId}/typing`);
			if (!res.ok) return;
			const data = await res.json();
			setTypingUsers(data.typing || []);
		} catch {}
	}, []);

	const pingTyping = useCallback(() => {
		if (!activeId) return;
		const now = Date.now();
		// Throttle to one POST per 3s while user is actively typing
		if (now - lastTypingPingRef.current < 3000) return;
		lastTypingPingRef.current = now;
		void fetch(`/api/comms/channels/${activeId}/typing`, { method: 'POST' }).catch(
			() => {},
		);
	}, [activeId]);

	const checkEligibility = useCallback(async () => {
		try {
			const res = await fetch('/api/comms/eligibility');
			const data = await res.json();
			if (data.eligible) {
				setDisclaimerAccepted(!!data.disclaimerAccepted);
			}
		} catch {}
	}, []);

	useEffect(() => {
		checkEligibility();
		loadChannels().then(() => setLoading(false));
	}, [checkEligibility, loadChannels]);

	// Hydrate persisted UI state on mount
	useEffect(() => {
		if (typeof window === 'undefined') return;
		setBannerClosed(window.localStorage.getItem('comms.banner.closed') === '1');
		setMuted(isCommsMuted());
		const onMuteChange = (e: Event) => {
			setMuted((e as CustomEvent).detail);
		};
		window.addEventListener('comms-mute-change', onMuteChange);
		return () => window.removeEventListener('comms-mute-change', onMuteChange);
	}, []);

	const closeBanner = useCallback(() => {
		setBannerClosed(true);
		if (typeof window !== 'undefined') {
			window.localStorage.setItem('comms.banner.closed', '1');
		}
	}, []);

	const toggleMuted = useCallback(() => {
		setMuted((m) => {
			const next = !m;
			setCommsMuted(next);
			return next;
		});
	}, []);

	// Presence heartbeat: ping every 30s while page is mounted
	useEffect(() => {
		const ping = () => {
			void fetch('/api/comms/presence', { method: 'POST' }).catch(() => {});
		};
		ping();
		const interval = setInterval(ping, 30_000);
		return () => clearInterval(interval);
	}, []);

	// Fetch online state for current channel members
	useEffect(() => {
		const ids = channelMembers.map((m) => m.id);
		if (ids.length === 0) {
			setOnlineMemberIds([]);
			return;
		}
		const fetchOnline = () => {
			void fetch(`/api/comms/presence?ids=${ids.join(',')}`)
				.then((r) => (r.ok ? r.json() : { online: [] }))
				.then((d) => setOnlineMemberIds(d.online || []))
				.catch(() => {});
		};
		fetchOnline();
		const interval = setInterval(fetchOnline, 15_000);
		return () => clearInterval(interval);
	}, [channelMembers]);

	useEffect(() => {
		if (!activeId) return;
		setReplyingTo(null);
		// Load channel members for the mention picker (one-shot per channel switch)
		fetch(`/api/comms/channels/${activeId}/members`)
			.then((r) => (r.ok ? r.json() : { members: [] }))
			.then((d) =>
				setChannelMembers(
					(d.members || []).map((m: any) => ({
						id: m.id,
						fullName: m.fullName,
						avatarUrl: m.avatarUrl ?? null,
					})),
				),
			)
			.catch(() => setChannelMembers([]));
		loadMessages(activeId);
		loadTyping(activeId);
		setTypingUsers([]);
		// Polling
		const intervalMs = document.hidden ? 30_000 : 3_000;
		if (pollingRef.current) clearInterval(pollingRef.current);
		pollingRef.current = setInterval(() => {
			loadMessages(activeId);
			loadChannels();
			loadTyping(activeId);
		}, intervalMs);
		return () => {
			if (pollingRef.current) clearInterval(pollingRef.current);
		};
	}, [activeId, loadMessages, loadChannels, loadTyping]);

	async function handleSend(payload: {
		body: string;
		isAnonymous: boolean;
		attachments: any[];
		replyToMessageId?: number | null;
	}) {
		if (!activeId) return;
		const res = await fetch(`/api/comms/channels/${activeId}/messages`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		if (res.ok) {
			loadMessages(activeId);
			loadChannels();
		} else {
			const data = await res.json().catch(() => ({}));
			if (data.error === 'disclaimer_required') {
				setDisclaimerAccepted(false);
			} else {
				alert(data.error || 'Erreur d\'envoi');
			}
		}
	}

	async function handleAcceptDisclaimer() {
		const res = await fetch('/api/comms/disclaimer/accept', { method: 'POST' });
		if (res.ok) setDisclaimerAccepted(true);
	}

	async function handleDelete(messageId: number) {
		if (!confirm('Supprimer ce message ?')) return;
		await fetch(`/api/comms/messages/${messageId}`, { method: 'DELETE' });
		if (activeId) loadMessages(activeId);
	}

	async function handleEdit(messageId: number, newBody: string) {
		await fetch(`/api/comms/messages/${messageId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ body: newBody }),
		});
		if (activeId) loadMessages(activeId);
	}

	async function handleLeaveOrClose(channel: CommsChannel) {
		const isGroup = channel.type === 'group';
		const isDm = channel.type === 'dm';
		if (!isGroup && !isDm) return;
		const confirmMsg = isGroup
			? 'Quitter ce groupe ? Les autres membres seront notifiés.'
			: 'Fermer cette conversation ? Elle sera supprimée pour les deux participants.';
		if (!confirm(confirmMsg)) return;
		const res = await fetch(`/api/comms/channels/${channel.id}`, { method: 'DELETE' });
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			alert(data.error || 'Erreur');
			return;
		}
		setActiveId(null);
		setMessages([]);
		await loadChannels();
	}

	const activeChannel = channels.find((c) => c.id === activeId) || null;

	if (loading) {
		return (
			<div className="comms-page">
				<div className="comms-empty">Chargement des canaux...</div>
			</div>
		);
	}

	return (
		<div className="comms-page">
			<div
				style={{
					padding: '0.75rem 1rem 0.5rem',
					display: 'flex',
					gap: '0.75rem',
					alignItems: 'center',
				}}
			>
				<Link href="/roleplay" className="retour-link">
					← Retour
				</Link>
			</div>

			<div className="comms-profile-bar">
				<div className="comms-profile-bar-avatar">
					{character.avatarUrl ? (
						<img src={character.avatarUrl} alt={character.fullName} />
					) : (
						character.fullName.charAt(0)
					)}
				</div>
				<div className="comms-profile-bar-info">
					<div className="comms-profile-bar-name">
						{character.rankIconUrl && (
							<img
								className="rank-icon"
								src={character.rankIconUrl}
								alt={character.rankName || ''}
								title={character.rankName || ''}
							/>
						)}
						<span>
							{character.rankName ? `${character.rankName} ` : ''}
							{character.fullName}
						</span>
					</div>
					<div className="comms-profile-bar-meta">
						{character.factionLogoUrl && (
							<img
								className="affil-icon"
								src={character.factionLogoUrl}
								alt={character.faction || ''}
								title={character.faction || ''}
							/>
						)}
						{character.faction && <span>{character.faction}</span>}
						{character.unitName && (
							<>
								<span>·</span>
								{character.unitInsigniaUrl && (
									<img
										className="affil-icon"
										src={character.unitInsigniaUrl}
										alt={character.unitName}
										title={character.unitName}
									/>
								)}
								<span>{character.unitName}</span>
							</>
						)}
					</div>
				</div>
				<div className="comms-profile-bar-spacer" />
				<button
					type="button"
					className="comms-icon-btn"
					onClick={toggleMuted}
					title={muted ? 'Réactiver les sons' : 'Couper les sons'}
					aria-pressed={muted}
				>
					{muted ? '🔇 Sons' : '🔊 Sons'}
				</button>
			</div>

			{!bannerClosed && (
				<div className="comms-disclaimer-banner">
					<div>
						<strong>AVIS</strong> — Ceci n&apos;est pas une messagerie privée. Aucun
						message n&apos;est anonyme. Toutes les communications sont enregistrées
						et consultables par la modération à des fins de sécurité et de
						modération RP. Messages stockés en clair pour audit modération.
					</div>
					<button
						className="comms-disclaimer-close"
						onClick={closeBanner}
						aria-label="Fermer"
					>
						✕
					</button>
				</div>
			)}

			<div className={`comms-layout comms-mobile${mobileShowMain ? ' active' : ''}`}>
				<aside className="comms-sidebar">
					<div className="comms-sidebar-header">
						<h3>CANAUX</h3>
						<div className="comms-sidebar-actions">
							<button
								className="comms-icon-btn"
								onClick={() => setShowNewDm(true)}
								title="Nouveau DM"
							>
								+ DM
							</button>
							<button
								className="comms-icon-btn"
								onClick={() => setShowNewGroup(true)}
								title="Nouveau groupe"
							>
								+ GRP
							</button>
						</div>
					</div>
					<ChannelList
						channels={channels}
						activeId={activeId}
						onSelect={(id) => {
							setActiveId(id);
							setMobileShowMain(true);
						}}
					/>
				</aside>

				<main className="comms-main">
					{activeChannel ? (
						<>
							<div className="comms-main-header">
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
									<button
										className="comms-icon-btn comms-mobile-back"
										onClick={() => setMobileShowMain(false)}
									>
										←
									</button>
									<h2>{activeChannel.name}</h2>
								</div>
								<div
									className="comms-main-header-meta"
									style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
								>
									<span>{activeChannel.type.toUpperCase()}</span>
									<button
										type="button"
										className="comms-icon-btn"
										onClick={() => setShowMembers(true)}
									>
										👥 {activeChannel.memberCount} membres
									</button>
									{(activeChannel.type === 'group' ||
										activeChannel.type === 'dm') && (
										<button
											type="button"
											className="comms-icon-btn"
											onClick={() => handleLeaveOrClose(activeChannel)}
											title={
												activeChannel.type === 'group'
													? 'Quitter le groupe'
													: 'Fermer la conversation'
											}
										>
											{activeChannel.type === 'group' ? '🚪 Quitter' : '✕ Fermer'}
										</button>
									)}
								</div>
							</div>
							<MessageList
								messages={messages}
								onDelete={handleDelete}
								onEdit={handleEdit}
								onOpenCharacter={(id) => setProfileCharacterId(id)}
								onOpenIntel={(id) => setPreviewIntelId(id)}
								onReply={(m) => setReplyingTo(m)}
							/>
							{typingUsers.length > 0 && (
								<div className="comms-typing-indicator">
									{typingUsers.length === 1
										? `${typingUsers[0].fullName} est en train d'écrire…`
										: typingUsers.length === 2
											? `${typingUsers[0].fullName} et ${typingUsers[1].fullName} sont en train d'écrire…`
											: `${typingUsers.length} personnes sont en train d'écrire…`}
								</div>
							)}
							<MessageComposer
								key={activeChannel.id}
								onSend={handleSend}
								disabled={disclaimerAccepted === false}
								replyingTo={replyingTo}
								onCancelReply={() => setReplyingTo(null)}
								members={channelMembers}
								onTyping={pingTyping}
							/>
						</>
					) : (
						<div className="comms-empty">Sélectionnez un canal</div>
					)}
				</main>
			</div>

			{disclaimerAccepted === false && (
				<DisclaimerModal onAccept={handleAcceptDisclaimer} />
			)}

			{showNewDm && (
				<NewDmModal
					onClose={() => setShowNewDm(false)}
					onCreated={(channelId) => {
						setShowNewDm(false);
						loadChannels().then(() => setActiveId(channelId));
					}}
				/>
			)}

			{showNewGroup && (
				<NewGroupModal
					onClose={() => setShowNewGroup(false)}
					onCreated={(channelId) => {
						setShowNewGroup(false);
						loadChannels().then(() => setActiveId(channelId));
					}}
				/>
			)}

			{showMembers && activeId && (
				<MembersPanel
					channelId={activeId}
					onClose={() => setShowMembers(false)}
					onSelectMember={(id) => {
						setShowMembers(false);
						setProfileCharacterId(id);
					}}
					onlineIds={onlineMemberIds}
					canKick={
						activeChannel?.type === 'group' &&
						activeChannel?.createdByCharacterId === character.id
					}
					viewerId={character.id}
					onMembersChanged={() => loadChannels()}
				/>
			)}

			{profileCharacterId !== null && (
				<CharacterProfileModal
					characterId={profileCharacterId}
					onClose={() => setProfileCharacterId(null)}
				/>
			)}

			{previewIntelId !== null && (
				<IntelPreviewModal
					intelId={previewIntelId}
					onClose={() => setPreviewIntelId(null)}
				/>
			)}

			{toasts.length > 0 && (
				<div className="comms-toast-stack">
					{toasts.map((t) => (
						<button
							key={t.id}
							type="button"
							className="comms-toast"
							onClick={() => {
								setActiveId(t.channelId);
								setToasts((arr) => arr.filter((x) => x.id !== t.id));
							}}
						>
							<div className="comms-toast-channel">📨 {t.channelName}</div>
							{t.snippet && (
								<div className="comms-toast-snippet">{t.snippet}</div>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
