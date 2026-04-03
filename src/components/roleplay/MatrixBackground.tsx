'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AmbientCharacter {
	id: number;
	firstName: string;
	lastName: string;
	militaryId: string | null;
	status: string;
	faction: string;
	isTarget: boolean;
	targetFaction: string | null;
	threatLevel: string | null;
	rank: string | null;
	avatar: string | null;
}

interface AmbientIntel {
	id: number;
	title: string;
	type: string;
	date: string;
	coordinates: string | null;
	status: string;
	classification: string;
	linkedTarget: {
		firstName: string;
		lastName: string;
		avatar: string | null;
	} | null;
	media: { url: string | null; caption: string | null }[];
}

interface Dossier {
	x: number;
	y: number;
	birth: number;
	lifespan: number;
	maxAlpha: number;
	type: 'character' | 'intel' | 'contract' | 'comms';
	data: AmbientCharacter | AmbientIntel | string[];
	image: HTMLImageElement | null;
	imageLoaded: boolean;
	width: number;
	height: number;
}

interface TextLine {
	x: number;
	y: number;
	text: string;
	birth: number;
	lifespan: number;
	maxAlpha: number;
	color: { r: number; g: number; b: number };
}

const STATUS_FR: Record<string, string> = {
	'in-service': 'EN SERVICE',
	kia: 'MORT AU COMBAT',
	mia: 'DISPARU',
	retired: 'RETRAITÉ',
	'honourable-discharge': 'LIBÉRÉ (HONORABLE)',
	'dishonourable-discharge': 'LIBÉRÉ (DÉSHONORANT)',
	executed: 'EXÉCUTÉ',
};

const THREAT_FR: Record<string, string> = {
	low: 'FAIBLE',
	moderate: 'MODÉRÉ',
	high: 'ÉLEVÉ',
	critical: 'CRITIQUE',
};

const INTEL_TYPE_FR: Record<string, string> = {
	observation: 'OBSERVATION',
	interception: 'INTERCEPTION',
	reconnaissance: 'RECONNAISSANCE',
	infiltration: 'INFILTRATION',
	sigint: 'SIGINT',
	humint: 'HUMINT',
	other: 'AUTRE',
};

const COMMS_LINES = [
	[
		'[COMMS] Canal sécurisé établi',
		'Fréq. 148.250 MHz — ENC AES-256',
		'LINK 16 OPÉRATIONNEL',
		'QRF EN ATTENTE',
	],
	[
		'[CONTRAT] Paiement confirmé',
		'Client: [EXPURGÉ]',
		'Montant: ███████ USD',
		'Opération en cours...',
	],
	[
		'[FINANCES] Virement reçu',
		'Origine: Compte offshore',
		'Dest: Ops Fund Alpha',
		'Statut: VALIDÉ ✓',
	],
	[
		'[ALERTE] Activité détectée',
		'Secteur: Grid 12S PA 456',
		'Type: Mouvement véhicule',
		'Action: Surveillance',
	],
	[
		'[CONTRAT] Nouvelle mission',
		'Priorité: HAUTE',
		'Détails: Briefing 0600Z',
		'ROE: ALPHA',
	],
	[
		'[SITREP] Rapport terrain',
		'Zone: AO SERPENT',
		'Effectifs: 2 équipes déployées',
		'Contact: NÉGATIF',
	],
	[
		'[LOGISTIQUE] Livraison confirmée',
		'Cargaison: Matériel spécialisé',
		'Point de livraison: LZ BRAVO',
		'ETA: 0430Z',
	],
	[
		'[RENSEIGNEMENT] Source fiable',
		'Info: Position HVT confirmée',
		'Validité: 24h',
		'Action recommandée: RAPIDE',
	],
];

// Plain text fragments for the main ambient effect
const STATIC_TEXTS = [
	'FREQ 148.250 MHz',
	'ENC AES-256',
	'LINK 16 UP',
	'SAT COM III',
	'QRF EN ATTENTE',
	'ROE ALPHA',
	'UTC+01:00',
	'DEFCON 3',
	'COMMS CHECK OK',
	'SIGINT ACTIF',
	'NET STATUS ✓',
	'STANDBY',
	"48°51'N 2°21'E",
	"43°17'N 5°22'E",
	'GRID 12S PA 456 789',
	'ALT 320M',
	'BRG 047°',
	'RNG 1.2KM',
	'AO SERPENT',
	'OPORD 2026-04',
	'SITREP EN ATTENTE',
	'RTLS 0.87',
	'CONTRAT #4471',
	'PAIEMENT VALIDÉ',
	'FONDS OPS: ██████',
	'LIVRAISON CONFIRMÉE',
	'ETA 0430Z',
	'LZ BRAVO SÉCURISÉ',
	'PRIORITÉ: HAUTE',
	'CANAL SÉCURISÉ',
	'CRYPTO ACTIF',
];

export default function MatrixBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [ambientData, setAmbientData] = useState<{
		characters: AmbientCharacter[];
		intel: AmbientIntel[];
	}>({ characters: [], intel: [] });

	useEffect(() => {
		fetch('/api/roleplay/ambient')
			.then(r => r.json())
			.then(data => setAmbientData(data))
			.catch(() => {});
	}, []);

	// Generate dynamic text lines from real data
	const generateTextFromData = useCallback((): {
		text: string;
		color: { r: number; g: number; b: number };
	} => {
		const chars = ambientData.characters;
		const intels = ambientData.intel;
		const roll = Math.random();

		// 40% chance to use real character data
		if (roll < 0.4 && chars.length > 0) {
			const c = chars[Math.floor(Math.random() * chars.length)];
			const variants = [
				{
					text: `${c.militaryId || 'N/A'} — ${c.lastName?.toUpperCase()} ${c.firstName}`,
					color: { r: 0, g: 255, b: 65 },
				},
				{
					text: `STATUT: ${STATUS_FR[c.status] || c.status?.toUpperCase()} [${c.faction || '?'}]`,
					color: { r: 0, g: 255, b: 65 },
				},
				{
					text: `${c.rank || 'N/A'} ${c.lastName?.toUpperCase()} — ${c.faction || 'INCONNU'}`,
					color: { r: 0, g: 255, b: 65 },
				},
			];
			if (c.isTarget) {
				variants.push(
					{
						text: `◆ CIBLE: ${c.lastName?.toUpperCase()} — MENACE ${THREAT_FR[c.threatLevel || ''] || '?'}`,
						color: { r: 255, g: 80, b: 50 },
					},
					{
						text: `TGT ${c.lastName?.toUpperCase()} / ${c.targetFaction?.toUpperCase() || '?'} — ACQ`,
						color: { r: 255, g: 80, b: 50 },
					},
				);
			}
			return variants[Math.floor(Math.random() * variants.length)];
		}

		// 20% chance to use real intel data
		if (roll < 0.6 && intels.length > 0) {
			const intel = intels[Math.floor(Math.random() * intels.length)];
			const variants = [
				{
					text: `RENS: ${intel.title?.toUpperCase().slice(0, 35)}`,
					color: { r: 100, g: 180, b: 255 },
				},
				{
					text: `${INTEL_TYPE_FR[intel.type] || intel.type?.toUpperCase()} — ${intel.coordinates || 'COORD N/A'}`,
					color: { r: 100, g: 180, b: 255 },
				},
			];
			if (intel.classification === 'classified') {
				variants.push({
					text: `[CLASSIFIÉ] ${intel.title?.toUpperCase().slice(0, 28)}`,
					color: { r: 255, g: 50, b: 30 },
				});
			}
			return variants[Math.floor(Math.random() * variants.length)];
		}

		// 40% static text
		return {
			text: STATIC_TEXTS[Math.floor(Math.random() * STATIC_TEXTS.length)],
			color: { r: 0, g: 255, b: 65 },
		};
	}, [ambientData]);

	const drawDossier = useCallback(
		(ctx: CanvasRenderingContext2D, d: Dossier, alpha: number) => {
			const x = d.x;
			const y = d.y;
			const w = d.width;
			const h = d.height;

			// Background panel
			ctx.fillStyle = `rgba(5, 12, 5, ${alpha * 0.85})`;
			ctx.fillRect(x, y, w, h);

			// Border
			ctx.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.3})`;
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, w, h);

			// Corner accents
			const cornerLen = 8;
			ctx.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.5})`;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x, y + cornerLen);
			ctx.lineTo(x, y);
			ctx.lineTo(x + cornerLen, y);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x + w - cornerLen, y);
			ctx.lineTo(x + w, y);
			ctx.lineTo(x + w, y + cornerLen);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x, y + h - cornerLen);
			ctx.lineTo(x, y + h);
			ctx.lineTo(x + cornerLen, y + h);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x + w - cornerLen, y + h);
			ctx.lineTo(x + w, y + h);
			ctx.lineTo(x + w, y + h - cornerLen);
			ctx.stroke();

			ctx.lineWidth = 1;
			const pad = 10;
			let cy = y + pad + 10;

			if (d.type === 'character') {
				const c = d.data as AmbientCharacter;
				const isTarget = c.isTarget;

				// Header bar
				ctx.fillStyle = isTarget
					? `rgba(255, 50, 30, ${alpha * 0.25})`
					: `rgba(0, 255, 65, ${alpha * 0.1})`;
				ctx.fillRect(x + 1, y + 1, w - 2, 22);

				ctx.font = 'bold 10px "Courier New", monospace';
				ctx.fillStyle = isTarget
					? `rgba(255, 80, 50, ${alpha})`
					: `rgba(0, 255, 65, ${alpha * 0.8})`;
				ctx.fillText(
					isTarget ? '◆ CIBLE / TARGET ◆' : '■ DOSSIER PERSONNEL',
					x + pad,
					y + 15,
				);

				cy = y + 30;

				const infoX = d.image && d.imageLoaded ? x + pad + 55 : x + pad;

				if (d.image && d.imageLoaded) {
					ctx.save();
					ctx.globalAlpha = alpha * 0.7;
					ctx.drawImage(d.image, x + pad, cy, 48, 56);
					ctx.restore();
					ctx.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.2})`;
					ctx.strokeRect(x + pad, cy, 48, 56);
				}

				ctx.font = 'bold 11px "Courier New", monospace';
				ctx.fillStyle = `rgba(0, 255, 65, ${alpha * 0.85})`;
				ctx.fillText(`${c.lastName?.toUpperCase()}`, infoX, cy + 12);
				ctx.font = '10px "Courier New", monospace';
				ctx.fillText(`${c.firstName}`, infoX, cy + 24);

				ctx.fillStyle = `rgba(0, 255, 65, ${alpha * 0.5})`;
				ctx.font = '9px "Courier New", monospace';
				if (c.rank) ctx.fillText(c.rank, infoX, cy + 38);
				if (c.militaryId) ctx.fillText(c.militaryId, infoX, cy + 50);

				cy += 64;

				ctx.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.15})`;
				ctx.beginPath();
				ctx.moveTo(x + pad, cy);
				ctx.lineTo(x + w - pad, cy);
				ctx.stroke();
				cy += 10;

				ctx.font = '9px "Courier New", monospace';
				ctx.fillStyle = `rgba(0, 255, 65, ${alpha * 0.4})`;
				ctx.fillText(
					`STATUT: ${STATUS_FR[c.status] || c.status?.toUpperCase()}`,
					x + pad,
					cy,
				);
				cy += 14;

				if (c.faction) {
					ctx.fillText(`FACTION: ${c.faction.toUpperCase()}`, x + pad, cy);
					cy += 14;
				}

				if (isTarget) {
					if (c.targetFaction) {
						ctx.fillStyle = `rgba(255, 80, 50, ${alpha * 0.5})`;
						ctx.fillText(
							`AFFILIATION: ${c.targetFaction.toUpperCase()}`,
							x + pad,
							cy,
						);
						cy += 14;
					}
					if (c.threatLevel) {
						const threat = THREAT_FR[c.threatLevel] || c.threatLevel.toUpperCase();
						ctx.fillStyle =
							c.threatLevel === 'critical'
								? `rgba(255, 30, 30, ${alpha * 0.7})`
								: `rgba(255, 120, 30, ${alpha * 0.6})`;
						ctx.fillText(`MENACE: ${threat}`, x + pad, cy);
					}
					if (d.image && d.imageLoaded) {
						const cx2 = x + pad + 24;
						const cy2 = y + 30 + 28;
						ctx.strokeStyle = `rgba(255, 50, 30, ${alpha * 0.35})`;
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.moveTo(cx2 - 15, cy2);
						ctx.lineTo(cx2 + 15, cy2);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(cx2, cy2 - 15);
						ctx.lineTo(cx2, cy2 + 15);
						ctx.stroke();
						ctx.beginPath();
						ctx.arc(cx2, cy2, 12, 0, Math.PI * 2);
						ctx.stroke();
					}
				}
			} else if (d.type === 'intel') {
				const intel = d.data as AmbientIntel;

				ctx.fillStyle = `rgba(50, 150, 255, ${alpha * 0.15})`;
				ctx.fillRect(x + 1, y + 1, w - 2, 22);

				ctx.font = 'bold 10px "Courier New", monospace';
				ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.8})`;
				ctx.fillText('◈ RAPPORT RENSEIGNEMENT', x + pad, y + 15);

				cy = y + 30;

				if (intel.classification === 'classified') {
					ctx.fillStyle = `rgba(255, 50, 30, ${alpha * 0.5})`;
					ctx.font = 'bold 11px "Courier New", monospace';
					ctx.fillText('[ CLASSIFIÉ ]', x + pad, cy);
					cy += 16;
				} else if (intel.classification === 'restricted') {
					ctx.fillStyle = `rgba(255, 180, 30, ${alpha * 0.5})`;
					ctx.font = 'bold 10px "Courier New", monospace';
					ctx.fillText('[ RESTREINT ]', x + pad, cy);
					cy += 16;
				}

				ctx.font = 'bold 10px "Courier New", monospace';
				ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.7})`;
				const title =
					intel.title?.length > 28 ? intel.title.slice(0, 25) + '...' : intel.title;
				ctx.fillText(title?.toUpperCase() || '', x + pad, cy);
				cy += 14;

				ctx.font = '9px "Courier New", monospace';
				ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.4})`;
				ctx.fillText(
					`TYPE: ${INTEL_TYPE_FR[intel.type] || intel.type?.toUpperCase()}`,
					x + pad,
					cy,
				);
				cy += 12;

				if (intel.date) {
					ctx.fillText(
						`DATE: ${new Date(intel.date).toLocaleDateString('fr-FR')}`,
						x + pad,
						cy,
					);
					cy += 12;
				}
				if (intel.coordinates) {
					ctx.fillText(`COORD: ${intel.coordinates}`, x + pad, cy);
					cy += 12;
				}

				ctx.strokeStyle = `rgba(100, 180, 255, ${alpha * 0.15})`;
				ctx.beginPath();
				ctx.moveTo(x + pad, cy);
				ctx.lineTo(x + w - pad, cy);
				ctx.stroke();
				cy += 10;

				if (intel.linkedTarget) {
					ctx.fillStyle = `rgba(255, 80, 50, ${alpha * 0.5})`;
					ctx.font = '9px "Courier New", monospace';
					ctx.fillText(
						`CIBLE: ${intel.linkedTarget.lastName?.toUpperCase()} ${intel.linkedTarget.firstName}`,
						x + pad,
						cy,
					);
					cy += 14;

					if (d.image && d.imageLoaded) {
						ctx.save();
						ctx.globalAlpha = alpha * 0.6;
						ctx.drawImage(d.image, x + pad, cy, 40, 48);
						ctx.restore();
						ctx.strokeStyle = `rgba(255, 50, 30, ${alpha * 0.3})`;
						ctx.strokeRect(x + pad, cy, 40, 48);
						const cx2 = x + pad + 20;
						const cy2 = cy + 24;
						ctx.strokeStyle = `rgba(255, 50, 30, ${alpha * 0.3})`;
						ctx.beginPath();
						ctx.moveTo(cx2 - 12, cy2);
						ctx.lineTo(cx2 + 12, cy2);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(cx2, cy2 - 12);
						ctx.lineTo(cx2, cy2 + 12);
						ctx.stroke();
					}
				}
			} else if (d.type === 'comms') {
				const lines = d.data as string[];
				const isContract =
					lines[0]?.includes('CONTRAT') ||
					lines[0]?.includes('FINANCES') ||
					lines[0]?.includes('LOGISTIQUE');
				const isAlert = lines[0]?.includes('ALERTE');

				const color = isAlert
					? { r: 255, g: 80, b: 30 }
					: isContract
						? { r: 255, g: 200, b: 50 }
						: { r: 0, g: 255, b: 65 };

				ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.1})`;
				ctx.fillRect(x + 1, y + 1, w - 2, 22);

				ctx.font = 'bold 10px "Courier New", monospace';
				ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.8})`;
				ctx.fillText(lines[0] || '', x + pad, y + 15);

				cy = y + 32;
				ctx.font = '9px "Courier New", monospace';
				for (let li = 1; li < lines.length; li++) {
					ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.45})`;
					ctx.fillText(lines[li], x + pad, cy);
					cy += 13;
				}
			}
		},
		[],
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let animationId: number;
		let t = 0;
		let scanY = 0;
		const dossiers: Dossier[] = [];
		const textLines: TextLine[] = [];
		let lastDossierSpawn = 0;
		let lastTextSpawn = 0;

		function resize() {
			canvas!.width = window.innerWidth;
			canvas!.height = window.innerHeight;
		}

		function spawnDossier() {
			const w = canvas!.width;
			const h = canvas!.height;
			const chars = ambientData.characters;
			const intels = ambientData.intel;
			const hasData = chars.length > 0 || intels.length > 0;

			const roll = Math.random();
			let type: Dossier['type'];
			if (roll < 0.3 && chars.length > 0) type = 'character';
			else if (roll < 0.5 && intels.length > 0) type = 'intel';
			else type = 'comms';

			if (!hasData) type = 'comms';

			let data: AmbientCharacter | AmbientIntel | string[];
			let image: HTMLImageElement | null = null;
			let dw = 180;
			let dh = 160;

			if (type === 'character') {
				const c = chars[Math.floor(Math.random() * chars.length)];
				data = c;
				dw = c.isTarget ? 200 : 180;
				dh = c.isTarget ? 195 : 175;
				if (c.avatar) {
					image = new Image();
					image.crossOrigin = 'anonymous';
					image.src = c.avatar;
				}
			} else if (type === 'intel') {
				const intel = intels[Math.floor(Math.random() * intels.length)];
				data = intel;
				dw = 210;
				dh = intel.linkedTarget ? 210 : 160;
				if (intel.linkedTarget?.avatar) {
					image = new Image();
					image.crossOrigin = 'anonymous';
					image.src = intel.linkedTarget.avatar;
				} else if (intel.media?.[0]?.url) {
					image = new Image();
					image.crossOrigin = 'anonymous';
					image.src = intel.media[0].url;
				}
			} else {
				data = COMMS_LINES[Math.floor(Math.random() * COMMS_LINES.length)];
				dw = 210;
				dh = 90;
			}

			// Place only on left or right edges, never center
			const side = Math.random() < 0.5 ? 'left' : 'right';
			const xPos =
				side === 'left' ? 10 + Math.random() * 60 : w - dw - 10 - Math.random() * 60;

			const d: Dossier = {
				x: xPos,
				y: 120 + Math.random() * (h - dh - 200),
				birth: t,
				lifespan: 600 + Math.random() * 500,
				maxAlpha: 0.2 + Math.random() * 0.12,
				type,
				data,
				image,
				imageLoaded: false,
				width: dw,
				height: dh,
			};

			if (image) {
				image.onload = () => {
					d.imageLoaded = true;
				};
			}

			dossiers.push(d);
		}

		function spawnTextLine() {
			const w = canvas!.width;
			const h = canvas!.height;
			const { text, color } = generateTextFromData();

			textLines.push({
				x: 30 + Math.random() * (w - 200),
				y: 100 + Math.random() * (h - 160),
				text,
				birth: t,
				lifespan: 200 + Math.random() * 300,
				maxAlpha: 0.06 + Math.random() * 0.06,
				color,
			});
		}

		function draw() {
			const w = canvas!.width;
			const h = canvas!.height;
			t++;

			// Clear
			ctx!.fillStyle = 'rgba(5, 8, 4, 0.12)';
			ctx!.fillRect(0, 0, w, h);

			// === Subtle grid ===
			ctx!.strokeStyle = 'rgba(0, 255, 65, 0.015)';
			ctx!.lineWidth = 0.5;
			for (let gx = 0; gx < w; gx += 80) {
				ctx!.beginPath();
				ctx!.moveTo(gx, 0);
				ctx!.lineTo(gx, h);
				ctx!.stroke();
			}
			for (let gy = 0; gy < h; gy += 80) {
				ctx!.beginPath();
				ctx!.moveTo(0, gy);
				ctx!.lineTo(w, gy);
				ctx!.stroke();
			}

			// === Slow scan line ===
			scanY += 0.25;
			if (scanY > h + 60) scanY = -60;
			const scanGrad = ctx!.createLinearGradient(0, scanY - 30, 0, scanY + 30);
			scanGrad.addColorStop(0, 'rgba(0, 255, 65, 0)');
			scanGrad.addColorStop(0.5, 'rgba(0, 255, 65, 0.025)');
			scanGrad.addColorStop(1, 'rgba(0, 255, 65, 0)');
			ctx!.fillStyle = scanGrad;
			ctx!.fillRect(0, scanY - 30, w, 60);

			// === CRT scan lines ===
			ctx!.fillStyle = 'rgba(0, 0, 0, 0.03)';
			for (let sy = 0; sy < h; sy += 3) {
				ctx!.fillRect(0, sy, w, 1);
			}

			// === Spawn plain text lines (primary effect) ===
			if (t - lastTextSpawn > 50 && textLines.length < 10) {
				spawnTextLine();
				lastTextSpawn = t;
			}

			// === Draw & clean text lines ===
			for (let i = textLines.length - 1; i >= 0; i--) {
				const tl = textLines[i];
				const age = t - tl.birth;
				if (age > tl.lifespan) {
					textLines.splice(i, 1);
					continue;
				}
				const fadeIn = Math.min(age / 60, 1);
				const fadeOut = Math.min((tl.lifespan - age) / 60, 1);
				const alpha = tl.maxAlpha * fadeIn * fadeOut;

				ctx!.font = '10px "Courier New", monospace';
				ctx!.fillStyle = `rgba(${tl.color.r}, ${tl.color.g}, ${tl.color.b}, ${alpha})`;
				ctx!.fillText(tl.text, tl.x, tl.y);
			}

			// === Spawn dossiers (rare — max 2, every ~10 seconds) ===
			if (t - lastDossierSpawn > 600 && dossiers.length < 2) {
				spawnDossier();
				lastDossierSpawn = t;
			}

			// === Draw & clean dossiers ===
			for (let i = dossiers.length - 1; i >= 0; i--) {
				const d = dossiers[i];
				const age = t - d.birth;
				if (age > d.lifespan) {
					dossiers.splice(i, 1);
					continue;
				}
				const fadeIn = Math.min(age / 150, 1);
				const fadeOut = Math.min((d.lifespan - age) / 150, 1);
				const alpha = d.maxAlpha * fadeIn * fadeOut;

				drawDossier(ctx!, d, alpha);
			}

			// === Corner crosshairs ===
			const chSize = 20;
			const chAlpha = 0.04 + Math.sin(t * 0.005) * 0.01;
			ctx!.strokeStyle = `rgba(0, 255, 65, ${chAlpha})`;
			ctx!.lineWidth = 1;
			ctx!.beginPath();
			ctx!.moveTo(20, 20 + chSize);
			ctx!.lineTo(20, 20);
			ctx!.lineTo(20 + chSize, 20);
			ctx!.stroke();
			ctx!.beginPath();
			ctx!.moveTo(w - 20 - chSize, 20);
			ctx!.lineTo(w - 20, 20);
			ctx!.lineTo(w - 20, 20 + chSize);
			ctx!.stroke();
			ctx!.beginPath();
			ctx!.moveTo(20, h - 20 - chSize);
			ctx!.lineTo(20, h - 20);
			ctx!.lineTo(20 + chSize, h - 20);
			ctx!.stroke();
			ctx!.beginPath();
			ctx!.moveTo(w - 20 - chSize, h - 20);
			ctx!.lineTo(w - 20, h - 20);
			ctx!.lineTo(w - 20, h - 20 - chSize);
			ctx!.stroke();

			// === Vignette ===
			const vigGrad = ctx!.createRadialGradient(
				w / 2,
				h / 2,
				h * 0.3,
				w / 2,
				h / 2,
				h * 0.9,
			);
			vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
			vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
			ctx!.fillStyle = vigGrad;
			ctx!.fillRect(0, 0, w, h);

			animationId = requestAnimationFrame(draw);
		}

		resize();
		draw();

		window.addEventListener('resize', resize);
		return () => {
			window.removeEventListener('resize', resize);
			cancelAnimationFrame(animationId);
		};
	}, [ambientData, drawDossier, generateTextFromData]);

	return (
		<canvas
			ref={canvasRef}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				zIndex: 0,
				pointerEvents: 'none',
			}}
		/>
	);
}
