'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import '../../moderation.css';

const REASON_LABELS: Record<string, string> = {
	'joueur-problematique': 'Joueur problématique',
	surveillance: 'Surveillance',
	'comportement-a-verifier': 'Comportement à vérifier',
	'potentiel-staff': 'Potentiel helper/modérateur',
	autre: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
	open: 'Ouvert',
	pending: 'En attente',
	resolved: 'Résolu',
	archived: 'Archivé',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
	message: 'Commentaire',
	evidence: 'Preuve',
	'moderation-action': 'Action',
	'auto-escalation': 'Escalade auto',
	'case-reopened': 'Réouverture',
	'case-archived': 'Archivage',
	'status-change': 'Statut',
	'transcript-linked': 'Transcript',
	'positive-event': 'Positif',
	'negative-event': 'Négatif',
	system: 'Système',
};

const SANCTION_LABELS: Record<string, string> = {
	warn: 'Warn',
	kick: 'Kick',
	'temp-ban': 'Ban temp.',
	'perm-ban': 'Ban déf.',
};

function formatDuration(seconds: number): string {
	if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
	return `${Math.floor(seconds / 86400)}j`;
}

export default function CaseDetailPage() {
	const params = useParams();
	const router = useRouter();
	const id = params.id as string;
	const timelineEndRef = useRef<HTMLDivElement>(null);

	const [loading, setLoading] = useState(true);
	const [authorized, setAuthorized] = useState(false);
	const [adminLevel, setAdminLevel] = useState('none');
	const [error, setError] = useState('');

	const [caseData, setCaseData] = useState<any>(null);
	const [events, setEvents] = useState<any[]>([]);
	const [sanctions, setSanctions] = useState<any[]>([]);
	const [warnCount, setWarnCount] = useState(0);
	const [nextSanction, setNextSanction] = useState<any>(null);
	const [characters, setCharacters] = useState<any[]>([]);

	// Comment form
	const [comment, setComment] = useState('');
	const [eventType, setEventType] = useState('message');
	const [submitting, setSubmitting] = useState(false);

	// Action modal
	const [actionModal, setActionModal] = useState<string | null>(null);
	const [actionReason, setActionReason] = useState('');
	const [actionDuration, setActionDuration] = useState(86400);
	const [actionSubmitting, setActionSubmitting] = useState(false);

	// Status change
	const [changingStatus, setChangingStatus] = useState(false);

	// Transcript modal
	const [transcriptModal, setTranscriptModal] = useState(false);
	const [transcriptUrl, setTranscriptUrl] = useState('');
	const [transcriptName, setTranscriptName] = useState('');

	useEffect(() => {
		checkAuthAndLoad();
	}, []);

	async function checkAuthAndLoad() {
		try {
			const res = await fetch('/api/auth/admin-check');
			const data = await res.json();
			if (!data.isAdmin) {
				setAuthorized(false);
				setLoading(false);
				return;
			}
			setAuthorized(true);
			setAdminLevel(data.level);
			await loadCase();
		} catch {
			setAuthorized(false);
		}
		setLoading(false);
	}

	async function loadCase() {
		try {
			const res = await fetch(`/api/moderation/cases/${id}`);
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || 'Erreur');
			}
			const data = await res.json();
			setCaseData(data.case);
			setEvents(data.events);
			setSanctions(data.sanctions);
			setWarnCount(data.warnCount);
			setNextSanction(data.nextSanction);
			setCharacters(data.characters);
		} catch (err: any) {
			setError(err.message);
		}
	}

	async function handleComment(e: React.FormEvent) {
		e.preventDefault();
		if (!comment.trim()) return;
		setSubmitting(true);
		setError('');

		try {
			const res = await fetch(`/api/moderation/cases/${id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'comment',
					content: comment,
					eventType,
				}),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error);
			}
			setComment('');
			setEventType('message');
			await loadCase();
			setTimeout(() => timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
		} catch (err: any) {
			setError(err.message);
		}
		setSubmitting(false);
	}

	async function handleAction() {
		if (!actionModal || !actionReason.trim()) return;
		setActionSubmitting(true);
		setError('');

		try {
			const body: any = {
				action: actionModal,
				reason: actionReason,
			};
			if (actionModal === 'temp-ban') {
				body.duration = actionDuration;
			}

			const res = await fetch(`/api/moderation/cases/${id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error);
			}

			setActionModal(null);
			setActionReason('');
			await loadCase();
		} catch (err: any) {
			setError(err.message);
		}
		setActionSubmitting(false);
	}

	async function handleStatusChange(newStatus: string) {
		setChangingStatus(true);
		setError('');
		try {
			const res = await fetch(`/api/moderation/cases/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error);
			}
			await loadCase();
		} catch (err: any) {
			setError(err.message);
		}
		setChangingStatus(false);
	}

	async function handleLinkTranscript() {
		if (!transcriptUrl.trim()) return;
		setSubmitting(true);
		setError('');
		try {
			const res = await fetch(`/api/moderation/cases/${id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'link-transcript',
					transcriptUrl,
					transcriptName: transcriptName || transcriptUrl,
				}),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error);
			}
			setTranscriptModal(false);
			setTranscriptUrl('');
			setTranscriptName('');
			await loadCase();
		} catch (err: any) {
			setError(err.message);
		}
		setSubmitting(false);
	}

	if (loading) {
		return (
			<div className="mod-page">
				<div className="mod-container">
					<div className="mod-loading">Chargement du dossier</div>
				</div>
			</div>
		);
	}

	if (!authorized) {
		return (
			<div className="mod-page">
				<div className="mod-container">
					<div className="mod-denied">
						<h1>Accès refusé</h1>
						<p>Vous n&apos;êtes pas autorisé à accéder à cette page.</p>
						<a href="/roleplay" className="mod-btn primary">Retour au Roleplay</a>
					</div>
				</div>
			</div>
		);
	}

	if (!caseData) {
		return (
			<div className="mod-page">
				<div className="mod-container">
					<div className="mod-empty">
						{error ? `Erreur : ${error}` : 'Dossier non trouvé'}
					</div>
				</div>
			</div>
		);
	}

	const isOpen = caseData.status === 'open' || caseData.status === 'pending';
	const isFull = adminLevel === 'full';

	return (
		<div className="mod-page">
			<div className="mod-container">
				<a href="/moderation" className="mod-back-btn">
					← Retour à la liste
				</a>

				<div className="mod-panel">
					{/* Case header */}
					<div className="mod-case-header">
						<img
							className="mod-case-avatar"
							src={caseData.targetDiscordAvatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
							alt=""
						/>
						<div className="mod-case-info">
							<div className="mod-case-number">
								Dossier #{caseData.caseNumber}
							</div>
							<div className="mod-case-target-name">
								{caseData.targetServerUsername || caseData.targetDiscordUsername}
							</div>
							<div className="mod-case-meta">
								<span>@{caseData.targetDiscordUsername}</span>
								<span>ID: {caseData.targetDiscordId}</span>
								<span>Motif: {REASON_LABELS[caseData.reason] || caseData.reason}</span>
								<span>Créé le {new Date(caseData.createdAt).toLocaleDateString('fr-FR')}</span>
							</div>
						</div>

						<div className="mod-case-actions">
							<span className={`mod-case-status ${caseData.status}`}>
								{STATUS_LABELS[caseData.status]}
							</span>
							{isOpen && (
								<>
									{caseData.status === 'open' && (
										<button
											className="mod-btn"
											onClick={() => handleStatusChange('pending')}
											disabled={changingStatus}
										>
											En attente
										</button>
									)}
									{caseData.status === 'pending' && (
										<button
											className="mod-btn"
											onClick={() => handleStatusChange('open')}
											disabled={changingStatus}
										>
											Rouvrir
										</button>
									)}
									<button
										className="mod-btn primary"
										onClick={() => handleStatusChange('resolved')}
										disabled={changingStatus}
									>
										Résoudre
									</button>
									<button
										className="mod-btn"
										onClick={() => handleStatusChange('archived')}
										disabled={changingStatus}
									>
										Archiver
									</button>
								</>
							)}
							{caseData.status === 'resolved' && (
								<>
									<button
										className="mod-btn"
										onClick={() => handleStatusChange('open')}
										disabled={changingStatus}
									>
										Rouvrir
									</button>
									<button
										className="mod-btn"
										onClick={() => handleStatusChange('archived')}
										disabled={changingStatus}
									>
										Archiver
									</button>
								</>
							)}
							{caseData.status === 'archived' && (
								<button
									className="mod-btn primary"
									onClick={() => handleStatusChange('open')}
									disabled={changingStatus}
								>
									Rouvrir
								</button>
							)}
						</div>
					</div>

					{/* Warn bar */}
					<div className="mod-warn-bar">
						<div className="mod-warn-count">
							<span>Avertissements :</span>
							<div className="mod-warn-dots">
								{Array.from({ length: 7 }).map((_, i) => (
									<div
										key={i}
										className={`mod-warn-dot${i < warnCount ? ' filled' : ''}${i >= 5 && i < warnCount ? ' danger' : ''}`}
									/>
								))}
							</div>
							<span>{warnCount}/7</span>
						</div>
						{nextSanction && warnCount < 7 && (
							<div className="mod-warn-next">
								Prochain : <strong>{nextSanction.label}</strong>
							</div>
						)}
					</div>

					{error && <div className="mod-error">{error}</div>}

					{/* Two column layout: timeline + sidebar */}
					<div className="mod-case-body">
						{/* Timeline */}
						<div className="mod-timeline-section">
							<div className="mod-timeline">
								{events.length === 0 ? (
									<div className="mod-empty">Aucun événement</div>
								) : (
									events.map((event: any) => {
										const isSystem = ['system', 'case-reopened', 'case-archived', 'status-change'].includes(event.type);
										const isAction = event.type === 'moderation-action';
										const isEscalation = event.type === 'auto-escalation';

										let eventClass = 'mod-event';
										if (isSystem) eventClass += ' system-event';
										if (isAction) eventClass += ' action-event';
										if (isEscalation) eventClass += ' escalation-event';

										return (
											<div key={event.id} className={eventClass}>
												{event.authorDiscordAvatar && !isSystem ? (
													<img
														className="mod-event-avatar"
														src={event.authorDiscordAvatar}
														alt=""
													/>
												) : (
													<div className="mod-event-avatar" style={{
														background: 'var(--bg-tertiary)',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														fontSize: '0.65rem',
														color: 'var(--muted)',
													}}>
														{isSystem ? '⚙' : isAction ? '⚠' : '📎'}
													</div>
												)}
												<div className="mod-event-body">
													<div className="mod-event-header">
														<span className="mod-event-author">
															{event.authorDiscordUsername || 'Système'}
														</span>
														<span className={`mod-event-type ${event.type}`}>
															{EVENT_TYPE_LABELS[event.type] || event.type}
														</span>
														<span className="mod-event-date">
															{new Date(event.createdAt).toLocaleString('fr-FR', {
																day: '2-digit',
																month: '2-digit',
																year: '2-digit',
																hour: '2-digit',
																minute: '2-digit',
															})}
														</span>
													</div>
													<div className="mod-event-content">
														{event.content}
													</div>
													{event.transcriptUrl && (
														<a
															className="mod-transcript-link"
															href={event.transcriptUrl}
															target="_blank"
															rel="noopener noreferrer"
														>
															📄 {event.transcriptName || 'Voir le transcript'}
														</a>
													)}
													{event.discordSyncStatus && event.discordSyncStatus !== 'na' && (
														<div className={`mod-event-sync ${event.discordSyncStatus}`}>
															{event.discordSyncStatus === 'success'
																? '✓ Synchronisé avec Discord'
																: `✗ Erreur Discord: ${event.discordSyncError || 'inconnue'}`}
														</div>
													)}
													{event.attachments?.length > 0 && (
														<div className="mod-event-attachments">
															{event.attachments.map((att: any, i: number) => (
																<a
																	key={i}
																	className="mod-event-attachment"
																	href={typeof att.file === 'object' ? att.file.url : '#'}
																	target="_blank"
																	rel="noopener noreferrer"
																>
																	📎 {att.description || `Pièce jointe ${i + 1}`}
																</a>
															))}
														</div>
													)}
												</div>
											</div>
										);
									})
								)}
								<div ref={timelineEndRef} />
							</div>

							{/* Comment form */}
							{isOpen && (
								<form className="mod-comment-form" onSubmit={handleComment}>
									<textarea
										className="mod-comment-textarea"
										value={comment}
										onChange={(e) => setComment(e.target.value)}
										placeholder="Ajouter un commentaire ou un événement..."
									/>
									<div className="mod-comment-options">
										<select
											className="mod-event-type-select"
											value={eventType}
											onChange={(e) => setEventType(e.target.value)}
										>
											<option value="message">Commentaire</option>
											<option value="evidence">Preuve</option>
											<option value="positive-event">Événement positif</option>
											<option value="negative-event">Événement négatif</option>
										</select>
										<button
											type="button"
											className="mod-btn"
											onClick={() => setTranscriptModal(true)}
										>
											Lier un transcript
										</button>
										<div className="mod-comment-actions">
											<button
												type="submit"
												className="mod-btn primary"
												disabled={submitting || !comment.trim()}
											>
												{submitting ? 'Envoi...' : 'Envoyer'}
											</button>
										</div>
									</div>
								</form>
							)}

							{/* Moderation action buttons */}
							{isOpen && isFull && (
								<div className="mod-comment-form" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
									<button
										className="mod-btn warn-btn"
										onClick={() => setActionModal('warn')}
									>
										⚠ Avertir
									</button>
									<button
										className="mod-btn danger"
										onClick={() => setActionModal('kick')}
									>
										Expulser
									</button>
									<button
										className="mod-btn danger"
										onClick={() => setActionModal('temp-ban')}
									>
										Ban temporaire
									</button>
									<button
										className="mod-btn danger"
										onClick={() => setActionModal('perm-ban')}
									>
										Ban définitif
									</button>
								</div>
							)}
						</div>

						{/* Sidebar */}
						<div className="mod-sidebar">
							{/* Characters */}
							{characters.length > 0 && (
								<div className="mod-profile-section">
									<div className="mod-profile-section-title">Personnages</div>
									<ul className="mod-char-list">
										{characters.map((c: any) => (
											<li key={c.id} className="mod-char-item">
												<span className="mod-char-name">{c.firstName} {c.lastName}</span>
												<span className="mod-char-status">{c.status}</span>
											</li>
										))}
									</ul>
								</div>
							)}

							{/* Case info */}
							{caseData.reasonDetail && (
								<div className="mod-profile-section">
									<div className="mod-profile-section-title">Détail du motif</div>
									<div style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
										{caseData.reasonDetail}
									</div>
								</div>
							)}

							{/* Créé par */}
							<div className="mod-profile-section">
								<div className="mod-profile-section-title">Informations</div>
								<div className="mod-profile-row">
									<span className="mod-profile-label">Créé par</span>
									<span className="mod-profile-value">
										{caseData.createdByDiscordUsername}
									</span>
								</div>
								<div className="mod-profile-row">
									<span className="mod-profile-label">Date de création</span>
									<span className="mod-profile-value">
										{new Date(caseData.createdAt).toLocaleDateString('fr-FR')}
									</span>
								</div>
								<div className="mod-profile-row">
									<span className="mod-profile-label">Avertissements</span>
									<span className="mod-profile-value">{warnCount}/7</span>
								</div>
							</div>

							{/* Sanctions history */}
							{sanctions.length > 0 && (
								<div className="mod-profile-section">
									<div className="mod-profile-section-title">
										Historique des sanctions ({sanctions.length})
									</div>
									<table className="mod-sanctions-table">
										<thead>
											<tr>
												<th>Type</th>
												<th>Raison</th>
												<th>Date</th>
											</tr>
										</thead>
										<tbody>
											{sanctions.map((s: any) => (
												<tr key={s.id}>
													<td>
														<span className={`mod-sanction-type ${s.type}`}>
															{SANCTION_LABELS[s.type] || s.type}
															{s.type === 'warn' && s.warnNumber ? ` ${s.warnNumber}/7` : ''}
															{s.duration ? ` (${formatDuration(s.duration)})` : ''}
														</span>
													</td>
													<td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
														{s.reason}
													</td>
													<td>
														{new Date(s.createdAt).toLocaleDateString('fr-FR')}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Action modal */}
			{actionModal && (
				<div
					className="mod-modal-overlay"
					onClick={(e) => { if (e.target === e.currentTarget) setActionModal(null); }}
				>
					<div className="mod-modal">
						<div className="mod-modal-header">
							<span>
								{actionModal === 'warn' && '⚠ Avertir'}
								{actionModal === 'kick' && 'Expulser'}
								{actionModal === 'temp-ban' && 'Bannir temporairement'}
								{actionModal === 'perm-ban' && 'Bannir définitivement'}
							</span>
							<button className="mod-modal-close" onClick={() => setActionModal(null)}>
								✕
							</button>
						</div>
						<div className="mod-modal-body">
							{actionModal === 'warn' && nextSanction && (
								<div className="mod-modal-warning">
									Cet avertissement sera le <strong>#{warnCount + 1}/7</strong>.
									{nextSanction.action !== 'warn' && (
										<> Action automatique : <strong>{nextSanction.label}</strong></>
									)}
								</div>
							)}
							{(actionModal === 'perm-ban') && (
								<div className="mod-modal-warning">
									⚠ Cette action est irréversible. Le joueur sera banni définitivement du serveur Discord.
								</div>
							)}
							<div className="mod-modal-info">
								Cible : <strong>{caseData.targetServerUsername || caseData.targetDiscordUsername}</strong>
							</div>
							<div className="mod-modal-field">
								<label className="mod-modal-label">Raison</label>
								<textarea
									className="mod-modal-textarea"
									value={actionReason}
									onChange={(e) => setActionReason(e.target.value)}
									placeholder="Raison de la sanction..."
								/>
							</div>
							{actionModal === 'temp-ban' && (
								<div className="mod-modal-field">
									<label className="mod-modal-label">Durée</label>
									<select
										className="mod-reason-select"
										value={actionDuration}
										onChange={(e) => setActionDuration(Number(e.target.value))}
									>
										<option value={3600}>1 heure</option>
										<option value={21600}>6 heures</option>
										<option value={43200}>12 heures</option>
										<option value={86400}>24 heures</option>
										<option value={259200}>3 jours</option>
										<option value={604800}>7 jours</option>
										<option value={1209600}>14 jours</option>
										<option value={2592000}>30 jours</option>
									</select>
								</div>
							)}
						</div>
						<div className="mod-modal-footer">
							<button className="mod-btn" onClick={() => setActionModal(null)}>
								Annuler
							</button>
							<button
								className={`mod-btn ${actionModal === 'warn' ? 'warn-btn' : 'danger'}`}
								onClick={handleAction}
								disabled={actionSubmitting || !actionReason.trim()}
							>
								{actionSubmitting ? 'Exécution...' : 'Confirmer'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Transcript modal */}
			{transcriptModal && (
				<div
					className="mod-modal-overlay"
					onClick={(e) => { if (e.target === e.currentTarget) setTranscriptModal(false); }}
				>
					<div className="mod-modal">
						<div className="mod-modal-header">
							<span>Lier un transcript</span>
							<button className="mod-modal-close" onClick={() => setTranscriptModal(false)}>
								✕
							</button>
						</div>
						<div className="mod-modal-body">
							<div className="mod-modal-field">
								<label className="mod-modal-label">URL du transcript</label>
								<input
									className="mod-modal-input"
									type="url"
									value={transcriptUrl}
									onChange={(e) => setTranscriptUrl(e.target.value)}
									placeholder="https://..."
								/>
							</div>
							<div className="mod-modal-field">
								<label className="mod-modal-label">Nom (optionnel)</label>
								<input
									className="mod-modal-input"
									type="text"
									value={transcriptName}
									onChange={(e) => setTranscriptName(e.target.value)}
									placeholder="Ticket #1234"
								/>
							</div>
						</div>
						<div className="mod-modal-footer">
							<button className="mod-btn" onClick={() => setTranscriptModal(false)}>
								Annuler
							</button>
							<button
								className="mod-btn primary"
								onClick={handleLinkTranscript}
								disabled={submitting || !transcriptUrl.trim()}
							>
								{submitting ? 'Envoi...' : 'Lier'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
