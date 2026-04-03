'use client';

import {
	MODERATION_REASON_LABELS,
	SANCTION_LABELS,
	formatDuration,
} from '@/lib/constants';

interface CaseActionsProps {
	caseData: any;
	characters: any[];
	sanctions: any[];
	warnCount: number;
	nextSanction: any;
	adminLevel: string;
	// Action modal
	actionModal: string | null;
	actionReason: string;
	actionDuration: number;
	actionSubmitting: boolean;
	onActionModalChange: (action: string | null) => void;
	onActionReasonChange: (value: string) => void;
	onActionDurationChange: (value: number) => void;
	onActionSubmit: () => void;
	// Transcript modal
	transcriptModal: boolean;
	transcriptUrl: string;
	transcriptName: string;
	submitting: boolean;
	onTranscriptModalChange: (open: boolean) => void;
	onTranscriptUrlChange: (value: string) => void;
	onTranscriptNameChange: (value: string) => void;
	onLinkTranscript: () => void;
	// Reason modal
	reasonModal: boolean;
	newReason: string;
	newReasonDetail: string;
	onReasonModalChange: (open: boolean) => void;
	onNewReasonChange: (value: string) => void;
	onNewReasonDetailChange: (value: string) => void;
	onChangeReason: () => void;
	// Sanctions
	pardonSubmitting: number | null;
	pardonAllSubmitting: boolean;
	onRemoveWarn: (sanctionId: number) => void;
	onPardon: (sanctionId: number) => void;
	onPardonAll: () => void;
}

export default function CaseActions({
	caseData,
	characters,
	sanctions,
	warnCount,
	nextSanction,
	adminLevel,
	actionModal,
	actionReason,
	actionDuration,
	actionSubmitting,
	onActionModalChange,
	onActionReasonChange,
	onActionDurationChange,
	onActionSubmit,
	transcriptModal,
	transcriptUrl,
	transcriptName,
	submitting,
	onTranscriptModalChange,
	onTranscriptUrlChange,
	onTranscriptNameChange,
	onLinkTranscript,
	reasonModal,
	newReason,
	newReasonDetail,
	onReasonModalChange,
	onNewReasonChange,
	onNewReasonDetailChange,
	onChangeReason,
	pardonSubmitting,
	pardonAllSubmitting,
	onRemoveWarn,
	onPardon,
	onPardonAll,
}: CaseActionsProps) {
	const isFull = adminLevel === 'full';

	return (
		<>
			{/* Sidebar */}
			<div className="mod-sidebar">
				{/* Characters */}
				{characters.length > 0 && (
					<div className="mod-profile-section">
						<div className="mod-profile-section-title">Personnages</div>
						<ul className="mod-char-list">
							{characters.map((c: any) => (
								<li key={c.id} className="mod-char-item">
									<span className="mod-char-name">
										{c.firstName} {c.lastName}
									</span>
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

				{/* Created by */}
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
							{isFull && sanctions.length > 0 && (
								<button
									className="mod-btn-small pardon"
									onClick={onPardonAll}
									disabled={pardonAllSubmitting}
									style={{ marginLeft: '0.5rem' }}
								>
									{pardonAllSubmitting ? '...' : '🕊️ Pardon complet'}
								</button>
							)}
						</div>
						<table className="mod-sanctions-table">
							<thead>
								<tr>
									<th>Type</th>
									<th>Raison</th>
									<th>Date</th>
									{isFull && <th></th>}
								</tr>
							</thead>
							<tbody>
								{(() => {
									const lastWarnId = sanctions
										.filter((s: any) => s.type === 'warn')
										.sort(
											(a: any, b: any) =>
												(b.warnNumber || 0) - (a.warnNumber || 0),
										)[0]?.id;
									return sanctions.map((s: any) => (
										<tr key={s.id}>
											<td>
												<span className={`mod-sanction-type ${s.type}`}>
													{SANCTION_LABELS[s.type] || s.type}
													{s.type === 'warn' && s.warnNumber
														? ` ${s.warnNumber}/7`
														: ''}
													{s.duration
														? ` (${formatDuration(s.duration)})`
														: ''}
												</span>
											</td>
											<td
												style={{
													maxWidth: '150px',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap',
												}}
											>
												{s.reason}
											</td>
											<td>
												{new Date(s.createdAt).toLocaleDateString('fr-FR')}
											</td>
											{isFull && (
												<td>
													{s.type === 'warn' && s.id === lastWarnId ? (
														<button
															className="mod-btn-small danger"
															onClick={() => onRemoveWarn(s.id)}
															disabled={pardonSubmitting === s.id}
															title="Retirer ce warn"
														>
															{pardonSubmitting === s.id ? '...' : '✕'}
														</button>
													) : s.type !== 'warn' ? (
														<button
															className="mod-btn-small pardon"
															onClick={() => onPardon(s.id)}
															disabled={pardonSubmitting === s.id}
															title="Pardonner cette sanction"
														>
															{pardonSubmitting === s.id ? '...' : '🕊️'}
														</button>
													) : null}
												</td>
											)}
										</tr>
									));
								})()}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Action modal */}
			{actionModal && (
				<div
					className="mod-modal-overlay"
					onClick={e => {
						if (e.target === e.currentTarget) onActionModalChange(null);
					}}
				>
					<div className="mod-modal">
						<div className="mod-modal-header">
							<span>
								{actionModal === 'warn' && '⚠ Avertir'}
								{actionModal === 'kick' && 'Expulser'}
								{actionModal === 'temp-ban' && 'Bannir temporairement'}
								{actionModal === 'perm-ban' && 'Bannir définitivement'}
							</span>
							<button
								className="mod-modal-close"
								onClick={() => onActionModalChange(null)}
							>
								✕
							</button>
						</div>
						<div className="mod-modal-body">
							{actionModal === 'warn' && nextSanction && (
								<div className="mod-modal-warning">
									Cet avertissement sera le <strong>#{warnCount + 1}/7</strong>.
									{nextSanction.action !== 'warn' && (
										<>
											{' '}
											Action automatique : <strong>{nextSanction.label}</strong>
										</>
									)}
								</div>
							)}
							{actionModal === 'perm-ban' && (
								<div className="mod-modal-warning">
									⚠ Cette action est irréversible. Le joueur sera banni
									définitivement du serveur Discord.
								</div>
							)}
							<div className="mod-modal-info">
								Cible :{' '}
								<strong>
									{caseData.targetServerUsername || caseData.targetDiscordUsername}
								</strong>
							</div>
							<div className="mod-modal-field">
								<label className="mod-modal-label">Raison</label>
								<textarea
									className="mod-modal-textarea"
									value={actionReason}
									onChange={e => onActionReasonChange(e.target.value)}
									placeholder="Raison de la sanction..."
								/>
							</div>
							{actionModal === 'temp-ban' && (
								<div className="mod-modal-field">
									<label className="mod-modal-label">Durée</label>
									<select
										className="mod-reason-select"
										value={actionDuration}
										onChange={e => onActionDurationChange(Number(e.target.value))}
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
							<button className="mod-btn" onClick={() => onActionModalChange(null)}>
								Annuler
							</button>
							<button
								className={`mod-btn ${actionModal === 'warn' ? 'warn-btn' : 'danger'}`}
								onClick={onActionSubmit}
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
					onClick={e => {
						if (e.target === e.currentTarget) onTranscriptModalChange(false);
					}}
				>
					<div className="mod-modal">
						<div className="mod-modal-header">
							<span>Lier un transcript</span>
							<button
								className="mod-modal-close"
								onClick={() => onTranscriptModalChange(false)}
							>
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
									onChange={e => onTranscriptUrlChange(e.target.value)}
									placeholder="https://..."
								/>
							</div>
							<div className="mod-modal-field">
								<label className="mod-modal-label">Nom (optionnel)</label>
								<input
									className="mod-modal-input"
									type="text"
									value={transcriptName}
									onChange={e => onTranscriptNameChange(e.target.value)}
									placeholder="Ticket #1234"
								/>
							</div>
						</div>
						<div className="mod-modal-footer">
							<button className="mod-btn" onClick={() => onTranscriptModalChange(false)}>
								Annuler
							</button>
							<button
								className="mod-btn primary"
								onClick={onLinkTranscript}
								disabled={submitting || !transcriptUrl.trim()}
							>
								{submitting ? 'Envoi...' : 'Lier'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Reason change modal */}
			{reasonModal && (
				<div
					className="mod-modal-overlay"
					onClick={e => {
						if (e.target === e.currentTarget) onReasonModalChange(false);
					}}
				>
					<div className="mod-modal">
						<div className="mod-modal-header">
							<span>Modifier le motif</span>
							<button
								className="mod-modal-close"
								onClick={() => onReasonModalChange(false)}
							>
								✕
							</button>
						</div>
						<div className="mod-modal-body">
							<div className="mod-modal-field">
								<label className="mod-modal-label">Motif</label>
								<select
									className="mod-reason-select"
									value={newReason}
									onChange={e => onNewReasonChange(e.target.value)}
								>
									{Object.entries(MODERATION_REASON_LABELS).map(([v, l]) => (
										<option key={v} value={v}>
											{l}
										</option>
									))}
								</select>
							</div>
							<div className="mod-modal-field">
								<label className="mod-modal-label">Détail (optionnel)</label>
								<textarea
									className="mod-modal-textarea"
									value={newReasonDetail}
									onChange={e => onNewReasonDetailChange(e.target.value)}
									placeholder="Détail supplémentaire..."
								/>
							</div>
						</div>
						<div className="mod-modal-footer">
							<button className="mod-btn" onClick={() => onReasonModalChange(false)}>
								Annuler
							</button>
							<button
								className="mod-btn primary"
								onClick={onChangeReason}
								disabled={submitting}
							>
								{submitting ? 'Modification...' : 'Modifier'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
