'use client';

import { useEffect, useRef } from 'react';

export default function MatrixBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let animationId: number;
		let t = 0;

		// Slow scan line position (0 → 1 over ~8 seconds)
		let scanY = 0;

		// Data fragments that fade in/out slowly
		interface DataFragment {
			x: number;
			y: number;
			text: string;
			birth: number;
			lifespan: number;
			maxAlpha: number;
		}
		const fragments: DataFragment[] = [];
		const coordTexts = [
			'48°51\'N 2°21\'E', '43°17\'N 5°22\'E', 'GRID 12S PA 456 789',
			'ALT 320M', 'BRG 047°', 'RNG 1.2KM', 'FREQ 148.250',
			'SIGINT ACTIVE', 'ENC AES-256', 'NET STATUS OK',
			'TGT ACQUIRED', 'STANDBY', 'LINK 16 UP', 'SAT COM III',
			'QRF READY', 'ROE ALPHA', 'OPORD 2026-04', 'SITREP PENDING',
			'COMMS CHECK', 'RTLS 0.87', 'UTC+01:00', 'DEFCON 3',
		];

		function resize() {
			canvas!.width = window.innerWidth;
			canvas!.height = window.innerHeight;
		}

		function draw() {
			const w = canvas!.width;
			const h = canvas!.height;
			t++;

			// Clear with very dark background
			ctx!.fillStyle = 'rgba(5, 8, 4, 0.15)';
			ctx!.fillRect(0, 0, w, h);

			// === Subtle grid ===
			const gridSpacing = 80;
			ctx!.strokeStyle = 'rgba(0, 255, 65, 0.025)';
			ctx!.lineWidth = 0.5;
			for (let x = 0; x < w; x += gridSpacing) {
				ctx!.beginPath();
				ctx!.moveTo(x, 0);
				ctx!.lineTo(x, h);
				ctx!.stroke();
			}
			for (let y = 0; y < h; y += gridSpacing) {
				ctx!.beginPath();
				ctx!.moveTo(0, y);
				ctx!.lineTo(w, y);
				ctx!.stroke();
			}

			// === Slow horizontal scan line ===
			scanY += 0.3;
			if (scanY > h + 60) scanY = -60;

			const scanGrad = ctx!.createLinearGradient(0, scanY - 40, 0, scanY + 40);
			scanGrad.addColorStop(0, 'rgba(0, 255, 65, 0)');
			scanGrad.addColorStop(0.4, 'rgba(0, 255, 65, 0.03)');
			scanGrad.addColorStop(0.5, 'rgba(0, 255, 65, 0.07)');
			scanGrad.addColorStop(0.6, 'rgba(0, 255, 65, 0.03)');
			scanGrad.addColorStop(1, 'rgba(0, 255, 65, 0)');
			ctx!.fillStyle = scanGrad;
			ctx!.fillRect(0, scanY - 40, w, 80);

			// === CRT scan lines ===
			ctx!.fillStyle = 'rgba(0, 0, 0, 0.06)';
			for (let y = 0; y < h; y += 3) {
				ctx!.fillRect(0, y, w, 1);
			}

			// === Spawn data fragments occasionally ===
			if (t % 90 === 0 && fragments.length < 8) {
				fragments.push({
					x: 40 + Math.random() * (w - 80),
					y: 60 + Math.random() * (h - 120),
					text: coordTexts[Math.floor(Math.random() * coordTexts.length)],
					birth: t,
					lifespan: 300 + Math.random() * 400,
					maxAlpha: 0.08 + Math.random() * 0.1,
				});
			}

			// === Draw data fragments ===
			for (let i = fragments.length - 1; i >= 0; i--) {
				const f = fragments[i];
				const age = t - f.birth;
				if (age > f.lifespan) {
					fragments.splice(i, 1);
					continue;
				}

				// Slow fade in / hold / fade out
				const fadeIn = Math.min(age / 80, 1);
				const fadeOut = Math.min((f.lifespan - age) / 80, 1);
				const alpha = f.maxAlpha * fadeIn * fadeOut;

				ctx!.font = '11px "Courier New", monospace';
				ctx!.fillStyle = `rgba(0, 255, 65, ${alpha})`;
				ctx!.fillText(f.text, f.x, f.y);

				// Small bracket decoration
				ctx!.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.6})`;
				ctx!.lineWidth = 0.5;
				const tw = ctx!.measureText(f.text).width;
				// left bracket
				ctx!.beginPath();
				ctx!.moveTo(f.x - 6, f.y - 10);
				ctx!.lineTo(f.x - 6, f.y + 4);
				ctx!.stroke();
				ctx!.beginPath();
				ctx!.moveTo(f.x - 6, f.y - 10);
				ctx!.lineTo(f.x - 1, f.y - 10);
				ctx!.stroke();
				// right bracket
				ctx!.beginPath();
				ctx!.moveTo(f.x + tw + 6, f.y - 10);
				ctx!.lineTo(f.x + tw + 6, f.y + 4);
				ctx!.stroke();
				ctx!.beginPath();
				ctx!.moveTo(f.x + tw + 6, f.y - 10);
				ctx!.lineTo(f.x + tw + 1, f.y - 10);
				ctx!.stroke();
			}

			// === Corner crosshairs ===
			const chSize = 20;
			const chAlpha = 0.06 + Math.sin(t * 0.008) * 0.02;
			ctx!.strokeStyle = `rgba(0, 255, 65, ${chAlpha})`;
			ctx!.lineWidth = 1;

			// Top-left
			ctx!.beginPath();
			ctx!.moveTo(20, 20 + chSize);
			ctx!.lineTo(20, 20);
			ctx!.lineTo(20 + chSize, 20);
			ctx!.stroke();
			// Top-right
			ctx!.beginPath();
			ctx!.moveTo(w - 20 - chSize, 20);
			ctx!.lineTo(w - 20, 20);
			ctx!.lineTo(w - 20, 20 + chSize);
			ctx!.stroke();
			// Bottom-left
			ctx!.beginPath();
			ctx!.moveTo(20, h - 20 - chSize);
			ctx!.lineTo(20, h - 20);
			ctx!.lineTo(20 + chSize, h - 20);
			ctx!.stroke();
			// Bottom-right
			ctx!.beginPath();
			ctx!.moveTo(w - 20 - chSize, h - 20);
			ctx!.lineTo(w - 20, h - 20);
			ctx!.lineTo(w - 20, h - 20 - chSize);
			ctx!.stroke();

			// === Subtle vignette ===
			const vigGrad = ctx!.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
			vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
			vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
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
	}, []);

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
