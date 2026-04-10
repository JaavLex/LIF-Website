'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

/**
 * Admin-only action button that opens a modal asking for a reason, then
 * calls POST /api/roleplay/characters/[id]/require-improvements.
 *
 * The backend flips the character to dishonourable-discharge + sets
 * requiresImprovements=true and DMs the owner on Discord. The auto-clear
 * happens on the owner's next edit (see the PATCH route).
 */
export function RequireImprovementsButton({
	characterId,
	characterName,
	alreadyFlagged,
}: {
	characterId: number;
	characterName: string;
	alreadyFlagged?: boolean;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [error, setError] = useState('');
	const [mounted, setMounted] = useState(false);

	// Portal target is only safe to access after the component mounts on the
	// client — SSR has no `document`.
	useEffect(() => {
		setMounted(true);
	}, []);

	// Close on Escape + lock body scroll while the modal is open.
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !submitting && !cancelling) setOpen(false);
		};
		window.addEventListener('keydown', onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [open, submitting, cancelling]);

	const handleCancel = async () => {
		setCancelling(true);
		setError('');
		try {
			const res = await fetch(
				`/api/roleplay/characters/${characterId}/require-improvements`,
				{ method: 'DELETE' },
			);
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || "Erreur lors de l'annulation");
			}
			setOpen(false);
			router.refresh();
		} catch (err: any) {
			setError(err.message || 'Erreur');
		} finally {
			setCancelling(false);
		}
	};

	const handleSubmit = async () => {
		const trimmed = reason.trim();
		if (!trimmed) {
			setError('Veuillez saisir une raison.');
			return;
		}
		setSubmitting(true);
		setError('');
		try {
			const res = await fetch(
				`/api/roleplay/characters/${characterId}/require-improvements`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ reason: trimmed }),
				},
			);
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur lors de la demande');
			}
			const data = await res.json().catch(() => ({}));
			setOpen(false);
			setReason('');
			if (data?.dmDelivered === false) {
				alert(
					'Demande enregistrée, mais le DM Discord n\'a pas pu être envoyé (canal fermé ou bot bloqué).',
				);
			}
			router.refresh();
		} catch (err: any) {
			setError(err.message || 'Erreur');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				title={
					alreadyFlagged
						? 'Ce dossier est déjà marqué comme nécessitant des améliorations'
						: 'Demander au joueur de retravailler son dossier'
				}
				style={{
					padding: '0.5rem 1rem',
					fontSize: '0.85rem',
					whiteSpace: 'nowrap',
					background: alreadyFlagged
						? 'rgba(212, 120, 30, 0.15)'
						: 'transparent',
					border: '1px solid #d4781e',
					color: '#d4781e',
					cursor: 'pointer',
					fontWeight: 600,
					letterSpacing: '0.02em',
					textTransform: 'uppercase' as const,
				}}
			>
				{alreadyFlagged ? 'Améliorations en cours' : 'Demander des améliorations'}
			</button>

			{open && mounted && createPortal(
				<div
					role="dialog"
					aria-modal="true"
					style={{
						position: 'fixed',
						inset: 0,
						background: 'rgba(0, 0, 0, 0.75)',
						backdropFilter: 'blur(4px)',
						WebkitBackdropFilter: 'blur(4px)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 2147483000,
						padding: '1rem',
					}}
					onClick={e => {
						if (e.target === e.currentTarget && !submitting && !cancelling) setOpen(false);
					}}
				>
					<div
						style={{
							background: 'var(--background)',
							border: '1px solid #d4781e',
							padding: '2rem',
							maxWidth: 540,
							width: '100%',
							boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
						}}
					>
						<h2
							style={{
								color: '#d4781e',
								marginTop: 0,
								fontSize: '1.1rem',
								letterSpacing: '0.04em',
								textTransform: 'uppercase',
							}}
						>
							{alreadyFlagged
								? 'Annuler la demande d\'améliorations'
								: 'Demander des améliorations'}
						</h2>
						<p
							style={{
								fontSize: '0.85rem',
								color: 'var(--muted)',
								marginBottom: '1rem',
							}}
						>
							Dossier concerné : <strong>{characterName}</strong>
						</p>
						{alreadyFlagged ? (
							<p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
								La demande d&apos;améliorations sera annulée et le personnage
								reviendra au statut <strong>En service</strong>. Le joueur sera
								notifié par DM Discord.
							</p>
						) : (
							<>
								<p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
									Le personnage sera marqué comme <strong>réformé sans honneur</strong>{' '}
									et le joueur recevra un DM Discord avec votre raison. Le statut
									reviendra automatiquement à « En service » dès que le joueur modifiera
									sa fiche pour respecter les règles (photo + parcours civil et
									militaire d&apos;au moins 500 caractères chacun).
								</p>
								<label
									style={{
										display: 'block',
										fontSize: '0.8rem',
										color: 'var(--muted)',
										marginTop: '1rem',
										marginBottom: '0.35rem',
									}}
								>
									Raison (envoyée au joueur)
								</label>
								<textarea
									value={reason}
									onChange={e => setReason(e.target.value)}
									disabled={submitting}
									className="filter-input"
									style={{ width: '100%', minHeight: '140px', resize: 'vertical' }}
									placeholder="Exemple : Votre parcours militaire est trop court, merci de détailler vos précédentes affectations et missions..."
								/>
							</>
						)}
						{error && (
							<div
								style={{
									marginTop: '0.5rem',
									padding: '0.5rem 0.75rem',
									background: 'rgba(139, 38, 53, 0.15)',
									border: '1px solid var(--danger)',
									color: 'var(--danger)',
									fontSize: '0.8rem',
								}}
							>
								{error}
							</div>
						)}
						<div
							style={{
								display: 'flex',
								gap: '0.75rem',
								justifyContent: 'flex-end',
								marginTop: '1.25rem',
							}}
						>
							<button
								type="button"
								onClick={() => setOpen(false)}
								disabled={submitting || cancelling}
								className="session-btn"
								style={{ padding: '0.6rem 1.2rem' }}
							>
								Fermer
							</button>
							{alreadyFlagged ? (
								<button
									type="button"
									onClick={handleCancel}
									disabled={cancelling}
									style={{
										padding: '0.6rem 1.2rem',
										background: '#d4781e',
										color: '#000',
										border: 'none',
										fontWeight: 600,
										cursor: cancelling ? 'wait' : 'pointer',
										opacity: cancelling ? 0.6 : 1,
										textTransform: 'uppercase' as const,
										letterSpacing: '0.04em',
										fontSize: '0.85rem',
									}}
								>
									{cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
								</button>
							) : (
								<button
									type="button"
									onClick={handleSubmit}
									disabled={submitting || !reason.trim()}
									style={{
										padding: '0.6rem 1.2rem',
										background: '#d4781e',
										color: '#000',
										border: 'none',
										fontWeight: 600,
										cursor: submitting ? 'wait' : 'pointer',
										opacity: submitting || !reason.trim() ? 0.6 : 1,
										textTransform: 'uppercase' as const,
										letterSpacing: '0.04em',
										fontSize: '0.85rem',
									}}
								>
									{submitting ? 'Envoi...' : 'Envoyer la demande'}
								</button>
							)}
						</div>
					</div>
				</div>,
				document.body,
			)}
		</>
	);
}
