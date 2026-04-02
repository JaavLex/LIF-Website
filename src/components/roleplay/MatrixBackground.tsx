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
	linkedTarget: { firstName: string; lastName: string; avatar: string | null } | null;
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

const STATUS_FR: Record<string, string> = {
	'in-service': 'EN SERVICE',
	'kia': 'MORT AU COMBAT',
	'mia': 'DISPARU',
	'retired': 'RETRAITÉ',
	'honourable-discharge': 'LIBÉRÉ (HONORABLE)',
	'dishonourable-discharge': 'LIBÉRÉ (DÉSHONORANT)',
	'executed': 'EXÉCUTÉ',
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
	['[COMMS] Canal sécurisé établi', 'Fréq. 148.250 MHz — ENC AES-256', 'LINK 16 OPÉRATIONNEL', 'QRF EN ATTENTE'],
	['[CONTRAT] Paiement confirmé', 'Client: [EXPURGÉ]', 'Montant: ███████ USD', 'Opération en cours...'],
	['[FINANCES] Virement reçu', 'Origine: Compte offshore', 'Dest: Ops Fund Alpha', 'Statut: VALIDÉ ✓'],
	['[ALERTE] Activité détectée', 'Secteur: Grid 12S PA 456', 'Type: Mouvement véhicule', 'Action: Surveillance'],
	['[CONTRAT] Nouvelle mission', 'Priorité: HAUTE', 'Détails: Briefing 0600Z', 'ROE: ALPHA'],
	['[SITREP] Rapport terrain', 'Zone: AO SERPENT', 'Effectifs: 2 équipes déployées', 'Contact: NÉGATIF'],
	['[LOGISTIQUE] Livraison confirmée', 'Cargaison: Matériel spécialisé', 'Point de livraison: LZ BRAVO', 'ETA: 0430Z'],
	['[RENSEIGNEMENT] Source fiable', 'Info: Position HVT confirmée', 'Validité: 24h', 'Action recommandée: RAPIDE'],
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

	const drawDossier = useCallback((
		ctx: CanvasRenderingContext2D,
		d: Dossier,
		alpha: number,
	) => {
		const x = d.x;
		const y = d.y;
		const w = d.width;
		const h = d.height;

		// Background panel
		ctx.fillStyle = `rgba(5, 12, 5, ${alpha * 0.85})`;
		ctx.fillRect(x, y, w, h);

		// Border
		ctx.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.4})`;
		ctx.lineWidth = 1;
		ctx.strokeRect(x, y, w, h);

		// Corner accents
		const cornerLen = 8;
		ctx.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.7})`;
		ctx.lineWidth = 2;
		// TL
		ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke();
		// TR
		ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen); ctx.stroke();
		// BL
		ctx.beginPath(); ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h); ctx.stroke();
		// BR
		ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen); ctx.stroke();

		ctx.lineWidth = 1;
		const pad = 10;
		let cy = y + pad + 10;

		if (d.type === 'character') {
			const c = d.data as AmbientCharacter;
			const isTarget = c.isTarget;

			// Header bar
			ctx.fillStyle = isTarget
				? `rgba(255, 50, 30, ${alpha * 0.3})`
				: `rgba(0, 255, 65, ${alpha * 0.15})`;
			ctx.fillRect(x + 1, y + 1, w - 2, 22);

			// Header text
			ctx.font = 'bold 10px "Courier New", monospace';
			ctx.fillStyle = isTarget
				? `rgba(255, 80, 50, ${alpha})`
				: `rgba(0, 255, 65, ${alpha * 0.9})`;
			const headerText = isTarget ? '◆ CIBLE / TARGET ◆' : '■ DOSSIER PERSONNEL';
			ctx.fillText(headerText, x + pad, y + 15);

			cy = y + 30;

			// Avatar + info side by side
			const infoX = d.image && d.imageLoaded ? x + pad + 55 : x + pad;

			if (d.image && d.imageLoaded) {
				// Photo frame
				ctx.save();
				ctx.globalAlpha = alpha * 0.8;
				ctx.drawImage(d.image, x + pad, cy, 48, 56);
				ctx.restore();
				ctx.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.3})`;
				ctx.strokeRect(x + pad, cy, 48, 56);
			}

			// Name
			ctx.font = 'bold 11px "Courier New", monospace';
			ctx.fillStyle = `rgba(0, 255, 65, ${alpha * 0.95})`;
			ctx.fillText(`${c.lastName?.toUpperCase()}`, infoX, cy + 12);
			ctx.font = '10px "Courier New", monospace';
			ctx.fillText(`${c.firstName}`, infoX, cy + 24);

			// Rank & ID
			ctx.fillStyle = `rgba(0, 255, 65, ${alpha * 0.6})`;
			ctx.font = '9px "Courier New", monospace';
			if (c.rank) ctx.fillText(c.rank, infoX, cy + 38);
			if (c.militaryId) ctx.fillText(c.militaryId, infoX, cy + 50);

			cy += 64;

			// Separator
			ctx.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.2})`;
			ctx.beginPath(); ctx.moveTo(x + pad, cy); ctx.lineTo(x + w - pad, cy); ctx.stroke();
			cy += 10;

			// Status
			ctx.font = '9px "Courier New", monospace';
			ctx.fillStyle = `rgba(0, 255, 65, ${alpha * 0.5})`;
			ctx.fillText(`STATUT: ${STATUS_FR[c.status] || c.status?.toUpperCase()}`, x + pad, cy);
			cy += 14;

			// Faction
			if (c.faction) {
				ctx.fillText(`FACTION: ${c.faction.toUpperCase()}`, x + pad, cy);
				cy += 14;
			}

			// Target-specific info
			if (isTarget) {
				if (c.targetFaction) {
					ctx.fillStyle = `rgba(255, 80, 50, ${alpha * 0.7})`;
					ctx.fillText(`AFFILIATION: ${c.targetFaction.toUpperCase()}`, x + pad, cy);
					cy += 14;
				}
				if (c.threatLevel) {
					const threat = THREAT_FR[c.threatLevel] || c.threatLevel.toUpperCase();
					const threatColor = c.threatLevel === 'critical'
						? `rgba(255, 30, 30, ${alpha * 0.9})`
						: c.threatLevel === 'high'
							? `rgba(255, 120, 30, ${alpha * 0.8})`
							: `rgba(255, 200, 50, ${alpha * 0.7})`;
					ctx.fillStyle = threatColor;
					ctx.fillText(`MENACE: ${threat}`, x + pad, cy);
					cy += 14;
				}
				// Crosshair over avatar
				if (d.image && d.imageLoaded) {
					const cx2 = x + pad + 24;
					const cy2 = y + 30 + 28;
					ctx.strokeStyle = `rgba(255, 50, 30, ${alpha * 0.5})`;
					ctx.lineWidth = 1;
					ctx.beginPath(); ctx.moveTo(cx2 - 15, cy2); ctx.lineTo(cx2 + 15, cy2); ctx.stroke();
					ctx.beginPath(); ctx.moveTo(cx2, cy2 - 15); ctx.lineTo(cx2, cy2 + 15); ctx.stroke();
					ctx.beginPath(); ctx.arc(cx2, cy2, 12, 0, Math.PI * 2); ctx.stroke();
					ctx.lineWidth = 1;
				}
			}

		} else if (d.type === 'intel') {
			const intel = d.data as AmbientIntel;

			// Header bar
			ctx.fillStyle = `rgba(50, 150, 255, ${alpha * 0.2})`;
			ctx.fillRect(x + 1, y + 1, w - 2, 22);

			ctx.font = 'bold 10px "Courier New", monospace';
			ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.9})`;
			ctx.fillText('◈ RAPPORT RENSEIGNEMENT', x + pad, y + 15);

			cy = y + 30;

			// Classification stamp
			if (intel.classification === 'classified') {
				ctx.fillStyle = `rgba(255, 50, 30, ${alpha * 0.6})`;
				ctx.font = 'bold 11px "Courier New", monospace';
				ctx.fillText('[ CLASSIFIÉ ]', x + pad, cy);
				cy += 16;
			} else if (intel.classification === 'restricted') {
				ctx.fillStyle = `rgba(255, 180, 30, ${alpha * 0.6})`;
				ctx.font = 'bold 10px "Courier New", monospace';
				ctx.fillText('[ RESTREINT ]', x + pad, cy);
				cy += 16;
			}

			// Title
			ctx.font = 'bold 10px "Courier New", monospace';
			ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.8})`;
			const title = intel.title?.length > 28 ? intel.title.slice(0, 25) + '...' : intel.title;
			ctx.fillText(title?.toUpperCase() || '', x + pad, cy);
			cy += 14;

			// Type & date
			ctx.font = '9px "Courier New", monospace';
			ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.5})`;
			ctx.fillText(`TYPE: ${INTEL_TYPE_FR[intel.type] || intel.type?.toUpperCase()}`, x + pad, cy);
			cy += 12;

			if (intel.date) {
				ctx.fillText(`DATE: ${new Date(intel.date).toLocaleDateString('fr-FR')}`, x + pad, cy);
				cy += 12;
			}

			if (intel.coordinates) {
				ctx.fillText(`COORD: ${intel.coordinates}`, x + pad, cy);
				cy += 12;
			}

			// Separator
			ctx.strokeStyle = `rgba(100, 180, 255, ${alpha * 0.2})`;
			ctx.beginPath(); ctx.moveTo(x + pad, cy); ctx.lineTo(x + w - pad, cy); ctx.stroke();
			cy += 10;

			// Linked target with photo
			if (intel.linkedTarget) {
				ctx.fillStyle = `rgba(255, 80, 50, ${alpha * 0.7})`;
				ctx.font = '9px "Courier New", monospace';
				ctx.fillText(`CIBLE: ${intel.linkedTarget.lastName?.toUpperCase()} ${intel.linkedTarget.firstName}`, x + pad, cy);
				cy += 14;

				// Target photo
				if (d.image && d.imageLoaded) {
					ctx.save();
					ctx.globalAlpha = alpha * 0.7;
					ctx.drawImage(d.image, x + pad, cy, 40, 48);
					ctx.restore();
					ctx.strokeStyle = `rgba(255, 50, 30, ${alpha * 0.4})`;
					ctx.strokeRect(x + pad, cy, 40, 48);
					// Crosshair
					const cx2 = x + pad + 20;
					const cy2 = cy + 24;
					ctx.strokeStyle = `rgba(255, 50, 30, ${alpha * 0.4})`;
					ctx.beginPath(); ctx.moveTo(cx2 - 12, cy2); ctx.lineTo(cx2 + 12, cy2); ctx.stroke();
					ctx.beginPath(); ctx.moveTo(cx2, cy2 - 12); ctx.lineTo(cx2, cy2 + 12); ctx.stroke();
				}
			}

			// Media attached indicator
			if (intel.media?.length > 0) {
				ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.4})`;
				ctx.font = '8px "Courier New", monospace';
				ctx.fillText(`📎 ${intel.media.length} pièce(s) jointe(s)`, x + pad, y + h - pad);
			}

		} else if (d.type === 'comms') {
			const lines = d.data as string[];
			// Comms/contract type
			const isContract = lines[0]?.includes('CONTRAT') || lines[0]?.includes('FINANCES') || lines[0]?.includes('LOGISTIQUE');
			const isAlert = lines[0]?.includes('ALERTE');

			const color = isAlert
				? { r: 255, g: 80, b: 30 }
				: isContract
					? { r: 255, g: 200, b: 50 }
					: { r: 0, g: 255, b: 65 };

			// Header
			ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.15})`;
			ctx.fillRect(x + 1, y + 1, w - 2, 22);

			ctx.font = 'bold 10px "Courier New", monospace';
			ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.9})`;
			ctx.fillText(lines[0] || '', x + pad, y + 15);

			cy = y + 32;
			ctx.font = '9px "Courier New", monospace';
			for (let li = 1; li < lines.length; li++) {
				ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.55})`;
				ctx.fillText(lines[li], x + pad, cy);
				cy += 13;
			}
		}
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let animationId: number;
		let t = 0;
		let scanY = 0;
		const dossiers: Dossier[] = [];
		let lastSpawn = 0;

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

			// Weighted random: 30% character, 20% intel, 50% comms
			const roll = Math.random();
			let type: Dossier['type'];
			if (roll < 0.3 && chars.length > 0) type = 'character';
			else if (roll < 0.5 && intels.length > 0) type = 'intel';
			else type = 'comms';

			// If no data available, always use comms
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

			const margin = 60;
			const d: Dossier = {
				x: margin + Math.random() * (w - dw - margin * 2),
				y: margin + Math.random() * (h - dh - margin * 2),
				birth: t,
				lifespan: 500 + Math.random() * 600,
				maxAlpha: 0.5 + Math.random() * 0.3,
				type,
				data,
				image,
				imageLoaded: false,
				width: dw,
				height: dh,
			};

			if (image) {
				image.onload = () => { d.imageLoaded = true; };
			}

			dossiers.push(d);
		}

		function draw() {
			const w = canvas!.width;
			const h = canvas!.height;
			t++;

			// Clear
			ctx!.fillStyle = 'rgba(5, 8, 4, 0.12)';
			ctx!.fillRect(0, 0, w, h);

			// === Subtle grid ===
			const gridSpacing = 80;
			ctx!.strokeStyle = 'rgba(0, 255, 65, 0.02)';
			ctx!.lineWidth = 0.5;
			for (let gx = 0; gx < w; gx += gridSpacing) {
				ctx!.beginPath(); ctx!.moveTo(gx, 0); ctx!.lineTo(gx, h); ctx!.stroke();
			}
			for (let gy = 0; gy < h; gy += gridSpacing) {
				ctx!.beginPath(); ctx!.moveTo(0, gy); ctx!.lineTo(w, gy); ctx!.stroke();
			}

			// === Slow scan line ===
			scanY += 0.3;
			if (scanY > h + 60) scanY = -60;
			const scanGrad = ctx!.createLinearGradient(0, scanY - 40, 0, scanY + 40);
			scanGrad.addColorStop(0, 'rgba(0, 255, 65, 0)');
			scanGrad.addColorStop(0.5, 'rgba(0, 255, 65, 0.04)');
			scanGrad.addColorStop(1, 'rgba(0, 255, 65, 0)');
			ctx!.fillStyle = scanGrad;
			ctx!.fillRect(0, scanY - 40, w, 80);

			// === CRT scan lines ===
			ctx!.fillStyle = 'rgba(0, 0, 0, 0.04)';
			for (let sy = 0; sy < h; sy += 3) {
				ctx!.fillRect(0, sy, w, 1);
			}

			// === Spawn dossiers ===
			const spawnInterval = 180; // ~3 seconds between spawns
			if (t - lastSpawn > spawnInterval && dossiers.length < 5) {
				spawnDossier();
				lastSpawn = t;
			}

			// === Draw & clean dossiers ===
			for (let i = dossiers.length - 1; i >= 0; i--) {
				const d = dossiers[i];
				const age = t - d.birth;
				if (age > d.lifespan) {
					dossiers.splice(i, 1);
					continue;
				}
				// Slow fade in (120 frames ~2s) / hold / fade out
				const fadeIn = Math.min(age / 120, 1);
				const fadeOut = Math.min((d.lifespan - age) / 120, 1);
				const alpha = d.maxAlpha * fadeIn * fadeOut;

				drawDossier(ctx!, d, alpha);
			}

			// === Corner crosshairs ===
			const chSize = 20;
			const chAlpha = 0.05 + Math.sin(t * 0.006) * 0.015;
			ctx!.strokeStyle = `rgba(0, 255, 65, ${chAlpha})`;
			ctx!.lineWidth = 1;
			ctx!.beginPath(); ctx!.moveTo(20, 20 + chSize); ctx!.lineTo(20, 20); ctx!.lineTo(20 + chSize, 20); ctx!.stroke();
			ctx!.beginPath(); ctx!.moveTo(w - 20 - chSize, 20); ctx!.lineTo(w - 20, 20); ctx!.lineTo(w - 20, 20 + chSize); ctx!.stroke();
			ctx!.beginPath(); ctx!.moveTo(20, h - 20 - chSize); ctx!.lineTo(20, h - 20); ctx!.lineTo(20 + chSize, h - 20); ctx!.stroke();
			ctx!.beginPath(); ctx!.moveTo(w - 20 - chSize, h - 20); ctx!.lineTo(w - 20, h - 20); ctx!.lineTo(w - 20, h - 20 - chSize); ctx!.stroke();

			// === Vignette ===
			const vigGrad = ctx!.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
			vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
			vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
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
	}, [ambientData, drawDossier]);

	return (
		<canvas
			ref={canvasRef}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				zIndex: -1,
				pointerEvents: 'none',
			}}
		/>
	);
}
