'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Transcript } from './types';

interface TranscriptsTabProps {
	authorized: boolean;
	onError: (error: string) => void;
}

export default function TranscriptsTab({ authorized, onError }: TranscriptsTabProps) {
	const [transcripts, setTranscripts] = useState<Transcript[]>([]);
	const [transcriptsLoading, setTranscriptsLoading] = useState(false);
	const [transcriptsLoaded, setTranscriptsLoaded] = useState(false);
	const [transcriptSearch, setTranscriptSearch] = useState('');
	const [transcriptOwner, setTranscriptOwner] = useState('');
	const [transcriptPanel, setTranscriptPanel] = useState('');
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [previewTitle, setPreviewTitle] = useState('');
	const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (authorized && !transcriptsLoaded) loadTranscripts();
	}, [authorized]);

	async function loadTranscripts() {
		setTranscriptsLoading(true);
		try {
			const res = await fetch('/api/roleplay/transcripts');
			if (!res.ok) throw new Error('Erreur chargement transcripts');
			const data = await res.json();
			setTranscripts(data.transcripts || []);
			setTranscriptsLoaded(true);
		} catch (err: any) {
			onError(err.message);
		}
		setTranscriptsLoading(false);
	}

	const transcriptOwners = useMemo(() => {
		const set = new Set<string>();
		for (const t of transcripts) if (t.ticketOwner) set.add(t.ticketOwner);
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [transcripts]);

	const transcriptPanels = useMemo(() => {
		const set = new Set<string>();
		for (const t of transcripts) if (t.panelName) set.add(t.panelName);
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [transcripts]);

	const filteredTranscripts = useMemo(() => {
		let list = transcripts;
		if (transcriptOwner) list = list.filter(t => t.ticketOwner === transcriptOwner);
		if (transcriptPanel) list = list.filter(t => t.panelName === transcriptPanel);
		if (transcriptSearch.trim()) {
			const q = transcriptSearch.toLowerCase();
			list = list.filter(
				t =>
					t.ticketName.toLowerCase().includes(q) ||
					t.ticketOwner.toLowerCase().includes(q) ||
					t.panelName.toLowerCase().includes(q) ||
					t.participants.some(p => p.name.toLowerCase().includes(q)),
			);
		}
		return list;
	}, [transcripts, transcriptSearch, transcriptOwner, transcriptPanel]);

	const groupedTranscripts = useMemo(() => {
		const map = new Map<string, Transcript[]>();
		for (const t of filteredTranscripts) {
			const key = t.ticketOwner || 'Inconnu';
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(t);
		}
		return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	}, [filteredTranscripts]);

	const toggleTranscriptOwner = (owner: string) => {
		setExpandedOwners(prev => {
			const next = new Set(prev);
			if (next.has(owner)) next.delete(owner);
			else next.add(owner);
			return next;
		});
	};

	return (
		<>
			{transcriptsLoading ? (
				<div className="mod-loading">Chargement des transcripts</div>
			) : (
				<>
					<div className="mod-filters">
						<input
							className="mod-search"
							type="text"
							placeholder="Rechercher par nom, ticket, participant..."
							value={transcriptSearch}
							onChange={e => setTranscriptSearch(e.target.value)}
						/>
						<select
							className="mod-filter-select"
							value={transcriptOwner}
							onChange={e => setTranscriptOwner(e.target.value)}
						>
							<option value="">Tous les propriétaires</option>
							{transcriptOwners.map(o => (
								<option key={o} value={o}>
									{o}
								</option>
							))}
						</select>
						<select
							className="mod-filter-select"
							value={transcriptPanel}
							onChange={e => setTranscriptPanel(e.target.value)}
						>
							<option value="">Tous les panels</option>
							{transcriptPanels.map(p => (
								<option key={p} value={p}>
									{p}
								</option>
							))}
						</select>
					</div>

					<div className="mod-stats">
						<span>
							<span className="mod-stat-value">
								{filteredTranscripts.length}
							</span>{' '}
							transcript{filteredTranscripts.length > 1 ? 's' : ''}
						</span>
						<span>
							<span className="mod-stat-value">
								{groupedTranscripts.length}
							</span>{' '}
							propriétaire{groupedTranscripts.length > 1 ? 's' : ''}
						</span>
					</div>

					{groupedTranscripts.length === 0 ? (
						<div className="mod-empty">Aucun transcript trouvé</div>
					) : (
						<ul className="mod-transcript-list">
							{groupedTranscripts.map(([owner, items]) => (
								<li key={owner} className="mod-transcript-group">
									<button
										className="mod-transcript-owner"
										onClick={() => toggleTranscriptOwner(owner)}
									>
										<span className="mod-transcript-arrow">
											{expandedOwners.has(owner) ? '▼' : '▶'}
										</span>
										{items[0]?.ticketOwnerAvatar && (
											<img
												className="mod-user-avatar"
												src={items[0].ticketOwnerAvatar}
												alt=""
											/>
										)}
										<span className="mod-transcript-owner-name">
											{owner}
										</span>
										<span className="mod-badge characters">
											{items.length}
										</span>
									</button>
									{expandedOwners.has(owner) && (
										<ul className="mod-transcript-tickets">
											{items.map(t => (
												<li
													key={t.messageId}
													className="mod-transcript-ticket"
												>
													<div className="mod-transcript-ticket-info">
														<div className="mod-transcript-ticket-name">
															{t.ticketName}
														</div>
														<div className="mod-transcript-ticket-meta">
															{t.panelName} ·{' '}
															{new Date(t.timestamp).toLocaleDateString(
																'fr-FR',
															)}{' '}
															· {t.participants.length} participant
															{t.participants.length > 1 ? 's' : ''}
														</div>
													</div>
													<div className="mod-user-actions">
														<button
															className="mod-btn primary"
															onClick={() => {
																setPreviewUrl(t.transcriptUrl);
																setPreviewTitle(t.ticketName);
															}}
														>
															Voir
														</button>
														<a
															className="mod-btn"
															href={t.downloadUrl}
															target="_blank"
															rel="noopener noreferrer"
														>
															Télécharger
														</a>
													</div>
												</li>
											))}
										</ul>
									)}
								</li>
							))}
						</ul>
					)}
				</>
			)}

			{/* Transcript preview modal */}
			{previewUrl && (
				<div
					className="mod-modal-overlay"
					onClick={e => {
						if (e.target === e.currentTarget) {
							setPreviewUrl(null);
							setPreviewTitle('');
						}
					}}
				>
					<div className="mod-modal mod-modal-transcript">
						<div className="mod-modal-header">
							<span>{previewTitle}</span>
							<button
								className="mod-modal-close"
								onClick={() => {
									setPreviewUrl(null);
									setPreviewTitle('');
								}}
							>
								✕
							</button>
						</div>
						<div className="mod-modal-body mod-transcript-preview-body">
							<iframe
								className="mod-transcript-iframe"
								src={previewUrl}
								title={previewTitle}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
