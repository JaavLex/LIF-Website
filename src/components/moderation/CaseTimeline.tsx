'use client';

import { MODERATION_EVENT_TYPE_LABELS } from '@/lib/constants';

interface CaseTimelineProps {
	events: any[];
	isOpen: boolean;
	isFull: boolean;
	comment: string;
	eventType: string;
	submitting: boolean;
	uploading: boolean;
	onCommentChange: (value: string) => void;
	onEventTypeChange: (value: string) => void;
	onCommentSubmit: (e: React.FormEvent) => void;
	onFileUpload: (files: FileList | null) => void;
	onOpenTranscriptModal: () => void;
	onOpenActionModal: (action: string) => void;
	timelineEndRef: React.RefObject<HTMLDivElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function CaseTimeline({
	events,
	isOpen,
	isFull,
	comment,
	eventType,
	submitting,
	uploading,
	onCommentChange,
	onEventTypeChange,
	onCommentSubmit,
	onFileUpload,
	onOpenTranscriptModal,
	onOpenActionModal,
	timelineEndRef,
	fileInputRef,
}: CaseTimelineProps) {
	return (
		<div className="mod-timeline-section">
			<div className="mod-timeline">
				{events.length === 0 ? (
					<div className="mod-empty">Aucun événement</div>
				) : (
					events.map((event: any) => {
						const isSystem = [
							'system',
							'case-reopened',
							'case-archived',
							'status-change',
						].includes(event.type);
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
									<div
										className="mod-event-avatar"
										style={{
											background: 'var(--bg-tertiary)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: '0.65rem',
											color: 'var(--muted)',
										}}
									>
										{isSystem ? '⚙' : isAction ? '⚠' : '📎'}
									</div>
								)}
								<div className="mod-event-body">
									<div className="mod-event-header">
										<span className="mod-event-author">
											{event.authorDiscordUsername || 'Système'}
										</span>
										<span className={`mod-event-type ${event.type}`}>
											{MODERATION_EVENT_TYPE_LABELS[event.type] || event.type}
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
									<div className="mod-event-content">{event.content}</div>
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
									{event.discordSyncStatus &&
										event.discordSyncStatus !== 'na' && (
											<div
												className={`mod-event-sync ${event.discordSyncStatus}`}
											>
												{event.discordSyncStatus === 'success'
													? '✓ Synchronisé avec Discord'
													: `✗ Erreur Discord: ${event.discordSyncError || 'inconnue'}`}
											</div>
										)}
									{event.attachments?.length > 0 && (
										<div className="mod-event-attachments">
											{event.attachments.map((att: any, i: number) => {
												const fileUrl =
													typeof att.file === 'object' ? att.file.url : '#';
												const mimeType =
													typeof att.file === 'object'
														? att.file.mimeType || ''
														: '';
												const fileName =
													att.description || `Pièce jointe ${i + 1}`;

												if (mimeType.startsWith('image/')) {
													return (
														<a
															key={i}
															href={fileUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="mod-attachment-media"
														>
															<img
																src={fileUrl}
																alt={fileName}
																className="mod-attachment-img"
																loading="lazy"
															/>
														</a>
													);
												}
												if (mimeType.startsWith('video/')) {
													return (
														<video
															key={i}
															src={fileUrl}
															controls
															className="mod-attachment-video"
															preload="metadata"
														/>
													);
												}
												if (mimeType.startsWith('audio/')) {
													return (
														<audio
															key={i}
															src={fileUrl}
															controls
															className="mod-attachment-audio"
															preload="metadata"
														/>
													);
												}
												return (
													<a
														key={i}
														className="mod-event-attachment"
														href={fileUrl}
														target="_blank"
														rel="noopener noreferrer"
													>
														📎 {fileName}
													</a>
												);
											})}
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
				<form className="mod-comment-form" onSubmit={onCommentSubmit}>
					<textarea
						className="mod-comment-textarea"
						value={comment}
						onChange={e => onCommentChange(e.target.value)}
						placeholder="Ajouter un commentaire ou un événement..."
					/>
					<div className="mod-comment-options">
						<select
							className="mod-event-type-select"
							value={eventType}
							onChange={e => onEventTypeChange(e.target.value)}
						>
							<option value="message">Commentaire</option>
							<option value="evidence">Preuve</option>
							<option value="positive-event">Événement positif</option>
							<option value="negative-event">Événement négatif</option>
						</select>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept="image/*,video/*,audio/*"
							style={{ display: 'none' }}
							onChange={e => onFileUpload(e.target.files)}
						/>
						<button
							type="button"
							className="mod-btn"
							onClick={() => fileInputRef.current?.click()}
							disabled={uploading}
						>
							{uploading ? 'Upload...' : '📎 Fichiers'}
						</button>
						<button
							type="button"
							className="mod-btn"
							onClick={onOpenTranscriptModal}
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
				<div
					className="mod-comment-form"
					style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
				>
					<button
						className="mod-btn warn-btn"
						onClick={() => onOpenActionModal('warn')}
					>
						⚠ Avertir
					</button>
					<button
						className="mod-btn danger"
						onClick={() => onOpenActionModal('kick')}
					>
						Expulser
					</button>
					<button
						className="mod-btn danger"
						onClick={() => onOpenActionModal('temp-ban')}
					>
						Ban temporaire
					</button>
					<button
						className="mod-btn danger"
						onClick={() => onOpenActionModal('perm-ban')}
					>
						Ban définitif
					</button>
				</div>
			)}
		</div>
	);
}
