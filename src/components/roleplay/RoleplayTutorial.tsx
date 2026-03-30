'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const TUTORIAL_SEEN_KEY = 'lif-roleplay-tutorial-seen';
const ADMIN_TUTORIAL_SEEN_KEY = 'lif-roleplay-admin-tutorial-seen';

interface TutorialStep {
	id: string;
	target: string | null;
	title: string;
	content: string;
	position: 'top' | 'bottom' | 'left' | 'right' | 'center';
	adminOnly?: boolean;
}

const USER_STEPS: TutorialStep[] = [
	{
		id: 'welcome',
		target: null,
		title: 'BIENVENUE, OPÉRATEUR',
		content:
			"Première connexion détectée. Ce briefing va vous guider à travers les systèmes de la Base de Données. Naviguez avec les boutons ou les flèches du clavier.",
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
		id: 'personnel',
		target: '[data-tutorial="personnel-panel"]',
		title: 'REGISTRE DU PERSONNEL',
		content:
			'Tous les dossiers du personnel sont répertoriés ici. Cliquez sur une fiche pour consulter le profil complet : identité, grade, unité, historique...',
		position: 'top',
	},
	{
		id: 'filters',
		target: '[data-tutorial="filters"]',
		title: 'RECHERCHE & FILTRES',
		content:
			"Les onglets Personnel, Cibles et Mes Personnages permettent de trier l'affichage. Utilisez la barre de recherche et les filtres par statut, grade ou unité.",
		position: 'bottom',
	},
	{
		id: 'create-char',
		target: null,
		title: 'CRÉER UN PERSONNAGE',
		content:
			"Une fois connecté, cliquez sur « Nouveau Personnage » dans la barre de session. Remplissez la fiche : nom, prénom, date de naissance, lieu d'origine, description physique, et background (civil, militaire, judiciaire). Ajoutez vos spécialisations et un avatar.",
		position: 'center',
	},
	{
		id: 'intelligence',
		target: '[data-tutorial="intelligence"]',
		title: 'RENSEIGNEMENTS',
		content:
			'La section renseignements regroupe les rapports terrain. Les agents autorisés peuvent consulter et filtrer les rapports existants.',
		position: 'top',
	},
	{
		id: 'create-intel',
		target: null,
		title: 'SOUMETTRE UN RAPPORT',
		content:
			"Pour créer un rapport de renseignement, cliquez sur « Nouveau rapport ». Renseignez le titre, la date, le type (observation, reconnaissance, SIGINT...), la description, et éventuellement les coordonnées et médias associés. Liez une cible ou faction si applicable.",
		position: 'center',
	},
	{
		id: 'audio',
		target: '[data-tutorial="audio-controls"]',
		title: 'CONTRÔLES AUDIO',
		content:
			"Coupez ou activez la musique d'ambiance et réglez le volume. Vos préférences sont sauvegardées automatiquement.",
		position: 'top',
	},
	{
		id: 'complete',
		target: null,
		title: 'BRIEFING TERMINÉ',
		content:
			"Vous êtes prêt. Explorez les dossiers, créez votre personnage et contribuez aux renseignements. Vous pouvez relancer ce tutoriel à tout moment via le bouton en bas à gauche.",
		position: 'center',
	},
];

const ADMIN_STEPS: TutorialStep[] = [
	{
		id: 'admin-welcome',
		target: null,
		title: 'BRIEFING ADMINISTRATEUR',
		content:
			"Ce briefing complémentaire couvre les fonctionnalités réservées aux administrateurs. Vous pouvez le relancer depuis le bouton « Tutoriel Admin » en bas à gauche.",
		position: 'center',
		adminOnly: true,
	},
	{
		id: 'admin-panel',
		target: '[data-tutorial="admin-panel"]',
		title: 'PANNEAU D\'ADMINISTRATION',
		content:
			"Ce panneau vous permet de créer et gérer les Unités et Factions. Ajoutez une unité avec nom, slug, couleur et insigne. Ajoutez une faction avec type (alliée, ennemie, neutre), couleur et logo.",
		position: 'bottom',
		adminOnly: true,
	},
	{
		id: 'admin-archives',
		target: '[data-tutorial="filters"]',
		title: 'ONGLET ARCHIVES',
		content:
			"En tant qu'admin, vous disposez d'un onglet « Archives » supplémentaire dans les filtres. Il affiche tous les dossiers archivés, masqués aux utilisateurs normaux.",
		position: 'bottom',
		adminOnly: true,
	},
	{
		id: 'admin-char-management',
		target: null,
		title: 'GESTION DES PERSONNAGES',
		content:
			"Sur chaque fiche personnage, vous pouvez : modifier le grade (avec override Discord), changer le statut (KIA, MIA, retraité...), définir la classification, marquer comme cible/ennemi avec niveau de menace, ajouter des notes État-Major, et archiver le dossier.",
		position: 'center',
		adminOnly: true,
	},
	{
		id: 'admin-timeline',
		target: null,
		title: 'CHRONOLOGIE DES PERSONNAGES',
		content:
			"Vous pouvez ajouter des événements à la chronologie de chaque personnage (promotion, mutation, blessure, médaille, sanction...) et supprimer des événements existants. Chaque événement a un type, une date, un titre et une classification.",
		position: 'center',
		adminOnly: true,
	},
	{
		id: 'admin-intel',
		target: '[data-tutorial="intelligence"]',
		title: 'GESTION DES RENSEIGNEMENTS',
		content:
			"Vous pouvez modifier le statut de chaque rapport (à vérifier, vérifié, fausse info, non concluant), éditer ou supprimer n'importe quel rapport, et filtrer par statut — fonctions réservées aux admins.",
		position: 'top',
		adminOnly: true,
	},
	{
		id: 'admin-npc',
		target: null,
		title: 'FICHES PNJ',
		content:
			"Lors de la création d'un personnage, vous pouvez cocher « Fiche PNJ » pour créer un personnage non lié à un compte Discord. Utile pour les personnages non-joueurs du roleplay.",
		position: 'center',
		adminOnly: true,
	},
	{
		id: 'admin-complete',
		target: null,
		title: 'BRIEFING ADMIN TERMINÉ',
		content:
			"Vous maîtrisez maintenant l'ensemble des outils d'administration. Gérez les personnages, les renseignements, les unités et factions avec précision.",
		position: 'center',
		adminOnly: true,
	},
];

type TutorialMode = 'user' | 'admin';

export function RoleplayTutorial({ isAdmin }: { isAdmin?: boolean }) {
	const [active, setActive] = useState(false);
	const [mode, setMode] = useState<TutorialMode>('user');
	const [currentStep, setCurrentStep] = useState(0);
	const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
	const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
	const animatingRef = useRef(false);

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

	const positionTooltip = useCallback((step: TutorialStep) => {
		if (!step.target || step.position === 'center') {
			setSpotlightRect(null);
			setTooltipStyle({
				position: 'fixed',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)',
			});
			animatingRef.current = false;
			return;
		}

		const el = document.querySelector(step.target);
		if (!el) {
			setSpotlightRect(null);
			setTooltipStyle({
				position: 'fixed',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)',
			});
			animatingRef.current = false;
			return;
		}

		el.scrollIntoView({ behavior: 'smooth', block: 'center' });

		// Wait for scroll to settle then position
		setTimeout(() => {
			const rect = el.getBoundingClientRect();
			setSpotlightRect(rect);

			const pad = 16;
			const tooltipMaxWidth = 380;
			const style: React.CSSProperties = { position: 'fixed' };

			switch (step.position) {
				case 'bottom':
					style.top = rect.bottom + pad;
					style.left = Math.max(
						pad,
						Math.min(
							rect.left + rect.width / 2 - tooltipMaxWidth / 2,
							window.innerWidth - tooltipMaxWidth - pad,
						),
					);
					break;
				case 'top':
					style.bottom = window.innerHeight - rect.top + pad;
					style.left = Math.max(
						pad,
						Math.min(
							rect.left + rect.width / 2 - tooltipMaxWidth / 2,
							window.innerWidth - tooltipMaxWidth - pad,
						),
					);
					break;
				case 'left':
					style.top = rect.top + rect.height / 2;
					style.right = window.innerWidth - rect.left + pad;
					style.transform = 'translateY(-50%)';
					break;
				case 'right':
					style.top = rect.top + rect.height / 2;
					style.left = rect.right + pad;
					style.transform = 'translateY(-50%)';
					break;
			}

			setTooltipStyle(style);
			animatingRef.current = false;
		}, 400);
	}, []);

	useEffect(() => {
		if (!active) return;
		animatingRef.current = true;
		positionTooltip(steps[currentStep]);
	}, [active, currentStep, positionTooltip, steps]);

	useEffect(() => {
		if (!active) return;
		const handler = () => {
			if (!animatingRef.current) positionTooltip(steps[currentStep]);
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
					if (!s.target || s.position === 'center' || document.querySelector(s.target)) break;
					next++;
				}
				if (next < steps.length) setCurrentStep(next);
				else closeTutorial();
			} else {
				if (currentStep <= 0) return;
				let prev = currentStep - 1;
				while (prev >= 0) {
					const s = steps[prev];
					if (!s.target || s.position === 'center' || document.querySelector(s.target)) break;
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
				<div className="tutorial-buttons">
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
				</div>
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

					<div className="tutorial-tooltip" style={tooltipStyle}>
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

						<p className="tutorial-tooltip-content">{step.content}</p>

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
									{currentStep < steps.length - 1
										? 'Suivant →'
										: 'Terminer ✓'}
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
