'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useTutorialPositioning } from './useTutorialPositioning';
import './tutorial-overlay.css';
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
	const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false);

	const steps = mode === 'admin' ? ADMIN_STEPS : USER_STEPS;
	const { tooltipRef, spotlightRect, animatingRef } = useTutorialPositioning(
		active,
		currentStep,
		steps,
	);

	// Toggle body attribute so CSS can hide/show audio controls too
	useEffect(() => {
		if (mobileToolbarOpen) {
			document.documentElement.setAttribute('data-toolbar-open', '');
		} else {
			document.documentElement.removeAttribute('data-toolbar-open');
		}
	}, [mobileToolbarOpen]);

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
