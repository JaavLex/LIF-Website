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
		let columns: number;
		let drops: number[];

		const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
		const fontSize = 14;

		function resize() {
			canvas!.width = window.innerWidth;
			canvas!.height = window.innerHeight;
			columns = Math.floor(canvas!.width / fontSize);
			drops = new Array(columns).fill(1).map(() => Math.random() * -100);
		}

		function draw() {
			ctx!.fillStyle = 'rgba(0, 0, 0, 0.05)';
			ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

			for (let i = 0; i < drops.length; i++) {
				const char = chars[Math.floor(Math.random() * chars.length)];
				const x = i * fontSize;
				const y = drops[i] * fontSize;

				// Bright head
				ctx!.fillStyle = 'rgba(0, 255, 65, 0.9)';
				ctx!.font = `${fontSize}px monospace`;
				ctx!.fillText(char, x, y);

				// Dimmer trail character above
				if (drops[i] > 1) {
					const trailChar = chars[Math.floor(Math.random() * chars.length)];
					ctx!.fillStyle = 'rgba(0, 255, 65, 0.15)';
					ctx!.fillText(trailChar, x, y - fontSize);
				}

				if (y > canvas!.height && Math.random() > 0.975) {
					drops[i] = 0;
				}
				drops[i] += 0.5 + Math.random() * 0.5;
			}

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
				opacity: 0.4,
			}}
		/>
	);
}
