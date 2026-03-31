'use client';

import { useState, useEffect, useRef } from 'react';

const RULES_ACCEPTED_KEY = 'lif-rp-rules-accepted';

// Rules content from rprules.md — password placeholder replaced at render
const RULES_SECTIONS = [
	{
		title: 'ARTICLE 1 — PRINCIPES GÉNÉRAUX',
		content: [
			'1.1 Le roleplay consiste à incarner un personnage fictif dans un univers commun.',
			'1.2 Les actions RP ne doivent jamais être prises personnellement.',
			'1.3 Les joueurs créent leur propre histoire dans un cadre cohérent et réaliste.',
			'1.4 Chaque joueur doit posséder une fiche personnage valide.',
			'1.5 Le fairplay RP est obligatoire.',
		],
	},
	{
		title: 'ARTICLE 2 — OOC / HRP / COMMUNICATION',
		description: 'Fait de communiquer avec les autres joueurs en dehors du contexte RP et de son personnage par exemple pour discuter dans les endroits prévu (zone HRP, chat ou discord) d\'un problème de configuration ou de contenu',
		content: [
			'2.1 Le OOC est autorisé uniquement dans le chat écrit.',
			'2.2 Le OOC vocal est autorisé uniquement dans les zones HRP.',
			'2.3 Toute communication RP vocale doit se faire en jeu.',
			'2.4 L\'utilisation de Discord vocal pour transmettre des informations RP est interdite.',
			'2.5 Les zones HRP sont hors roleplay.',
		],
		sanctions: [
			'Infraction mineure (abus léger OOC) → 1 warn',
			'Répétition → 2 warns (kick automatique)',
			'Discord utilisé pour avantage RP → ban temporaire 24h',
			'Organisation OOC massive → ban temporaire 7 jours',
		],
	},
	{
		title: 'ARTICLE 3 — METAGAMING',
		description: 'Utilisation d\'informations obtenue hors du RP (interdit) seule les informations dont dispose votre personnage sont utilisable le reste n\'a pas d\'existence en RP',
		content: [
			'3.1 Utilisation d\'informations hors RP interdite.',
			'3.2 Informations Discord, stream ou externe interdites en RP.',
		],
		sanctions: [
			'Metagaming léger → 1 warn',
			'Metagaming impactant une scène → 2 warns (kick)',
			'Metagaming volontaire donnant avantage → ban temporaire 3 jours',
			'Metagaming organisé → ban temporaire 7 jours',
		],
	},
	{
		title: 'ARTICLE 4 — POWERGAMING',
		description: 'Fait d\'un joueur d\'utiliser une puissance excessive et irréaliste, Captain America est une légende',
		content: [
			'4.1 Forcer une action sans possibilité RP est interdit.',
			'4.2 Actions irréalistes interdites.',
		],
		sanctions: [
			'Powergaming léger → 1 warn',
			'Powergaming bloquant une scène → 2 warns (kick)',
			'Powergaming volontaire répété → ban temporaire 3 jours',
		],
	},
	{
		title: 'ARTICLE 5 — FEARRP / PAINRP',
		description: 'Fait d\'un joueur de jouer les émotions de son personnage dans les situations de tension et/ou simuler les blessures ceci implique de rester RP même au sol',
		content: [
			'5.1 Réagir de manière réaliste à la peur.',
			'5.2 Réagir de manière réaliste à la douleur.',
		],
		sanctions: [
			'Non respect léger → 1 warn',
			'Ignorer une arme ou blessure grave → 2 warns (kick)',
			'Abus répété → ban temporaire 3 jours',
		],
	},
	{
		title: 'ARTICLE 6 — VALUE OF LIFE',
		description: 'Fait d\'un joueur de préserver la vie de son personnage attaqueriez vous un T72 seul à mains nues dans la vraie vie ? Si oui votre place est à l\'asile',
		content: [
			'6.1 La vie du personnage doit être préservée.',
			'6.2 Actions suicidaires irréalistes interdites.',
		],
		sanctions: [
			'Comportement risqué léger → 1 warn',
			'Rush volontaire → 2 warns (kick)',
			'Abus répété → ban temporaire 3 jours',
		],
	},
	{
		title: 'ARTICLE 7 — FREEKILL',
		description: 'Fait de tuer un autre personnage sans raison RP ceci s\'applique aussi au TK',
		content: [
			'7.1 Tuer sans raison RP est interdit.',
			'7.2 Interaction RP obligatoire avant hostilité.',
		],
		sanctions: [
			'Freekill isolé → 2 warns (kick)',
			'Freekill volontaire → ban temporaire 3 jours',
			'Freekill massif → ban temporaire 7 jours',
			'Freekill troll → ban définitif possible',
		],
	},
	{
		title: 'ARTICLE 8 — NLR',
		description: 'Fait du joueur de recommencer une nouvelle vie avec un nouveau personnage sans souvenir des événements passé hors de la connaissance de son nouveau personnage',
		content: [
			'8.1 Oubli des événements après mort.',
			'8.2 Interdiction retour immédiat.',
		],
		sanctions: [
			'Retour léger zone → 1 warn',
			'Revenir pour se venger → 2 warns (kick)',
			'NLR abusif volontaire → ban temporaire 3 jours',
		],
	},
	{
		title: 'ARTICLE 9 — PERMADEATH',
		description: 'Mort RP la mort d\'un personnage intervient à la suite d\'un processus en trois branches tel que stipulée dans le règlement ceci doit être un événement important de la vie du serveur mais aussi du joueur la mort d\'un personnage entraîne souvent un deuil réel',
		content: [
			'Le permadeath correspond à la mort définitive d\'un personnage. Celui-ci ne pourra plus être joué.',
			'',
			'9.1 Mort volontaire — Le joueur peut décider de faire mourir son personnage. Procédure : Prévenir la modération.',
			'',
			'9.2 Décision staff — Le staff peut imposer un permadeath : pour cohérence narrative, pour éviter le powergaming, suite à une action RP logique menant à la mort.',
			'',
			'9.3 Pétition joueurs — Les joueurs peuvent demander un permadeath. Conditions : minimum 3 joueurs, maximum recommandé 5 joueurs, dossier RP obligatoire. Le dossier doit contenir : identité du personnage concerné, raisons RP, historique RP, proposition de scène. Le dossier est envoyé au staff pour validation.',
			'',
			'9.4 Décision finale — Le staff possède la décision finale. Aucun permadeath ne peut être effectué sans validation.',
		],
	},
	{
		title: 'ARTICLE 10 — COMBAT LOGGING',
		description: 'Deconnection sauvage, Le fait d\'un joueur d\'échapper à un événement RP ou une mort via une soustraction physique ce comportement est assimilé à une tricherie',
		content: [
			'10.1 Quitter pour éviter une scène RP interdit.',
		],
		sanctions: [
			'Déconnexion suspecte → 1 warn',
			'Déconnexion volontaire → 2 warns (kick)',
			'Combat logging confirmé → ban temporaire 3 jours',
			'Répété → ban temporaire 7 jours',
		],
	},
	{
		title: 'ARTICLE 11 — PERSONNAGE',
		content: [
			'11.1 Fiche personnage obligatoire.',
			'11.2 Cohérence obligatoire.',
		],
		sanctions: [
			'Pas de fiche → kick',
			'Refus de créer fiche → ban temporaire 24h',
		],
	},
	{
		title: 'ARTICLE 12 — RÔLES À RESPONSABILITÉS',
		content: [
			'Certains rôles donnent des responsabilités importantes : Brigadier LIF, Formateur, Chef de section, Chef de groupe, Commandement, Tout rôle permettant de promouvoir ou sanctionner. Ces rôles nécessitent une validation staff.',
			'',
			'12.1 Procédure de demande — Le joueur doit envoyer un dossier RP au staff contenant : Nom du personnage, Rôle demandé, Motivation RP, Objectifs RP, Type de personnage, Plan de gestion des joueurs, Impact RP prévu.',
			'',
			'12.2 Validation — Le staff : valide, refuse, ou demande modifications. Aucun rôle à responsabilité ne peut être pris sans validation.',
			'',
			'12.3 Retrait du rôle — Le staff peut retirer le rôle en cas d\'abus de pouvoir, d\'incohérence RP, ou de mauvaise gestion RP.',
		],
	},
	{
		title: 'ARTICLE 13 — PROMOTIONS RP',
		content: [
			'Les promotions doivent rester cohérentes avec le roleplay et respecter la hiérarchie en place.',
			'',
			'13.1 Promotions hiérarchiques — Les promotions se font uniquement par un supérieur RP direct, dans le cadre d\'une progression RP logique, après interaction et évolution du personnage. Les promotions instantanées sans justification RP sont interdites.',
			'',
			'13.2 Paliers à responsabilité — Lorsqu\'une promotion donne un pouvoir de promotion, sanction RP, rôle de commandement ou responsabilité hiérarchique, une validation staff est obligatoire avant application.',
			'',
			'13.3 Procédure de validation — Le supérieur RP doit transmettre au staff : Nom du joueur promu, Rang actuel, Rang demandé, Justification RP, Historique RP du personnage, Responsabilités associées.',
			'',
			'13.4 Promotions abusives — Sont considérées comme abusives : promotions entre amis, promotions sans RP, promotions massives, promotions pour avantage gameplay.',
			'',
			'13.5 Retrait de promotion — Le staff peut retirer une promotion en cas d\'abus de pouvoir, d\'incohérence RP, de non-respect du règlement ou de déséquilibre RP. La rétrogradation peut être appliquée immédiatement.',
		],
	},
	{
		title: 'ARTICLE 14 — CRÉATION D\'UNITÉ',
		hasPassword: true,
		content: [
			'La création d\'une unité RP est autorisée sous validation.',
			'',
			'14.1 Procédure — Le joueur doit envoyer un dossier RP au staff contenant : Nom de l\'unité, Objectif RP, Type d\'unité (combat, logistique, formation, etc.), Structure hiérarchique, Nombre de membres prévu, Impact RP sur le serveur, Relations avec autres unités.',
			'',
			'14.2 Validation — Le staff peut accepter, refuser, ou demander modifications. Aucune unité ne peut être créée sans validation.',
			'',
			'14.3 Limitation — Le staff peut limiter le nombre d\'unités, fusionner des unités, ou supprimer une unité inactive.',
			'',
			'14.4 Dissolution — Une unité peut être dissoute pour manque d\'activité, abus RP, ou déséquilibre serveur.',
		],
	},
	{
		title: 'ARTICLE 15 — CRÉATION DE FACTION',
		content: [
			'15.1 Interdite actuellement.',
		],
	},
	{
		title: 'ARTICLE 16 — SYSTÈME DE WARNS',
		content: [
			'16.1 Durée validité warn : 30 jours.',
			'',
			'16.2 Échelle :',
			'• 1 warn → avertissement',
			'• 2 warns → kick automatique',
			'• 3 warns → ban 24h',
			'• 4 warns → ban 3 jours',
			'• 5 warns → ban 7 jours',
			'• 6 warns → ban 14 jours',
			'• 7 warns → ban définitif',
			'',
			'16.3 Le staff peut adapter selon gravité.',
		],
	},
	{
		title: 'ARTICLE 17 — BAN DIRECT',
		content: [
			'Peut entraîner ban immédiat :',
			'• Cheat',
			'• Harcèlement grave',
			'• Destruction volontaire RP',
			'• Contournement sanction',
			'• Freekill massif troll',
		],
	},
];

export function RulesModal() {
	const [visible, setVisible] = useState(false);
	const [requirePassword, setRequirePassword] = useState(false);
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const accepted = localStorage.getItem(RULES_ACCEPTED_KEY);
		if (!accepted) {
			setVisible(true);
			setRequirePassword(true);
		}
	}, []);

	// Listen for custom event to reopen modal (from tutorial buttons)
	useEffect(() => {
		const handler = () => {
			setRequirePassword(false);
			setPassword('');
			setError('');
			setHasScrolledToBottom(false);
			setVisible(true);
		};
		window.addEventListener('open-rules-modal', handler);
		return () => window.removeEventListener('open-rules-modal', handler);
	}, []);

	useEffect(() => {
		if (visible) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => { document.body.style.overflow = ''; };
	}, [visible]);

	const handleScroll = () => {
		if (!contentRef.current) return;
		const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
		if (scrollTop + clientHeight >= scrollHeight - 30) {
			setHasScrolledToBottom(true);
		}
	};

	const handleAccept = async () => {
		if (!requirePassword) {
			setVisible(false);
			return;
		}

		if (!password.trim()) {
			setError('Veuillez entrer le mot de passe.');
			return;
		}

		setSubmitting(true);
		setError('');

		try {
			const res = await fetch('/api/roleplay/verify-rules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: password.trim() }),
			});

			const data = await res.json();

			if (data.valid) {
				localStorage.setItem(RULES_ACCEPTED_KEY, Date.now().toString());
				setVisible(false);
			} else {
				setError('Mot de passe incorrect. Lisez attentivement le règlement.');
			}
		} catch {
			setError('Erreur de vérification. Réessayez.');
		} finally {
			setSubmitting(false);
		}
	};

	if (!visible) return null;

	return (
		<div className="rules-modal-overlay">
			<div className="rules-modal">
				<div className="rules-modal-header">
					<div className="terminal-header-dots" style={{ marginRight: '0.75rem' }}>
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span style={{ fontWeight: 700, letterSpacing: '0.1em' }}>
						RÈGLEMENT ROLEPLAY — LECTURE OBLIGATOIRE
					</span>
				</div>

				<div
					className="rules-modal-content"
					ref={contentRef}
					onScroll={handleScroll}
				>
					<div className="rules-intro">
						<p>Bienvenue sur le serveur RP de la <strong>Légion Internationale Francophone</strong>.</p>
						<p>Veuillez lire attentivement l&apos;intégralité du règlement ci-dessous avant de continuer.</p>
						{requirePassword && (
							<p className="rules-password-hint">
								⚠ Un mot de passe est caché dans le règlement. Vous devrez le trouver et le saisir pour confirmer votre lecture.
							</p>
						)}
					</div>

					{RULES_SECTIONS.map((section, i) => (
						<div key={i} className="rules-section">
							<h3 className="rules-section-title">{section.title}</h3>
							{section.description && (
								<p className="rules-section-desc">{section.description}</p>
							)}
							<div className="rules-section-content">
								{section.content.map((line, j) => (
									<p key={j} className={line === '' ? 'rules-spacer' : undefined}>
										{section.hasPassword && j === 0 ? (
											<>{line} <span className="rules-hidden-password">&gt;|PASSWORDHERE|&lt;</span></>
										) : (
											line
										)}
									</p>
								))}
							</div>
							{section.sanctions && (
								<div className="rules-sanctions">
									<strong>Sanctions :</strong>
									<ul>
										{section.sanctions.map((s, k) => (
											<li key={k}>{s}</li>
										))}
									</ul>
								</div>
							)}
						</div>
					))}
				</div>

				<div className="rules-modal-footer">
					{requirePassword ? (
						<>
							{error && <div className="rules-error">{error}</div>}
							<div className="rules-password-row">
								<label className="rules-password-label">
									Mot de passe trouvé dans le règlement :
								</label>
								<input
									type="text"
									value={password}
									onChange={e => { setPassword(e.target.value); setError(''); }}
									className="filter-input rules-password-input"
									placeholder="Entrez le mot de passe..."
									disabled={submitting}
									onKeyDown={e => { if (e.key === 'Enter') handleAccept(); }}
								/>
							</div>
							<button
								type="button"
								className="rules-accept-btn"
								onClick={handleAccept}
								disabled={submitting || !hasScrolledToBottom}
								title={!hasScrolledToBottom ? 'Veuillez lire tout le règlement' : ''}
							>
								{submitting ? 'Vérification...' : !hasScrolledToBottom ? 'LISEZ TOUT LE RÈGLEMENT ▼' : 'J\'ACCEPTE LE RÈGLEMENT'}
							</button>
						</>
					) : (
						<button
							type="button"
							className="rules-accept-btn"
							onClick={() => setVisible(false)}
						>
							FERMER
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
