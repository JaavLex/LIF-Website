'use client';

import {
	MODERATION_REASON_LABELS,
	MODERATION_STATUS_LABELS,
} from '@/lib/constants';

interface CaseInfoProps {
	caseData: any;
	warnCount: number;
	nextSanction: any;
	adminLevel: string;
	changingStatus: boolean;
	error: string;
	onStatusChange: (status: string) => void;
	onOpenReasonModal: () => void;
}

export default function CaseInfo({
	caseData,
	warnCount,
	nextSanction,
	adminLevel,
	changingStatus,
	error,
	onStatusChange,
	onOpenReasonModal,
}: CaseInfoProps) {
	const isOpen = caseData.status === 'open' || caseData.status === 'pending';
	const isFull = adminLevel === 'full';

	return (
		<>
			{/* Case header */}
			<div className="mod-case-header">
				<img
					className="mod-case-avatar"
					src={
						caseData.targetDiscordAvatar ||
						`https://cdn.discordapp.com/embed/avatars/0.png`
					}
					alt=""
				/>
				<div className="mod-case-info">
					<div className="mod-case-number">Dossier #{caseData.caseNumber}</div>
					<div className="mod-case-target-name">
						{caseData.targetServerUsername || caseData.targetDiscordUsername}
					</div>
					<div className="mod-case-meta">
						<span>@{caseData.targetDiscordUsername}</span>
						<span>ID: {caseData.targetDiscordId}</span>
						<span>
							Motif: {MODERATION_REASON_LABELS[caseData.reason] || caseData.reason}
							{isFull && (
								<button
									className="mod-btn-small"
									onClick={onOpenReasonModal}
									style={{ marginLeft: '0.4rem' }}
									title="Modifier le motif"
								>
									✏️
								</button>
							)}
						</span>
						<span>
							Créé le {new Date(caseData.createdAt).toLocaleDateString('fr-FR')}
						</span>
					</div>
				</div>

				<div className="mod-case-actions">
					<span className={`mod-case-status ${caseData.status}`}>
						{MODERATION_STATUS_LABELS[caseData.status]}
					</span>
					{isOpen && (
						<>
							{caseData.status === 'open' && (
								<button
									className="mod-btn"
									onClick={() => onStatusChange('pending')}
									disabled={changingStatus}
								>
									En attente
								</button>
							)}
							{caseData.status === 'pending' && (
								<button
									className="mod-btn"
									onClick={() => onStatusChange('open')}
									disabled={changingStatus}
								>
									Rouvrir
								</button>
							)}
							<button
								className="mod-btn primary"
								onClick={() => onStatusChange('resolved')}
								disabled={changingStatus}
							>
								Résoudre
							</button>
							<button
								className="mod-btn"
								onClick={() => onStatusChange('archived')}
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
								onClick={() => onStatusChange('open')}
								disabled={changingStatus}
							>
								Rouvrir
							</button>
							<button
								className="mod-btn"
								onClick={() => onStatusChange('archived')}
								disabled={changingStatus}
							>
								Archiver
							</button>
						</>
					)}
					{caseData.status === 'archived' && (
						<button
							className="mod-btn primary"
							onClick={() => onStatusChange('open')}
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
		</>
	);
}
