'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
	Volume2,
	VolumeX,
	X,
	ArrowLeft,
	Users,
	LogOut,
	MessageSquare,
	MessageCirclePlus,
	UsersRound,
	List,
} from 'lucide-react';
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
import { CommsTutorial } from './CommsTutorial';
import { HelpCircle } from 'lucide-react';
import { GmModeProvider, useGmMode } from './useGmMode';
import { AdminBar } from './AdminBar';

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
	viewerIsGhost?: boolean;
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
		callsign?: string | null;
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
	postedAsGm?: boolean;
}

function CommsLayoutInner({ character, isAdmin }: { character: ActiveCharacter; isAdmin: boolean }) {
	const gm = useGmMode();
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
	const [mentionCounts, setMentionCounts] = useState<Record<number, number>>(() => {
		if (typeof window === 'undefined') return {};
		try {
			const raw = window.localStorage.getItem('comms.mentionCounts.v1');
			return raw ? JSON.parse(raw) : {};
		} catch {
			return {};
		}
	});

	// Persist mentionCounts to localStorage so the /roleplay COMMS button badge
	// stays in sync with the in-page badges.
	useEffect(() => {
		if (typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(
				'comms.mentionCounts.v1',
				JSON.stringify(mentionCounts),
			);
			window.dispatchEvent(new CustomEvent('comms-mention-counts-change'));
		} catch {}
	}, [mentionCounts]);
	// Tracks the last seen lastMessageAt per channel so we only toast on advances
	const seenLastMessageAtRef = useRef<Map<number, string>>(new Map());
	const initializedSeenRef = useRef(false);
	const toastIdRef = useRef(0);
	const pollingRef = useRef<NodeJS.Timeout | null>(null);

	const loadChannels = useCallback(async () => {
		try {
			const url = gm.enabled
				? '/api/comms/channels?gm=1'
				: '/api/comms/channels';
			const res = await fetch(url);
			if (!res.ok) return;
			const data = await res.json();
			const newChannels: CommsChannel[] = data.channels || [];
			setChannels(newChannels);

			// Reconcile stale mention counts against server state. The server
			// `lastMessageMentionsViewer` flag reflects ONLY the current latest
			// message — if a non-mention message followed an earlier mention,
			// the flag flips back to false and the persisted counter is stale.
			// Drop entries for channels no longer present or whose latest is no
			// longer a mention.
			const currentById = new Map<number, CommsChannel>();
			for (const ch of newChannels) currentById.set(ch.id, ch);
			setMentionCounts((c) => {
				let changed = false;
				const next = { ...c };
				for (const key of Object.keys(next)) {
					const idNum = Number(key);
					const ch = currentById.get(idNum);
					if (!ch || !ch.lastMessageMentionsViewer) {
						delete next[idNum];
						changed = true;
					}
				}
				return changed ? next : c;
			});

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
						// Advance the baseline FIRST. Any concurrent loadChannels call
						// (e.g. 3s poll overlapping with handleSend's post-send refresh)
						// will then see the advanced baseline and skip this channel —
						// preventing the double/triple sound fire.
						seen.set(ch.id, ch.lastMessageAt);

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
							if (mention) {
								playRadioPing();
								setMentionCounts((c) => ({
									...c,
									[ch.id]: (c[ch.id] || 0) + 1,
								}));
							} else {
								playNotification();
							}
						} else if (mention) {
							// Active channel but mentions us → still play radio ping
							playRadioPing();
						}
					}
				}
			}
			// Seed baseline for channels we have never seen before (first load or
			// newly joined channels). Channels that just advanced were already set
			// above inside the match block.
			for (const ch of newChannels) {
				if (ch.lastMessageAt && !seen.has(ch.id)) {
					seen.set(ch.id, ch.lastMessageAt);
				}
			}
			initializedSeenRef.current = true;
			// Mirror seen-baseline into localStorage so the /roleplay COMMS button
			// poller (CommsNavButton) doesn't re-count messages already handled here.
			if (typeof window !== 'undefined') {
				try {
					const seenObj: Record<string, string> = {};
					seen.forEach((v, k) => {
						seenObj[String(k)] = v;
					});
					window.localStorage.setItem(
						'comms.seenLastAt.v1',
						JSON.stringify(seenObj),
					);
				} catch {}
			}
		} catch {}
	}, [activeId, requestedChannelId, gm.enabled]);

	const loadMessages = useCallback(async (channelId: number) => {
		try {
			const url = gm.enabled
				? `/api/comms/channels/${channelId}/messages?gm=1`
				: `/api/comms/channels/${channelId}/messages`;
			const res = await fetch(url);
			if (!res.ok) {
				// Clear on failure so stale messages from the previous channel
				// don't stick when the new channel's fetch errors out (e.g.
				// ghost channel without gm=1, or transient network error).
				setMessages([]);
				return;
			}
			const data = await res.json();
			setMessages(data.messages || []);
		} catch {
			setMessages([]);
		}
	}, [gm.enabled]);

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

	useEffect(() => {
		loadChannels();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gm.enabled]);

	// Entering /comms = reading. Clear the global mention counter used by
	// the /roleplay COMMS nav badge on mount so the bubble disappears as soon
	// as the user lands on this page — regardless of whether they click each
	// mentioned channel individually. The in-page per-channel badges rebuild
	// from future polls, so this only affects the cross-page nav bubble.
	// Runs exactly once on mount to avoid racing with the mentionCounts
	// persistence useEffect above.
	const clearedNavOnMountRef = useRef(false);
	useEffect(() => {
		if (clearedNavOnMountRef.current) return;
		clearedNavOnMountRef.current = true;
		setMentionCounts({});
		if (typeof window !== 'undefined') {
			try {
				window.localStorage.setItem('comms.mentionCounts.v1', '{}');
				window.dispatchEvent(new CustomEvent('comms-mention-counts-change'));
			} catch {}
		}
	}, []);

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
		// Clear stale messages from the previous channel immediately so the
		// user never sees the old conversation while the new one is fetching.
		setMessages([]);
		// Opening a channel clears its unread mention badge
		setMentionCounts((c) => {
			if (!c[activeId]) return c;
			const next = { ...c };
			delete next[activeId];
			return next;
		});
		// Belt-and-suspenders: advance the shared seen-baseline used by
		// CommsNavButton (the /roleplay COMMS button poller) so that when
		// the user returns to /roleplay, the poller will not re-increment
		// a count for a message they already opened here. We advance to
		// the channel's current lastMessageAt (read from the in-memory
		// channels state, not from the API — that's the same value the
		// mirror in loadChannels would write moments later).
		if (typeof window !== 'undefined') {
			try {
				const opened = channels.find((c) => c.id === activeId);
				if (opened?.lastMessageAt) {
					const raw = window.localStorage.getItem('comms.seenLastAt.v1');
					const seenObj: Record<string, string> = raw ? JSON.parse(raw) : {};
					seenObj[String(activeId)] = opened.lastMessageAt;
					window.localStorage.setItem(
						'comms.seenLastAt.v1',
						JSON.stringify(seenObj),
					);
					// Also update the in-memory ref so the next loadChannels
					// mirror keeps the same value instead of regressing.
					seenLastMessageAtRef.current.set(activeId, opened.lastMessageAt);
				}
			} catch {}
		}
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
		const effectiveId = gm.effectiveCharacterId;
		const requestBody = gm.enabled && effectiveId != null
			? { ...payload, gmMode: true, impersonateCharacterId: effectiveId }
			: payload;
		const res = await fetch(`/api/comms/channels/${activeId}/messages`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody),
		});
		if (res.ok) {
			gm.clearOverride();
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

			<AdminBar isAdmin={isAdmin} />

			<div className="comms-profile-bar" data-tutorial-comms="profile-bar">
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
					className="comms-icon-btn comms-icon-btn-with-icon comms-profile-help-btn"
					onClick={() => window.dispatchEvent(new Event('open-comms-tutorial'))}
					title="Relancer le tutoriel COMMS"
					aria-label="Relancer le tutoriel COMMS"
				>
					<HelpCircle size={14} />
					<span>Aide</span>
				</button>
				<button
					type="button"
					className="comms-icon-btn comms-icon-btn-with-icon comms-profile-mute-btn"
					data-tutorial-comms="mute"
					onClick={toggleMuted}
					title={muted ? 'Réactiver les sons' : 'Couper les sons'}
					aria-pressed={muted}
				>
					{muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
					<span>Sons</span>
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
						<X size={14} />
					</button>
				</div>
			)}

			<div className={`comms-layout comms-mobile${mobileShowMain ? ' active' : ''}`}>
				<aside className="comms-sidebar" data-tutorial-comms="sidebar">
					<div className="comms-sidebar-header">
						<h3>CANAUX</h3>
						<div className="comms-sidebar-actions">
							<button
								className="comms-icon-btn comms-icon-btn-square"
								data-tutorial-comms="new-dm"
								onClick={() => setShowNewDm(true)}
								title="Nouveau message direct"
								aria-label="Nouveau message direct"
							>
								<MessageCirclePlus size={16} />
							</button>
							<button
								className="comms-icon-btn comms-icon-btn-square"
								data-tutorial-comms="new-group"
								onClick={() => setShowNewGroup(true)}
								title="Nouveau groupe"
								aria-label="Nouveau groupe"
							>
								<UsersRound size={16} />
							</button>
						</div>
					</div>
					<ChannelList
						channels={channels}
						activeId={activeId}
						mentionCounts={mentionCounts}
						onSelect={(id) => {
							setActiveId(id);
							setMobileShowMain(true);
						}}
					/>
				</aside>

				<main className="comms-main" data-tutorial-comms="messages">
					{activeChannel ? (
						<>
							<div className="comms-main-header">
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
									<button
										className="comms-icon-btn comms-mobile-back"
										onClick={() => setMobileShowMain(false)}
										aria-label="Retour"
									>
										<ArrowLeft size={14} />
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
										className="comms-icon-btn comms-icon-btn-with-icon comms-header-members-btn"
										data-tutorial-comms="members-btn"
										onClick={() => setShowMembers(true)}
									>
										<Users size={14} />
										<span>{activeChannel.memberCount} membres</span>
									</button>
									{(activeChannel.type === 'group' ||
										activeChannel.type === 'dm') && (
										<button
											type="button"
											className="comms-icon-btn comms-icon-btn-with-icon comms-header-leave-btn"
											onClick={() => handleLeaveOrClose(activeChannel)}
											title={
												activeChannel.type === 'group'
													? 'Quitter le groupe'
													: 'Fermer la conversation'
											}
										>
											{activeChannel.type === 'group' ? (
												<>
													<LogOut size={14} />
													<span>Quitter</span>
												</>
											) : (
												<>
													<X size={14} />
													<span>Fermer</span>
												</>
											)}
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
								viewerId={character.id}
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
							<div data-tutorial-comms="composer">
								<MessageComposer
									key={activeChannel.id}
									onSend={handleSend}
									disabled={disclaimerAccepted === false}
									replyingTo={replyingTo}
									onCancelReply={() => setReplyingTo(null)}
									members={channelMembers}
									onTyping={pingTyping}
									viewerId={character.id}
									channelType={activeChannel.type}
								/>
							</div>
						</>
					) : (
						<div className="comms-empty">Sélectionnez un canal</div>
					)}
				</main>
			</div>

			{/* Mobile bottom tab bar (only renders on mobile via CSS). */}
			<nav
				className="comms-mobile-tabs"
				data-tutorial-comms="mobile-tabs"
				aria-label="Navigation comms"
			>
				<button
					type="button"
					className={`comms-mobile-tab${!mobileShowMain ? ' active' : ''}`}
					onClick={() => setMobileShowMain(false)}
				>
					<span className="comms-mobile-tab-icon"><List size={20} /></span>
					<span>Canaux</span>
					{(() => {
						const total = Object.values(mentionCounts).reduce(
							(a, b) => a + (b || 0),
							0,
						);
						return total > 0 ? (
							<span className="comms-mobile-tab-badge">@{total}</span>
						) : null;
					})()}
				</button>
				<button
					type="button"
					className={`comms-mobile-tab${mobileShowMain ? ' active' : ''}`}
					onClick={() => setMobileShowMain(true)}
					disabled={!activeId}
				>
					<span className="comms-mobile-tab-icon"><MessageSquare size={20} /></span>
					<span>Discussion</span>
				</button>
				<button
					type="button"
					className="comms-mobile-tab"
					onClick={() => activeId && setShowMembers(true)}
					disabled={!activeChannel}
				>
					<span className="comms-mobile-tab-icon"><Users size={20} /></span>
					<span>Membres</span>
				</button>
			</nav>

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

			<CommsTutorial />

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
							<div className="comms-toast-channel">
								<MessageSquare size={14} />
								<span>{t.channelName}</span>
							</div>
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

export function CommsLayout(props: { character: ActiveCharacter; isAdmin: boolean }) {
	return (
		<GmModeProvider>
			<CommsLayoutInner {...props} />
		</GmModeProvider>
	);
}
