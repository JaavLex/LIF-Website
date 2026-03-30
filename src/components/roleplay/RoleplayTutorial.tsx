'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const TUTORIAL_SEEN_KEY = 'lif-roleplay-tutorial-seen';

interface TutorialStep {
	id: string;
	target: string | null;
	title: string;
	content: string;
	position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const STEPS: TutorialStep[] = [
	{
		id: 'welcome',
		target: null,
		title: 'BIENVENUE, OPÉRATEUR',
		content:
			"Première connexion détectée. Ce briefing va vous présenter les systèmes de la Base de Données du Personnel. Utilisez les flèches du clavier ou les boutons pour naviguer.",
		position: 'center',
	},
	{
		id: 'hero',
		target: '[data-tutorial="hero"]',
		title: 'IDENTIFICATION DE LA BASE',
		content:
			"L'en-tête affiche l'identité visuelle de votre unité — logo, désignation et classification d'accès.",
		position: 'bottom',
	},
	{
		id: 'session',
		target: '[data-tutorial="session-bar"]',
		title: 'AUTHENTIFICATION',
		content:
			'Connectez-vous via Discord pour accéder à votre dossier personnel, créer un personnage et utiliser les fonctionnalités avancées.',
		position: 'bottom',
	},
	{
		id: 'navigation',
		target: '[data-tutorial="navigation"]',
		title: 'NAVIGATION',
		content:
			'Accédez aux différents modules : Lore & Chronologie, et autres sections spécialisées disponibles.',
		position: 'bottom',
	},
	{
		id: 'personnel',
		target: '[data-tutorial="personnel-panel"]',
		title: 'BASE DE DONNÉES DU PERSONNEL',
		content:
			'Le registre principal. Tous les dossiers du personnel enregistré sont consultables ici.',
		position: 'top',
	},
	{
		id: 'filters',
		target: '[data-tutorial="filters"]',
		title: 'FILTRES & ONGLETS',
		content:
			'Basculez entre Personnel, Cibles et Vos Personnages. Filtrez par statut, grade ou unité. Recherchez par nom ou matricule.',
		position: 'bottom',
	},
	{
		id: 'intelligence',
		target: '[data-tutorial="intelligence"]',
		title: 'SECTION RENSEIGNEMENTS',
		content:
			'Les rapports de renseignement terrain sont répertoriés ici. Les agents disposant des autorisations requises peuvent soumettre de nouveaux rapports.',
		position: 'top',
	},
	{
		id: 'audio',
		target: '[data-tutorial="audio-controls"]',
		title: 'CONTRÔLES AUDIO',
		content:
			"Activez ou coupez la musique d'ambiance et réglez le volume. Vos préférences sont sauvegardées automatiquement.",
		position: 'top',
	},
	{
		id: 'complete',
		target: null,
		title: 'BRIEFING TERMINÉ',
		content:
			'Tous les systèmes sont opérationnels. Cliquez sur un dossier pour consulter les détails complets. Bonne exploration, opérateur.',
		position: 'center',
	},
];

export function RoleplayTutorial({ isAdmin }: { isAdmin?: boolean }) {
	const [active, setActive] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);
	const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
	const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
	const animatingRef = useRef(false);

	useEffect(() => {
		if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) {
			const timer = setTimeout(() => setActive(true), 1000);
			return () => clearTimeout(timer);
		}
	}, []);

	const positionTooltip = useCallback((step: TutorialStep) => {
		if (!step.target || step.position === 'center') {
			setSpotlightRect(null);
			setTooltipStyle({
				position: 'fixed',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)',
			});
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
		positionTooltip(STEPS[currentStep]);
	}, [active, currentStep, positionTooltip]);

	useEffect(() => {
		if (!active) return;
		const handler = () => {
			if (!animatingRef.current) positionTooltip(STEPS[currentStep]);
		};
		window.addEventListener('resize', handler);
		window.addEventListener('scroll', handler, true);
		return () => {
			window.removeEventListener('resize', handler);
			window.removeEventListener('scroll', handler, true);
		};
	}, [active, currentStep, positionTooltip]);

	const closeTutorial = useCallback(() => {
		localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
		setActive(false);
		setCurrentStep(0);
	}, []);

	const goToStep = useCallback(
		(direction: 'next' | 'prev') => {
			if (animatingRef.current) return;

			if (direction === 'next') {
				if (currentStep >= STEPS.length - 1) {
					closeTutorial();
					return;
				}
				// Skip steps with missing targets
				let next = currentStep + 1;
				while (next < STEPS.length) {
					const s = STEPS[next];
					if (!s.target || s.position === 'center' || document.querySelector(s.target)) break;
					next++;
				}
				if (next < STEPS.length) setCurrentStep(next);
				else closeTutorial();
			} else {
				if (currentStep <= 0) return;
				let prev = currentStep - 1;
				while (prev >= 0) {
					const s = STEPS[prev];
					if (!s.target || s.position === 'center' || document.querySelector(s.target)) break;
					prev--;
				}
				if (prev >= 0) setCurrentStep(prev);
			}
		},
		[currentStep, closeTutorial],
	);

	const startTutorial = useCallback(() => {
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

	const step = STEPS[currentStep];

	return (
		<>
			{isAdmin && !active && (
				<button
					type="button"
					className="tutorial-debug-btn"
					onClick={startTutorial}
					title="Relancer le tutoriel interactif"
				>
					▶ TUTORIEL
				</button>
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
								{currentStep + 1}/{STEPS.length}
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
									{currentStep < STEPS.length - 1
										? 'Suivant →'
										: 'Terminer ✓'}
								</button>
							</div>
						</div>

						<div className="tutorial-dots">
							{STEPS.map((_, i) => (
								<span
									key={STEPS[i].id}
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
