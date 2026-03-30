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
	dummyForm?: 'character' | 'intel' | 'admin-character' | 'admin-intel' | 'admin-timeline';
}

/* ─── Dummy form label style ─── */
const dls: React.CSSProperties = {
	display: 'block', fontSize: '0.7rem', color: 'var(--muted)',
	marginBottom: '0.2rem', marginTop: '0.5rem',
};
const dinp: React.CSSProperties = {
	width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.75rem',
	background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
	color: 'var(--text)', fontFamily: 'inherit',
};
const dsel: React.CSSProperties = { ...dinp };
const dgrid: React.CSSProperties = {
	display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
};
const dsec: React.CSSProperties = {
	borderTop: '1px solid rgba(74,124,35,0.2)', paddingTop: '0.5rem', marginTop: '0.5rem',
};

function DummyCharacterForm() {
	return (
		<div className="tutorial-dummy-form">
			<div className="tutorial-dummy-title">Aperçu — Création de personnage</div>
			<div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
				<div style={{ width: 60, height: 60, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--muted)', textAlign: 'center', flexShrink: 0 }}>
					Avatar
				</div>
				<div style={{ flex: 1 }}>
					<div style={{ fontSize: '0.7rem', padding: '0.3rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
						Grade détecté via Discord
					</div>
				</div>
			</div>

			<div style={dsec}>
				<div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.3rem' }}>Identité</div>
				<div className="tutorial-dummy-grid" style={dgrid}>
					<div><span style={dls}>Prénom *</span><input style={dinp} value="Jean" readOnly /></div>
					<div><span style={dls}>Nom *</span><input style={dinp} value="Dupont" readOnly /></div>
				</div>
				<div className="tutorial-dummy-grid" style={dgrid}>
					<div><span style={dls}>Date de naissance</span><input style={dinp} value="1992-03-15" readOnly /></div>
					<div><span style={dls}>Lieu d'origine</span><input style={dinp} value="Lyon, France" readOnly /></div>
				</div>
				<div className="tutorial-dummy-grid" style={dgrid}>
					<div><span style={dls}>Taille (cm)</span><input style={dinp} value="182" readOnly /></div>
					<div><span style={dls}>Poids (kg)</span><input style={dinp} value="78" readOnly /></div>
				</div>
			</div>

			<div style={dsec}>
				<div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.3rem' }}>Parcours</div>
				<span style={dls}>Parcours civil</span>
				<textarea style={{ ...dinp, height: 32, resize: 'none' }} value="Ancien mécanicien..." readOnly />
				<span style={dls}>Parcours militaire</span>
				<textarea style={{ ...dinp, height: 32, resize: 'none' }} value="3 ans dans l'infanterie..." readOnly />
				<span style={dls}>Parcours judiciaire</span>
				<textarea style={{ ...dinp, height: 32, resize: 'none' }} value="Casier vierge" readOnly />
			</div>

			<div style={dsec}>
				<div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.3rem' }}>Spécialisations</div>
				<div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.25rem' }}>
					<input style={{ ...dinp, flex: 1 }} value="Tireur d'élite" readOnly />
					<span style={{ color: 'var(--danger)', padding: '0 0.3rem', border: '1px solid var(--danger)', fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}>×</span>
				</div>
				<div style={{ fontSize: '0.65rem', color: 'var(--muted)', border: '1px dashed var(--border)', padding: '0.2rem 0.5rem', textAlign: 'center' }}>+ Ajouter une spécialisation</div>
			</div>

			<div style={dsec}>
				<div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.3rem' }}>Affectation</div>
				<div className="tutorial-dummy-grid" style={dgrid}>
					<div><span style={dls}>Unité</span><select style={dsel} disabled><option>1ère Compagnie</option></select></div>
					<div><span style={dls}>Unité précédente</span><input style={dinp} value="" readOnly /></div>
				</div>
			</div>

			<div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
				<span className="tutorial-dummy-btn-submit">Créer le dossier</span>
			</div>
		</div>
	);
}

function DummyIntelForm() {
	return (
		<div className="tutorial-dummy-form">
			<div className="tutorial-dummy-title">Aperçu — Nouveau rapport de renseignement</div>
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div><span style={dls}>Titre *</span><input style={dinp} value="Mouvement ennemi secteur Nord" readOnly /></div>
				<div><span style={dls}>Date *</span><input style={dinp} value="2026-03-28" readOnly /></div>
			</div>
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Type</span>
					<select style={dsel} disabled>
						<option>Observation</option>
					</select>
				</div>
				<div>
					<span style={dls}>Classification</span>
					<select style={dsel} disabled>
						<option>Restreint</option>
					</select>
				</div>
			</div>
			<span style={dls}>Description *</span>
			<textarea style={{ ...dinp, height: 40, resize: 'none' }} value="Convoi de 3 véhicules repéré en direction du checkpoint Alpha..." readOnly />
			<span style={dls}>Coordonnées</span>
			<input style={dinp} value="48.8566, 2.3522" readOnly />
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Cible liée</span>
					<select style={dsel} disabled><option>— Sélectionner —</option></select>
				</div>
				<div>
					<span style={dls}>Faction liée</span>
					<select style={dsel} disabled><option>— Sélectionner —</option></select>
				</div>
			</div>
			<div style={dsec}>
				<span style={dls}>Médias</span>
				<div style={{ fontSize: '0.65rem', color: 'var(--muted)', border: '1px dashed var(--border)', padding: '0.3rem 0.5rem', textAlign: 'center' }}>
					📎 Glisser ou cliquer pour ajouter des photos/vidéos
				</div>
			</div>
			<div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
				<span className="tutorial-dummy-btn-submit">Soumettre le rapport</span>
			</div>
		</div>
	);
}

function DummyAdminCharForm() {
	return (
		<div className="tutorial-dummy-form tutorial-dummy-admin">
			<div className="tutorial-dummy-title">Aperçu — Section admin d'une fiche personnage</div>
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Grade (override admin)</span>
					<select style={dsel} disabled><option>Sergent</option></select>
				</div>
				<div>
					<span style={dls}>Statut</span>
					<select style={dsel} disabled>
						<option>En service</option>
					</select>
				</div>
			</div>
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Classification</span>
					<select style={dsel} disabled>
						<option>Restreint</option>
					</select>
				</div>
				<div>
					<span style={dls}>Officier supérieur</span>
					<select style={dsel} disabled><option>Cpt. Martin</option></select>
				</div>
			</div>
			<div className="tutorial-dummy-grid" style={dgrid}>
				<div>
					<span style={dls}>Faction</span>
					<input style={dinp} value="LIF" readOnly />
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', justifyContent: 'flex-end' }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text)' }}>
						<input type="checkbox" checked readOnly /> Grade forcé
					</label>
					<label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text)' }}>
						<input type="checkbox" readOnly /> Cible / Ennemi
					</label>
				</div>
			</div>
			<div style={dsec}>
				<label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text)' }}>
					<input type="checkbox" readOnly /> Fiche PNJ (non lié à Discord)
				</label>
			</div>
			<span style={dls}>Notes État-Major</span>
			<textarea style={{ ...dinp, height: 28, resize: 'none' }} value="Agent fiable, à surveiller..." readOnly />
			<div style={dsec}>
				<label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--danger)' }}>
					<input type="checkbox" readOnly /> Archiver ce dossier
				</label>
			</div>
		</div>
	);
}

function DummyAdminIntelForm() {
	return (
		<div className="tutorial-dummy-form tutorial-dummy-admin">
			<div className="tutorial-dummy-title">Aperçu — Actions admin sur un rapport</div>
			<div style={{ fontSize: '0.72rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
				En tant qu'admin, sur chaque rapport vous pouvez :
			</div>
			<div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
				<span className="tutorial-dummy-status-btn active">À vérifier</span>
				<span className="tutorial-dummy-status-btn">Vérifié ✓</span>
				<span className="tutorial-dummy-status-btn">Fausse info ✗</span>
				<span className="tutorial-dummy-status-btn">Non concluant</span>
			</div>
			<div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
				<span className="tutorial-dummy-action-btn">✏️ Modifier</span>
				<span className="tutorial-dummy-action-btn danger">🗑️ Supprimer</span>
			</div>
			<div style={dsec}>
				<span style={dls}>Filtre par statut (admin)</span>
				<select style={dsel} disabled>
					<option>Tous les statuts</option>
				</select>
			</div>
		</div>
	);
}

function DummyAdminTimelineForm() {
	return (
		<div className="tutorial-dummy-form tutorial-dummy-admin">
			<div className="tutorial-dummy-title">Aperçu — Gestion de la chronologie</div>
			<div style={{ border: '1px solid var(--border)', padding: '0.4rem', marginBottom: '0.4rem' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div>
						<span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(74,124,35,0.2)', color: 'var(--primary)', marginRight: '0.3rem' }}>PROMOTION</span>
						<span style={{ fontSize: '0.7rem' }}>Passage au grade de Sergent</span>
					</div>
					<span style={{ color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.1rem 0.3rem', fontSize: '0.6rem' }}>✕</span>
				</div>
				<div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>15/03/2026</div>
			</div>
			<div style={{ border: '1px solid var(--border)', padding: '0.4rem', marginBottom: '0.5rem' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div>
						<span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(139,69,19,0.2)', color: '#c9a040', marginRight: '0.3rem' }}>MÉDAILLE</span>
						<span style={{ fontSize: '0.7rem' }}>Croix du mérite</span>
					</div>
					<span style={{ color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.1rem 0.3rem', fontSize: '0.6rem' }}>✕</span>
				</div>
				<div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>10/02/2026</div>
			</div>
			<div style={dsec}>
				<div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginBottom: '0.3rem', fontWeight: 700 }}>Nouvel événement</div>
				<div className="tutorial-dummy-grid" style={dgrid}>
					<div>
						<span style={dls}>Type</span>
						<select style={dsel} disabled>
							<option>Promotion</option>
						</select>
					</div>
					<div>
						<span style={dls}>Date *</span>
						<input style={dinp} value="2026-03-30" readOnly />
					</div>
				</div>
				<span style={dls}>Titre *</span>
				<input style={dinp} value="Promotion Caporal-Chef" readOnly />
				<span style={dls}>Classification</span>
				<select style={dsel} disabled><option>Public</option></select>
				<div style={{ marginTop: '0.4rem', textAlign: 'center' }}>
					<span className="tutorial-dummy-btn-submit">Ajouter</span>
				</div>
			</div>
		</div>
	);
}

const DUMMY_FORMS: Record<string, () => React.ReactNode> = {
	'character': DummyCharacterForm,
	'intel': DummyIntelForm,
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
			"Cliquez sur « Nouveau Personnage » dans la barre de session. Voici les champs à remplir :",
		position: 'center',
		dummyForm: 'character',
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
			"Cliquez sur « Nouveau rapport » pour créer un renseignement. Voici le formulaire :",
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
			"Vous êtes prêt. Explorez les dossiers, créez votre personnage et contribuez aux renseignements. Relancez ce tutoriel via le bouton en bas à gauche.",
		position: 'center',
	},
];

const ADMIN_STEPS: TutorialStep[] = [
	{
		id: 'admin-welcome',
		target: null,
		title: 'BRIEFING ADMINISTRATEUR',
		content:
			"Ce briefing couvre les fonctionnalités réservées aux administrateurs.",
		position: 'center',
		adminOnly: true,
	},
	{
		id: 'admin-panel',
		target: '[data-tutorial="admin-panel"]',
		title: 'PANNEAU D\'ADMINISTRATION',
		content:
			"Créez et gérez les Unités (nom, slug, couleur, insigne) et Factions (type, couleur, logo).",
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
			"Sur chaque fiche, vous avez accès à une section admin avec ces contrôles :",
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
		content:
			"Actions disponibles sur les rapports de renseignement en mode admin :",
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

export function RoleplayTutorial({ isAdmin, adminPermissions }: { isAdmin?: boolean; adminPermissions?: { roleName: string; level: string } | null }) {
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

	const isMobile = useCallback(() => window.innerWidth <= 768, []);

	const positionTooltip = useCallback((step: TutorialStep) => {
		// On mobile/small screens: always center, no spotlight
		if (isMobile() || !step.target || step.position === 'center') {
			setSpotlightRect(null);
			setTooltipStyle({ position: 'fixed' });
			animatingRef.current = false;
			return;
		}

		const el = document.querySelector(step.target);
		if (!el) {
			setSpotlightRect(null);
			setTooltipStyle({ position: 'fixed' });
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
	}, [isMobile]);

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

					<div className={`tutorial-tooltip${step.dummyForm ? ' has-dummy-form' : ''} tutorial-tooltip-mobile-center`} style={tooltipStyle}>
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

						{step.dummyForm && DUMMY_FORMS[step.dummyForm] && (
							<div className="tutorial-dummy-wrapper">
								{DUMMY_FORMS[step.dummyForm]()}
							</div>
						)}

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
