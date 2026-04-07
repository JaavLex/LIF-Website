'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import {
	DummyCharacterForm,
	DummyIntelForm,
	DummyAdminCharForm,
	DummyAdminIntelForm,
	DummyAdminTimelineForm,
} from './TutorialDummyForms';
import { VersionInfo } from '@/components/VersionInfo';

// v2 — bumped 2026-04-07 when COMMS / Organisations steps were added.
// Bumping the suffix re-shows the tutorial to existing users so they discover
// the new sections (especially COMMS, which is essential).
const TUTORIAL_SEEN_KEY = 'lif-roleplay-tutorial-seen.v2';
const ADMIN_TUTORIAL_SEEN_KEY = 'lif-roleplay-admin-tutorial-seen.v2';

interface TutorialStep {
	id: string;
	target: string | null;
	title: string;
	content: string;
	position: 'top' | 'bottom' | 'left' | 'right' | 'center';
	adminOnly?: boolean;
	dummyForm?:
		| 'character'
		| 'intel'
		| 'admin-character'
		| 'admin-intel'
		| 'admin-timeline';
}

const DUMMY_FORMS: Record<string, () => React.ReactNode> = {
	character: DummyCharacterForm,
	intel: DummyIntelForm,
	'admin-character': DummyAdminCharForm,
	'admin-intel': DummyAdminIntelForm,
	'admin-timeline': DummyAdminTimelineForm,
};

const USER_STEPS: TutorialStep[] = [
	{
		id: 'welcome',
		target: null,
		title: 'BIENVENUE, OPÉRATEUR',
		content:
			'Première connexion détectée. Ce briefing va vous guider à travers les systèmes de la Base de Données. Naviguez avec les boutons ou les flèches du clavier.',
		position: 'center',
	},
	{
		id: 'session',
		target: '[data-tutorial="session-bar"]',
		title: 'CONNEXION DISCORD',
		content:
			'Connectez-vous avec votre compte Discord pour accéder à vos dossiers, créer un personnage et soumettre des renseignements.',
		position: 'bottom',
	},
	{
		id: 'lore',
		target: '[data-tutorial="navigation"]',
		title: 'LORE & CHRONOLOGIE',
		content:
			"Ce bouton vous donne accès à l'univers du roleplay — l'histoire, le contexte et la chronologie des événements.",
		position: 'bottom',
	},
	{
		id: 'comms',
		target: '[data-tutorial="comms-button"]',
		title: 'COMMS — CANAL TACTIQUE',
		content:
			"⚡ FONCTIONNALITÉ ESSENTIELLE. Le bouton COMMS ouvre le HUD tactique de communication : canaux de discussion en jeu, messages de mission, mentions @vous. Une pastille rouge apparaît dès qu'on vous adresse un message — vérifiez-la régulièrement, c'est ainsi que les autres opérateurs vous contactent.",
		position: 'bottom',
	},
	{
		id: 'personnel',
		target: '[data-tutorial="personnel-panel"]',
		title: 'REGISTRE DU PERSONNEL',
		content:
			'Tous les dossiers du personnel sont répertoriés ici. Cliquez sur une fiche pour consulter le profil complet.',
		position: 'top',
	},
	{
		id: 'filters',
		target: '[data-tutorial="filters"]',
		title: 'RECHERCHE & FILTRES',
		content:
			"Les onglets Personnel, Cibles et Mes Personnages permettent de trier l'affichage. Utilisez la barre de recherche et les filtres.",
		position: 'bottom',
	},
	{
		id: 'create-char',
		target: null,
		title: 'CRÉER UN PERSONNAGE',
		content:
			"Cliquez sur « Nouveau Personnage » dans la barre de session. Vous choisirez d'abord votre unité (Cerberus ou Spectre — c'est définitif), puis vous remplirez votre dossier. Voici les champs :",
		position: 'center',
		dummyForm: 'character',
	},
	{
		id: 'organisations',
		target: '[data-tutorial="organisations"]',
		title: 'ORGANISATIONS & UNITÉS',
		content:
			"La hiérarchie de la LIF : faction principale en hero, fer de lance (Cerberus / Spectre) en bandes featured, puis les factions alliées / neutres / hostiles. Cliquez sur n'importe quelle faction ou unité pour ouvrir son dossier complet (description, doctrine, commandement, effectifs).",
		position: 'top',
	},
	{
		id: 'intelligence',
		target: '[data-tutorial="intelligence"]',
		title: 'RENSEIGNEMENTS',
		content:
			'La section renseignements regroupe les rapports terrain. Les agents autorisés peuvent consulter et filtrer les rapports.',
		position: 'top',
	},
	{
		id: 'create-intel',
		target: null,
		title: 'SOUMETTRE UN RAPPORT',
		content:
			'Cliquez sur « Nouveau rapport » pour créer un renseignement. Voici le formulaire :',
		position: 'center',
		dummyForm: 'intel',
	},
	{
		id: 'audio',
		target: '[data-tutorial="audio-controls"]',
		title: 'CONTRÔLES AUDIO',
		content:
			"Coupez ou activez la musique d'ambiance et réglez le volume. Vos préférences sont sauvegardées.",
		position: 'top',
	},
	{
		id: 'complete',
		target: null,
		title: 'BRIEFING TERMINÉ',
		content:
			"Vous êtes prêt. Explorez les dossiers, créez votre personnage, surveillez vos COMMS et contribuez aux renseignements. Relancez ce tutoriel via le bouton en bas à gauche.",
		position: 'center',
	},
];

const ADMIN_STEPS: TutorialStep[] = [
	{
		id: 'admin-welcome',
		target: null,
		title: 'BRIEFING ADMINISTRATEUR',
		content: 'Ce briefing couvre les fonctionnalités réservées aux administrateurs.',
		position: 'center',
		adminOnly: true,
	},
	{
		id: 'admin-panel',
		target: '[data-tutorial="admin-panel"]',
		title: "PANNEAU D'ADMINISTRATION",
		content:
			"Créez et gérez les Unités (nom, slug, couleur, insigne, drapeau « Unité principale » + tagline / pitch / traits du sélecteur) et les Factions (type, couleur, logo, drapeau « Faction principale »). Les unités principales de la faction principale apparaissent automatiquement sous la bannière FER DE LANCE de la page d'accueil.",
		position: 'bottom',
		adminOnly: true,
	},
	{
		id: 'admin-archives',
		target: '[data-tutorial="filters"]',
		title: 'ONGLET ARCHIVES',
		content:
			"L'onglet « Archives » affiche les dossiers archivés, masqués aux utilisateurs normaux.",
		position: 'bottom',
		adminOnly: true,
	},
	{
		id: 'admin-char-management',
		target: null,
		title: 'GESTION DES PERSONNAGES',
		content:
			'Sur chaque fiche, vous avez accès à une section admin avec ces contrôles :',
		position: 'center',
		adminOnly: true,
		dummyForm: 'admin-character',
	},
	{
		id: 'admin-timeline',
		target: null,
		title: 'CHRONOLOGIE',
		content:
			"Ajoutez et supprimez des événements dans l'historique de chaque personnage :",
		position: 'center',
		adminOnly: true,
		dummyForm: 'admin-timeline',
	},
	{
		id: 'admin-intel',
		target: null,
		title: 'GESTION DES RENSEIGNEMENTS',
		content: 'Actions disponibles sur les rapports de renseignement en mode admin :',
		position: 'center',
		adminOnly: true,
		dummyForm: 'admin-intel',
	},
	{
		id: 'admin-complete',
		target: null,
		title: 'BRIEFING ADMIN TERMINÉ',
		content:
			"Vous maîtrisez les outils d'administration. Gérez les personnages, renseignements, unités et factions.",
		position: 'center',
		adminOnly: true,
	},
];

type TutorialMode = 'user' | 'admin';

export function RoleplayTutorial({
	isAdmin,
	adminPermissions,
}: {
	isAdmin?: boolean;
	adminPermissions?: { roleName: string; level: string } | null;
}) {
	const [active, setActive] = useState(false);
	const [mode, setMode] = useState<TutorialMode>('user');
	const [currentStep, setCurrentStep] = useState(0);
	const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
	const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false);
	const animatingRef = useRef(false);
	const tooltipRef = useRef<HTMLDivElement>(null);

	// Toggle body attribute so CSS can hide/show audio controls too
	useEffect(() => {
		if (mobileToolbarOpen) {
			document.documentElement.setAttribute('data-toolbar-open', '');
		} else {
			document.documentElement.removeAttribute('data-toolbar-open');
		}
	}, [mobileToolbarOpen]);

	const steps = mode === 'admin' ? ADMIN_STEPS : USER_STEPS;

	useEffect(() => {
		if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) {
			const timer = setTimeout(() => {
				setMode('user');
				setActive(true);
			}, 1000);
			return () => clearTimeout(timer);
		} else if (isAdmin && !localStorage.getItem(ADMIN_TUTORIAL_SEEN_KEY)) {
			const timer = setTimeout(() => {
				setMode('admin');
				setActive(true);
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [isAdmin]);

	/**
	 * Position the tooltip card by measuring its actual rendered size and the
	 * target element's bounding rect. Imperative (no React state) so we can
	 * re-run cheaply on resize/scroll without flicker. Hard-clamps the final
	 * top/left so the entire card always stays inside the viewport — even
	 * tall steps with dummy forms (the body scrolls internally instead of
	 * pushing actions off-screen).
	 */
	const positionTooltip = useCallback((step: TutorialStep, skipScroll = false) => {
		const el = tooltipRef.current;
		if (!el) return;

		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const pad = 12;
		const mobile = vw <= 768;
		const desiredW = mobile ? vw - pad * 2 : Math.min(460, vw - pad * 2);
		const maxH = vh - pad * 2;

		// Reset positioning so we can measure the natural rendered height for
		// the new step (the previous step may have constrained height).
		el.style.position = 'fixed';
		el.style.right = 'auto';
		el.style.bottom = 'auto';
		el.style.transform = 'none';
		el.style.width = `${desiredW}px`;
		el.style.maxWidth = `${desiredW}px`;
		el.style.maxHeight = `${maxH}px`;
		// Move offscreen for clean measurement
		el.style.top = '0px';
		el.style.left = '-9999px';
		// Force reflow
		void el.offsetHeight;
		const measured = el.getBoundingClientRect();
		const cardW = Math.min(measured.width, desiredW);
		const cardH = Math.min(measured.height, maxH);

		const clampLeft = (l: number) =>
			Math.max(pad, Math.min(l, vw - cardW - pad));
		const clampTop = (t: number) =>
			Math.max(pad, Math.min(t, vh - cardH - pad));

		const placeCenter = () => {
			el.style.left = `${clampLeft((vw - cardW) / 2)}px`;
			el.style.top = `${clampTop((vh - cardH) / 2)}px`;
		};

		// Center positioning for steps without a target
		if (!step.target || step.position === 'center') {
			setSpotlightRect(null);
			placeCenter();
			animatingRef.current = false;
			return;
		}

		const target = document.querySelector(step.target);
		if (!target) {
			setSpotlightRect(null);
			placeCenter();
			animatingRef.current = false;
			return;
		}

		// Bring target into view instantly so our measurements are stable.
		// Skipped on scroll/resize repositioning to avoid feedback loops.
		if (!skipScroll) {
			target.scrollIntoView({ behavior: 'auto', block: 'center' });
		}
		const rect = target.getBoundingClientRect();
		setSpotlightRect(rect);

		// If target nearly fills viewport, just center the card.
		if (rect.height > vh * 0.75 || rect.width > vw * 0.85) {
			placeCenter();
			animatingRef.current = false;
			return;
		}

		// Resolve preferred side, with mobile fallback for left/right.
		let pos = step.position;
		if (mobile && (pos === 'left' || pos === 'right')) {
			pos = rect.top > vh / 2 ? 'top' : 'bottom';
		}

		// Available space on each side of the target.
		const spaceBelow = vh - rect.bottom - pad;
		const spaceAbove = rect.top - pad;
		const spaceRight = vw - rect.right - pad;
		const spaceLeft = rect.left - pad;

		// Pick a side that actually fits the card; otherwise pick the largest.
		const fitsBottom = spaceBelow >= cardH;
		const fitsTop = spaceAbove >= cardH;
		const fitsRight = !mobile && spaceRight >= cardW;
		const fitsLeft = !mobile && spaceLeft >= cardW;

		const candidates: Array<{ side: typeof pos; fits: boolean; space: number }> = [
			{ side: 'bottom', fits: fitsBottom, space: spaceBelow },
			{ side: 'top', fits: fitsTop, space: spaceAbove },
			{ side: 'right', fits: fitsRight, space: spaceRight },
			{ side: 'left', fits: fitsLeft, space: spaceLeft },
		];
		// Prefer the requested side if it fits; otherwise the side with the
		// most room (so we never end up with an off-screen card).
		const requested = candidates.find((c) => c.side === pos);
		let chosen = requested && requested.fits ? requested : null;
		if (!chosen) {
			const fitting = candidates.filter((c) => c.fits);
			if (fitting.length > 0) {
				chosen =
					fitting.find((c) => c.side === pos) ||
					fitting.sort((a, b) => b.space - a.space)[0];
			} else {
				// Nothing fits — fall back to centering over the viewport.
				placeCenter();
				animatingRef.current = false;
				return;
			}
		}

		const targetCenterX = rect.left + rect.width / 2;
		const targetCenterY = rect.top + rect.height / 2;

		let top = 0;
		let left = 0;
		switch (chosen.side) {
			case 'bottom':
				top = rect.bottom + pad;
				left = targetCenterX - cardW / 2;
				break;
			case 'top':
				top = rect.top - pad - cardH;
				left = targetCenterX - cardW / 2;
				break;
			case 'right':
				top = targetCenterY - cardH / 2;
				left = rect.right + pad;
				break;
			case 'left':
				top = targetCenterY - cardH / 2;
				left = rect.left - pad - cardW;
				break;
		}

		el.style.left = `${clampLeft(left)}px`;
		el.style.top = `${clampTop(top)}px`;
		animatingRef.current = false;
	}, []);

	useLayoutEffect(() => {
		if (!active) return;
		animatingRef.current = true;
		// Run after layout so the new step's content is in the DOM.
		positionTooltip(steps[currentStep]);
	}, [active, currentStep, positionTooltip, steps]);

	useEffect(() => {
		if (!active) return;
		const handler = () => {
			if (!animatingRef.current) positionTooltip(steps[currentStep], true);
		};
		window.addEventListener('resize', handler);
		window.addEventListener('scroll', handler, true);
		return () => {
			window.removeEventListener('resize', handler);
			window.removeEventListener('scroll', handler, true);
		};
	}, [active, currentStep, positionTooltip, steps]);

	const closeTutorial = useCallback(() => {
		if (mode === 'admin') {
			localStorage.setItem(ADMIN_TUTORIAL_SEEN_KEY, '1');
		} else {
			localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
		}
		setActive(false);
		setCurrentStep(0);
	}, [mode]);

	const goToStep = useCallback(
		(direction: 'next' | 'prev') => {
			if (animatingRef.current) return;

			if (direction === 'next') {
				if (currentStep >= steps.length - 1) {
					closeTutorial();
					return;
				}
				let next = currentStep + 1;
				while (next < steps.length) {
					const s = steps[next];
					if (
						!s.target ||
						s.position === 'center' ||
						document.querySelector(s.target)
					)
						break;
					next++;
				}
				if (next < steps.length) setCurrentStep(next);
				else closeTutorial();
			} else {
				if (currentStep <= 0) return;
				let prev = currentStep - 1;
				while (prev >= 0) {
					const s = steps[prev];
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
		[currentStep, closeTutorial, steps],
	);

	const startUserTutorial = useCallback(() => {
		setMode('user');
		setCurrentStep(0);
		setActive(true);
	}, []);

	const startAdminTutorial = useCallback(() => {
		setMode('admin');
		setCurrentStep(0);
		setActive(true);
	}, []);

	useEffect(() => {
		if (!active) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeTutorial();
			if (e.key === 'ArrowRight' || e.key === 'Enter') {
				e.preventDefault();
				goToStep('next');
			}
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				goToStep('prev');
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [active, closeTutorial, goToStep]);

	const step = steps[currentStep];

	return (
		<>
			{!active && (
				<>
					{/* Mobile toggle button — visible only on small screens */}
					<button
						type="button"
						className="mobile-toolbar-toggle"
						onClick={() => setMobileToolbarOpen(prev => !prev)}
						aria-label={mobileToolbarOpen ? 'Masquer les contrôles' : 'Afficher les contrôles'}
					>
						{mobileToolbarOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
					</button>

					<div className={`tutorial-buttons ${mobileToolbarOpen ? 'mobile-open' : ''}`}>
						<VersionInfo />
						<button
							type="button"
							className="tutorial-debug-btn rules-reopen-btn"
							onClick={() => window.dispatchEvent(new Event('open-rules-modal'))}
							title="Relire le règlement RP"
						>
							📋 RÈGLEMENT
						</button>
						<button
							type="button"
							className="tutorial-debug-btn"
							onClick={startUserTutorial}
							title="Relancer le tutoriel"
						>
							? TUTORIEL
						</button>
						{isAdmin && (
							<button
								type="button"
								className="tutorial-debug-btn tutorial-admin-btn"
								onClick={startAdminTutorial}
								title="Tutoriel administrateur"
							>
								⚙ ADMIN
							</button>
						)}
						{isAdmin && adminPermissions && (
							<div className="admin-indicator">
								<span className="admin-indicator-dot" />
								<span>ADMIN</span>
								<span className="admin-role-name">{adminPermissions.roleName}</span>
								<span className="admin-perm-level">
									({adminPermissions.level === 'full' ? 'Complet' : 'Limité'})
								</span>
							</div>
						)}
					</div>
				</>
			)}

			{active && (
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

					<div
						ref={tooltipRef}
						className={`tutorial-tooltip${step.dummyForm ? ' has-dummy-form' : ''}`}
					>
						<div className="tutorial-tooltip-header">
							<span className="tutorial-step-badge">
								{currentStep + 1}/{steps.length}
							</span>
							<h3 className="tutorial-tooltip-title">{step.title}</h3>
							<button
								type="button"
								className="tutorial-close-btn"
								onClick={closeTutorial}
								aria-label="Fermer le tutoriel"
							>
								✕
							</button>
						</div>

						<div className="tutorial-tooltip-body">
							<p className="tutorial-tooltip-content">{step.content}</p>

							{step.dummyForm && DUMMY_FORMS[step.dummyForm] && (
								<div className="tutorial-dummy-wrapper">
									{DUMMY_FORMS[step.dummyForm]()}
								</div>
							)}
						</div>

						<div className="tutorial-tooltip-actions">
							<button
								type="button"
								className="tutorial-btn tutorial-btn-skip"
								onClick={closeTutorial}
							>
								Passer
							</button>
							<div className="tutorial-btn-group">
								{currentStep > 0 && (
									<button
										type="button"
										className="tutorial-btn tutorial-btn-prev"
										onClick={() => goToStep('prev')}
									>
										← Précédent
									</button>
								)}
								<button
									type="button"
									className="tutorial-btn tutorial-btn-next"
									onClick={() => goToStep('next')}
								>
									{currentStep < steps.length - 1 ? 'Suivant →' : 'Terminer ✓'}
								</button>
							</div>
						</div>

						<div className="tutorial-dots">
							{steps.map((_, i) => (
								<span
									key={steps[i].id}
									className={`tutorial-dot${i === currentStep ? ' active' : ''}${i < currentStep ? ' completed' : ''}`}
								/>
							))}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
