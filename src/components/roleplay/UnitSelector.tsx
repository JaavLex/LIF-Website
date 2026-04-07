import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Lock } from 'lucide-react';

interface SelectorTrait {
	id?: string;
	label: string;
}

interface Unit {
	id: number;
	name: string;
	slug: string;
	color?: string | null;
	insignia?: { url?: string | null } | null;
	parentFaction?: { name?: string | null } | number | null;
	isMain?: boolean;
	selectorTagline?: string | null;
	selectorPitch?: string | null;
	selectorTraits?: SelectorTrait[] | null;
	description?: any;
}

const FALLBACK = {
	tagline: 'Unité opérationnelle',
	pitch:
		"Affectation au sein de la Légion. Vous porterez les couleurs de cette unité durant l'intégralité de votre service actif.",
	traits: ['Service actif'],
};

function readUnitLore(unit: Unit) {
	const traits =
		(unit.selectorTraits || [])
			.map(t => (t?.label || '').trim())
			.filter(Boolean);
	return {
		tagline: (unit.selectorTagline || '').trim() || FALLBACK.tagline,
		pitch: (unit.selectorPitch || '').trim() || FALLBACK.pitch,
		traits: traits.length ? traits : FALLBACK.traits,
	};
}

interface UnitSelectorConfig {
	eyebrow?: string | null;
	titleLine1?: string | null;
	titleLine2?: string | null;
	titleLine3?: string | null;
	brief?: string | null;
	warning?: string | null;
	footer?: string | null;
	railLabel?: string | null;
}

export function UnitSelector({
	units,
	mainFactionName,
	config,
}: {
	units: Unit[];
	mainFactionName?: string | null;
	config?: UnitSelectorConfig;
}) {
	// Order: alphabetical (admin sets which units exist via Payload)
	const sorted = [...units].sort((a, b) => a.name.localeCompare(b.name));

	const factionName = mainFactionName || 'Légion';
	const cfg = {
		eyebrow: config?.eyebrow || "SECTION 01 — CHOIX D'UNITÉ",
		titleLine1: config?.titleLine1 || 'CHOISISSEZ',
		titleLine2: config?.titleLine2 || 'VOTRE',
		titleLine3: config?.titleLine3 || 'ALLÉGEANCE.',
		// Substitute « Légion » with the actual main faction name in the brief
		brief: (
			config?.brief ||
			"Toute mobilisation au sein de la Légion commence par une affectation. Le choix que vous ferez ici ne pourra plus être modifié par vous-même : seul le commandement peut réaffecter un opérateur entre unités."
		).replace(/\bLégion\b/g, factionName),
		warning: config?.warning || 'DÉCISION DÉFINITIVE — LISEZ AVANT DE SIGNER',
		footer: config?.footer || 'SIGNÉ // COMMANDEMENT',
		railLabel: config?.railLabel || 'DOSSIER ENRÔLEMENT',
	};

	return (
		<div className="enrol-shell">
			<div className="enrol-grid-bg" aria-hidden />
			<div className="enrol-vignette" aria-hidden />

			{/* Vertical rotated label running down the left margin */}
			<div className="enrol-rail" aria-hidden>
				<span>{cfg.railLabel} // {mainFactionName || 'LIF'} // 2026</span>
			</div>

			{/* Asymmetric header: giant 01 number left, briefing copy right */}
			<header className="enrol-header">
				<div className="enrol-step">
					<span className="enrol-step-num">01</span>
					<span className="enrol-step-of">/ 02</span>
				</div>

				<div className="enrol-brief">
					<div className="enrol-brief-tag">
						<span className="enrol-brief-dot" />
						{cfg.eyebrow}
					</div>
					<h1 className="enrol-brief-title">
						<span className="enrol-brief-line-1">{cfg.titleLine1}</span>
						<span className="enrol-brief-line-2">{cfg.titleLine2}</span>
						<span className="enrol-brief-line-3">{cfg.titleLine3}</span>
					</h1>
					<p className="enrol-brief-body">{cfg.brief}</p>
					<div className="enrol-brief-warn">
						<Lock size={14} strokeWidth={2.5} />
						<span>{cfg.warning}</span>
					</div>
				</div>
			</header>

			{/* Unit cards */}
			<div className="enrol-deck">
				{sorted.map((unit, i) => {
					const lore = readUnitLore(unit);
					const color = unit.color || '#4a7c23';
					const factionName =
						typeof unit.parentFaction === 'object' && unit.parentFaction
							? unit.parentFaction.name
							: null;

					return (
						<Link
							key={unit.id}
							href={`/roleplay/personnage/nouveau?unit=${encodeURIComponent(unit.slug)}`}
							className="enrol-card"
							style={
								{
									['--unit-color' as any]: color,
									animationDelay: `${0.15 + i * 0.08}s`,
								} as React.CSSProperties
							}
						>
							{/* Index number stamp */}
							<div className="enrol-card-index" aria-hidden>
								<span>0{i + 1}</span>
							</div>

							{/* Insignia with halo */}
							<div className="enrol-card-insignia-wrap">
								<div className="enrol-card-insignia-halo" aria-hidden />
								<div className="enrol-card-insignia">
									{unit.insignia?.url ? (
										<Image
											src={unit.insignia.url}
											alt={unit.name}
											width={170}
											height={170}
										/>
									) : (
										<span className="enrol-card-insignia-fallback">
											{unit.name.charAt(0)}
										</span>
									)}
								</div>
							</div>

							{/* Unit name watermark behind */}
							<div className="enrol-card-watermark" aria-hidden>
								{unit.name}
							</div>

							{/* Body */}
							<div className="enrol-card-body">
								<div className="enrol-card-eyebrow">
									{factionName || mainFactionName || 'LÉGION'}
									<span className="enrol-card-eyebrow-sep">·</span>
									UNITÉ OPÉRATIONNELLE
								</div>

								<h2 className="enrol-card-name">{unit.name}</h2>

								<div className="enrol-card-rule" aria-hidden />

								<div className="enrol-card-tagline">{lore.tagline}</div>

								<p className="enrol-card-pitch">{lore.pitch}</p>

								<ul className="enrol-card-traits">
									{lore.traits.map(t => (
										<li key={t}>
											<span className="enrol-card-trait-tick" aria-hidden>
												▸
											</span>
											{t}
										</li>
									))}
								</ul>
							</div>

							{/* CTA strip — fills with color on hover */}
							<div className="enrol-card-cta">
								<div className="enrol-card-cta-fill" aria-hidden />
								<span className="enrol-card-cta-label">
									S&apos;ENGAGER DANS {unit.name.toUpperCase()}
								</span>
								<ArrowUpRight
									size={20}
									strokeWidth={2.4}
									className="enrol-card-cta-icon"
								/>
							</div>
						</Link>
					);
				})}
			</div>

			{sorted.length === 0 && (
				<div className="enrol-empty">
					Aucune unité principale n&apos;a été configurée.
					<br />
					Demandez à un administrateur de marquer une unité comme «&nbsp;principale&nbsp;»
					dans le panneau Payload.
				</div>
			)}

			{/* Footer signature */}
			<footer className="enrol-foot">
				<span>{cfg.footer} {mainFactionName || 'LIF'}</span>
				<span className="enrol-foot-sep" aria-hidden />
				<span>FORMULAIRE F-01 // ENRÔLEMENT // 2026.04</span>
			</footer>
		</div>
	);
}
