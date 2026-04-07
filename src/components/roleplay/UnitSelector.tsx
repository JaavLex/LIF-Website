import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Shield } from 'lucide-react';

interface Unit {
	id: number;
	name: string;
	slug: string;
	color?: string | null;
	insignia?: { url?: string | null } | null;
	parentFaction?: { name?: string | null } | number | null;
	description?: any;
}

const LORE: Record<string, { tagline: string; pitch: string; traits: string[] }> = {
	cerberus: {
		tagline: "Force d'assaut blindée",
		pitch:
			"Première ligne. Choc, pénétration, supériorité de feu. Là où la brèche doit être ouverte, Cerberus passe en premier — et ne recule pas.",
		traits: ['Combat conventionnel', 'Mécanisé / blindé', 'Opérations frontales'],
	},
	specter: {
		tagline: 'Opérations spéciales clandestines',
		pitch:
			"Discret, chirurgical, létal. Reconnaissance profonde, sabotage, extraction. Specter agit dans l'ombre — et frappe avant que la cible n'ait su qu'elle était observée.",
		traits: ['Forces spéciales', 'Reconnaissance', 'Action directe'],
	},
	spectre: {
		tagline: 'Opérations spéciales clandestines',
		pitch:
			"Discret, chirurgical, létal. Reconnaissance profonde, sabotage, extraction. Spectre agit dans l'ombre — et frappe avant que la cible n'ait su qu'elle était observée.",
		traits: ['Forces spéciales', 'Reconnaissance', 'Action directe'],
	},
};

function getLore(slug: string) {
	const k = (slug || '').toLowerCase();
	return (
		LORE[k] || {
			tagline: 'Unité opérationnelle',
			pitch:
				"Affectation au sein de la Légion. Vous porterez les couleurs de cette unité durant l'ensemble de votre service actif.",
			traits: ['Service actif', 'Spécialités diverses'],
		}
	);
}

export function UnitSelector({ units }: { units: Unit[] }) {
	// Sort: known LIF units first, alpha
	const sorted = [...units].sort((a, b) => a.name.localeCompare(b.name));

	return (
		<div className="unit-selector">
			<div className="unit-selector-noise" aria-hidden />
			<div className="unit-selector-scan" aria-hidden />

			<header className="unit-selector-head">
				<div className="unit-selector-step">
					<span className="unit-selector-step-num">01</span>
					<span className="unit-selector-step-divider" aria-hidden />
					<div className="unit-selector-step-text">
						<span className="unit-selector-step-eyebrow">
							ENRÔLEMENT — ÉTAPE 01 / 02
						</span>
						<h1 className="unit-selector-step-title">CHOIX D&apos;UNITÉ</h1>
					</div>
				</div>
				<p className="unit-selector-warning">
					<Shield size={14} />
					<span>
						Décision <strong>définitive</strong>. Une fois affecté, votre unité ne
						pourra être modifiée que par le commandement.
					</span>
				</p>
			</header>

			<div className="unit-selector-grid">
				{sorted.map(unit => {
					const lore = getLore(unit.slug);
					const color = unit.color || '#4a7c23';
					const factionName =
						typeof unit.parentFaction === 'object' && unit.parentFaction
							? unit.parentFaction.name
							: null;

					return (
						<Link
							key={unit.id}
							href={`/roleplay/personnage/nouveau?unit=${encodeURIComponent(unit.slug)}`}
							className="unit-card-choice"
							style={{ ['--unit-color' as any]: color }}
						>
							<span className="unit-card-choice-corner tl" aria-hidden />
							<span className="unit-card-choice-corner tr" aria-hidden />
							<span className="unit-card-choice-corner bl" aria-hidden />
							<span className="unit-card-choice-corner br" aria-hidden />
							<div className="unit-card-choice-scan" aria-hidden />
							<div
								className="unit-card-choice-watermark"
								aria-hidden
							>
								{unit.name.split(' ')[0]}
							</div>

							<div className="unit-card-choice-insignia">
								{unit.insignia?.url ? (
									<Image
										src={unit.insignia.url}
										alt={unit.name}
										width={140}
										height={140}
									/>
								) : (
									<Shield size={88} strokeWidth={1.2} />
								)}
							</div>

							<div className="unit-card-choice-body">
								<div className="unit-card-choice-eyebrow">
									{factionName || 'LÉGION'} — UNITÉ OPÉRATIONNELLE
								</div>
								<h2 className="unit-card-choice-name">{unit.name}</h2>
								<div className="unit-card-choice-tagline">{lore.tagline}</div>
								<p className="unit-card-choice-pitch">{lore.pitch}</p>

								<ul className="unit-card-choice-traits">
									{lore.traits.map(t => (
										<li key={t}>
											<span className="unit-card-choice-trait-marker" aria-hidden />
											{t}
										</li>
									))}
								</ul>

								<div className="unit-card-choice-cta">
									<span>S&apos;ENGAGER</span>
									<ArrowRight size={18} />
								</div>
							</div>
						</Link>
					);
				})}
			</div>

			{sorted.length === 0 && (
				<div className="unit-selector-empty">
					Aucune unité disponible. Contactez un administrateur.
				</div>
			)}
		</div>
	);
}
