'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import '../../moderation.css';

import CaseInfo from '@/components/moderation/CaseInfo';
import CaseTimeline from '@/components/moderation/CaseTimeline';
import CaseActions from '@/components/moderation/CaseActions';

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

	// Pardon
	const [pardonSubmitting, setPardonSubmitting] = useState<number | null>(null);
	const [pardonAllSubmitting, setPardonAllSubmitting] = useState(false);

	// Change reason
	const [reasonModal, setReasonModal] = useState(false);
	const [newReason, setNewReason] = useState('');
	const [newReasonDetail, setNewReasonDetail] = useState('');

	// Media upload
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

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
			setTimeout(
				() => timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
				100,
			);
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

	async function handleRemoveWarn(sanctionId: number) {
		if (!confirm('Retirer cet avertissement ?')) return;
		setPardonSubmitting(sanctionId);
		setError('');
		try {
			const res = await fetch(`/api/moderation/cases/${id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'remove-warn', sanctionId }),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error);
			}
			await loadCase();
		} catch (err: any) {
			setError(err.message);
		}
		setPardonSubmitting(null);
	}

	async function handlePardon(sanctionId: number) {
		if (
			!confirm("Pardonner cette sanction ? Si c'est un ban, le joueur sera débanni.")
		)
			return;
		setPardonSubmitting(sanctionId);
		setError('');
		try {
			const res = await fetch(`/api/moderation/cases/${id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'pardon', sanctionId }),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error);
			}
			await loadCase();
		} catch (err: any) {
			setError(err.message);
		}
		setPardonSubmitting(null);
	}

	async function handlePardonAll() {
		if (
			!confirm(
				'Pardonner TOUTES les sanctions de ce joueur ? Cette action retirera tous les warns, kicks et bans.',
			)
		)
			return;
		setPardonAllSubmitting(true);
		setError('');
		try {
			const res = await fetch(`/api/moderation/cases/${id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'pardon-all' }),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error);
			}
			await loadCase();
		} catch (err: any) {
			setError(err.message);
		}
		setPardonAllSubmitting(false);
	}

	async function handleChangeReason() {
		if (!newReason) return;
		setSubmitting(true);
		setError('');
		try {
			const res = await fetch(`/api/moderation/cases/${id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'change-reason',
					reason: newReason,
					reasonDetail: newReasonDetail,
				}),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error);
			}
			setReasonModal(false);
			await loadCase();
		} catch (err: any) {
			setError(err.message);
		}
		setSubmitting(false);
	}

	async function handleFileUpload(files: FileList | null) {
		if (!files || files.length === 0) return;
		setUploading(true);
		setError('');

		try {
			const uploadedIds: { file: number; description: string }[] = [];

			for (const file of Array.from(files)) {
				const formData = new FormData();
				formData.append('file', file);

				const res = await fetch('/api/upload', {
					method: 'POST',
					body: formData,
				});
				if (!res.ok) {
					const d = await res.json().catch(() => ({}));
					throw new Error(d.error || 'Erreur upload');
				}
				const data = await res.json();
				uploadedIds.push({ file: data.doc?.id || data.id, description: file.name });
			}

			// Post as a comment with attachments
			const res = await fetch(`/api/moderation/cases/${id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'comment',
					content: comment.trim() || `${uploadedIds.length} fichier(s) joint(s)`,
					eventType: eventType,
					attachments: uploadedIds,
				}),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error);
			}
			setComment('');
			if (fileInputRef.current) fileInputRef.current.value = '';
			await loadCase();
			setTimeout(
				() => timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
				100,
			);
		} catch (err: any) {
			setError(err.message);
		}
		setUploading(false);
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
						<a href="/roleplay" className="mod-btn primary">
							Retour au Roleplay
						</a>
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
					<CaseInfo
						caseData={caseData}
						warnCount={warnCount}
						nextSanction={nextSanction}
						adminLevel={adminLevel}
						changingStatus={changingStatus}
						error={error}
						onStatusChange={handleStatusChange}
						onOpenReasonModal={() => {
							setNewReason(caseData.reason);
							setNewReasonDetail(caseData.reasonDetail || '');
							setReasonModal(true);
						}}
					/>

					{/* Two column layout: timeline + sidebar */}
					<div className="mod-case-body">
						<CaseTimeline
							events={events}
							isOpen={isOpen}
							isFull={isFull}
							comment={comment}
							eventType={eventType}
							submitting={submitting}
							uploading={uploading}
							onCommentChange={setComment}
							onEventTypeChange={setEventType}
							onCommentSubmit={handleComment}
							onFileUpload={handleFileUpload}
							onOpenTranscriptModal={() => setTranscriptModal(true)}
							onOpenActionModal={setActionModal}
							timelineEndRef={timelineEndRef}
							fileInputRef={fileInputRef}
						/>

						<CaseActions
							caseData={caseData}
							characters={characters}
							sanctions={sanctions}
							warnCount={warnCount}
							nextSanction={nextSanction}
							adminLevel={adminLevel}
							actionModal={actionModal}
							actionReason={actionReason}
							actionDuration={actionDuration}
							actionSubmitting={actionSubmitting}
							onActionModalChange={setActionModal}
							onActionReasonChange={setActionReason}
							onActionDurationChange={setActionDuration}
							onActionSubmit={handleAction}
							transcriptModal={transcriptModal}
							transcriptUrl={transcriptUrl}
							transcriptName={transcriptName}
							submitting={submitting}
							onTranscriptModalChange={setTranscriptModal}
							onTranscriptUrlChange={setTranscriptUrl}
							onTranscriptNameChange={setTranscriptName}
							onLinkTranscript={handleLinkTranscript}
							reasonModal={reasonModal}
							newReason={newReason}
							newReasonDetail={newReasonDetail}
							onReasonModalChange={setReasonModal}
							onNewReasonChange={setNewReason}
							onNewReasonDetailChange={setNewReasonDetail}
							onChangeReason={handleChangeReason}
							pardonSubmitting={pardonSubmitting}
							pardonAllSubmitting={pardonAllSubmitting}
							onRemoveWarn={handleRemoveWarn}
							onPardon={handlePardon}
							onPardonAll={handlePardonAll}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
