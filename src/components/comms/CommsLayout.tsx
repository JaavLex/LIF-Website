'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
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
	} | null;
	senderCharacterId?: number | null;
	editedAt?: string | null;
	createdAt: string;
	isOwn: boolean;
}

export function CommsLayout({ character }: { character: ActiveCharacter }) {
	const [channels, setChannels] = useState<CommsChannel[]>([]);
	const [activeId, setActiveId] = useState<number | null>(null);
	const [messages, setMessages] = useState<CommsMessage[]>([]);
	const [loading, setLoading] = useState(true);
	const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean | null>(null);
	const [bannerClosed, setBannerClosed] = useState(false);
	const [showNewDm, setShowNewDm] = useState(false);
	const [showNewGroup, setShowNewGroup] = useState(false);
	const [showMembers, setShowMembers] = useState(false);
	const [profileCharacterId, setProfileCharacterId] = useState<number | null>(null);
	const [previewIntelId, setPreviewIntelId] = useState<number | null>(null);
	const [mobileShowMain, setMobileShowMain] = useState(false);
	const pollingRef = useRef<NodeJS.Timeout | null>(null);

	const loadChannels = useCallback(async () => {
		try {
			const res = await fetch('/api/comms/channels');
			if (!res.ok) return;
			const data = await res.json();
			setChannels(data.channels || []);
			if (!activeId && data.channels?.length) {
				setActiveId(data.channels[0].id);
			}
		} catch {}
	}, [activeId]);

	const loadMessages = useCallback(async (channelId: number) => {
		try {
			const res = await fetch(`/api/comms/channels/${channelId}/messages`);
			if (!res.ok) return;
			const data = await res.json();
			setMessages(data.messages || []);
		} catch {}
	}, []);

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
		if (!activeId) return;
		loadMessages(activeId);
		// Polling
		const intervalMs = document.hidden ? 30_000 : 3_000;
		if (pollingRef.current) clearInterval(pollingRef.current);
		pollingRef.current = setInterval(() => {
			loadMessages(activeId);
			loadChannels();
		}, intervalMs);
		return () => {
			if (pollingRef.current) clearInterval(pollingRef.current);
		};
	}, [activeId, loadMessages, loadChannels]);

	async function handleSend(payload: {
		body: string;
		isAnonymous: boolean;
		attachments: any[];
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
					padding: '0.75rem 1rem 0',
					display: 'flex',
					gap: '0.75rem',
					alignItems: 'center',
				}}
			>
				<Link href="/roleplay" className="retour-link">
					← Retour
				</Link>
				<span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
					Connecté en tant que <strong>{character.fullName}</strong>
					{character.faction ? ` — ${character.faction}` : ''}
				</span>
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
						onClick={() => setBannerClosed(true)}
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
								</div>
							</div>
							<MessageList
								messages={messages}
								onDelete={handleDelete}
								onEdit={handleEdit}
								onOpenCharacter={(id) => setProfileCharacterId(id)}
								onOpenIntel={(id) => setPreviewIntelId(id)}
							/>
							<MessageComposer
								key={activeChannel.id}
								onSend={handleSend}
								disabled={disclaimerAccepted === false}
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
		</div>
	);
}
