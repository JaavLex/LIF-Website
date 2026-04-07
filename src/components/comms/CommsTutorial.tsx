'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTutorialPositioning } from '../roleplay/useTutorialPositioning';
import '../roleplay/tutorial-overlay.css';

const COMMS_TUTORIAL_SEEN_KEY = 'lif-comms-tutorial-seen.v1';

interface CommsTutorialStep {
	id: string;
	target: string | null;
	title: string;
	content: string;
	position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const STEPS: CommsTutorialStep[] = [
	{
		id: 'welcome',
		target: null,
		title: 'BIENVENUE SUR LE CANAL',
		content:
			"COMMS est le HUD tactique de communication de la LIF. Vous y discutez en jeu (canaux faction / unité), créez des messages directs, et recevez les briefings de mission. Suivez ce briefing rapide pour découvrir les commandes.",
		position: 'center',
	},
	{
		id: 'profile',
		target: '[data-tutorial-comms="profile-bar"]',
		title: 'VOTRE OPÉRATEUR ACTIF',
		content:
			"Votre personnage actif (rang, faction, unité) est affiché ici. Tous les messages que vous envoyez sont signés sous cette identité — entrer en service via votre dossier pour changer.",
		position: 'bottom',
	},
	{
		id: 'channels',
		target: '[data-tutorial-comms="sidebar"]',
		title: 'LISTE DES CANAUX',
		content:
			"La barre latérale liste tous les canaux dont vous êtes membre : canaux de faction, d'unité, messages directs (DM) et groupes privés. Une pastille @N indique des mentions non lues.",
		position: 'right',
	},
	{
		id: 'new-dm',
		target: '[data-tutorial-comms="new-dm"]',
		title: 'NOUVEAU MESSAGE DIRECT',
		content:
			"Ouvrez une conversation privée avec un autre opérateur. Cherchez son nom dans la liste, validez, et le canal est créé.",
		position: 'bottom',
	},
	{
		id: 'new-group',
		target: '[data-tutorial-comms="new-group"]',
		title: 'NOUVEAU GROUPE',
		content:
			"Créez un groupe privé multi-membres pour coordonner une mission ou une cellule. Les membres reçoivent une invitation au canal.",
		position: 'bottom',
	},
	{
		id: 'messages',
		target: '[data-tutorial-comms="messages"]',
		title: 'FIL DE MESSAGES',
		content:
			"Les messages s'affichent ici en temps réel. Cliquez sur un avatar pour ouvrir le profil de l'opérateur, ou sur un message pour répondre / le citer.",
		position: 'left',
	},
	{
		id: 'composer',
		target: '[data-tutorial-comms="composer"]',
		title: 'RÉDACTION',
		content:
			"Tapez votre message ici. Mentionnez un opérateur avec @ pour le notifier (sa pastille rouge s'allume sur le bouton COMMS). Vous pouvez également joindre un rapport de renseignement.",
		position: 'top',
	},
	{
		id: 'members',
		target: '[data-tutorial-comms="members-btn"]',
		title: 'MEMBRES DU CANAL',
		content:
			"Affiche la liste complète des membres du canal courant. Indispensable pour vérifier qui peut lire vos messages avant d'envoyer du contenu sensible.",
		position: 'left',
	},
	{
		id: 'mute',
		target: '[data-tutorial-comms="mute"]',
		title: 'COUPER LES SONS',
		content:
			"Désactive les notifications sonores (radio ping, bip de message). Votre préférence est sauvegardée localement.",
		position: 'bottom',
	},
	{
		id: 'mobile-tabs',
		target: '[data-tutorial-comms="mobile-tabs"]',
		title: 'NAVIGATION MOBILE',
		content:
			"Sur mobile, basculez entre la liste des canaux, la conversation et la liste des membres avec ces onglets en bas d'écran.",
		position: 'top',
	},
	{
		id: 'complete',
		target: null,
		title: 'BRIEFING TERMINÉ',
		content:
			"Vous êtes opérationnel. N'oubliez pas : aucune communication n'est anonyme, tout est consultable par la modération. Bonne chasse, opérateur.",
		position: 'center',
	},
];

export function CommsTutorial() {
	const [active, setActive] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);

	const { tooltipRef, spotlightRect, animatingRef } = useTutorialPositioning(
		active,
		currentStep,
		STEPS,
	);

	// Auto-open on first visit
	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (!localStorage.getItem(COMMS_TUTORIAL_SEEN_KEY)) {
			const timer = setTimeout(() => setActive(true), 800);
			return () => clearTimeout(timer);
		}
	}, []);

	// Allow external trigger via custom event (replay button)
	useEffect(() => {
		const open = () => {
			setCurrentStep(0);
			setActive(true);
		};
		window.addEventListener('open-comms-tutorial', open);
		return () => window.removeEventListener('open-comms-tutorial', open);
	}, []);

	const close = useCallback(() => {
		localStorage.setItem(COMMS_TUTORIAL_SEEN_KEY, '1');
		setActive(false);
		setCurrentStep(0);
	}, []);

	const go = useCallback(
		(dir: 'next' | 'prev') => {
			if (animatingRef.current) return;
			if (dir === 'next') {
				if (currentStep >= STEPS.length - 1) {
					close();
					return;
				}
				// Skip steps whose target doesn't exist on current viewport
				let next = currentStep + 1;
				while (next < STEPS.length) {
					const s = STEPS[next];
					if (
						!s.target ||
						s.position === 'center' ||
						document.querySelector(s.target)
					)
						break;
					next++;
				}
				if (next < STEPS.length) setCurrentStep(next);
				else close();
			} else {
				if (currentStep <= 0) return;
				let prev = currentStep - 1;
				while (prev >= 0) {
					const s = STEPS[prev];
					if (
						!s.target ||
						s.position === 'center' ||
						document.querySelector(s.target)
					)
						break;
					prev--;
				}
				if (prev >= 0) setCurrentStep(prev);
			}
		},
		[currentStep, close, animatingRef],
	);

	useEffect(() => {
		if (!active) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
			if (e.key === 'ArrowRight' || e.key === 'Enter') {
				e.preventDefault();
				go('next');
			}
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				go('prev');
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [active, close, go]);

	if (!active) return null;
	const step = STEPS[currentStep];

	return (
		<div className="tutorial-overlay">
			{spotlightRect ? (
				<div
					className="tutorial-spotlight"
					style={{
						top: spotlightRect.top - 8,
						left: spotlightRect.left - 8,
						width: spotlightRect.width + 16,
						height: spotlightRect.height + 16,
					}}
				/>
			) : (
				<div className="tutorial-backdrop" />
			)}

			<div ref={tooltipRef} className="tutorial-tooltip">
				<div className="tutorial-tooltip-header">
					<span className="tutorial-step-badge">
						{currentStep + 1}/{STEPS.length}
					</span>
					<h3 className="tutorial-tooltip-title">{step.title}</h3>
					<button
						type="button"
						className="tutorial-close-btn"
						onClick={close}
						aria-label="Fermer le tutoriel"
					>
						✕
					</button>
				</div>

				<div className="tutorial-tooltip-body">
					<p className="tutorial-tooltip-content">{step.content}</p>
				</div>

				<div className="tutorial-tooltip-actions">
					<button
						type="button"
						className="tutorial-btn tutorial-btn-skip"
						onClick={close}
					>
						Passer
					</button>
					<div className="tutorial-btn-group">
						{currentStep > 0 && (
							<button
								type="button"
								className="tutorial-btn tutorial-btn-prev"
								onClick={() => go('prev')}
							>
								← Précédent
							</button>
						)}
						<button
							type="button"
							className="tutorial-btn tutorial-btn-next"
							onClick={() => go('next')}
						>
							{currentStep < STEPS.length - 1 ? 'Suivant →' : 'Terminer ✓'}
						</button>
					</div>
				</div>

				<div className="tutorial-dots">
					{STEPS.map((s, i) => (
						<span
							key={s.id}
							className={`tutorial-dot${i === currentStep ? ' active' : ''}${i < currentStep ? ' completed' : ''}`}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
