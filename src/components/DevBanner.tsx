'use client';

import { useEffect, useRef } from 'react';

export function DevBanner() {
	const isDev = process.env.NEXT_PUBLIC_LIF_ENVIRONMENT === 'dev';
	const bannerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isDev || !bannerRef.current) return;

		const updateHeight = () => {
			const h = bannerRef.current?.offsetHeight ?? 0;
			document.documentElement.style.setProperty('--dev-banner-h', `${h}px`);
			document.documentElement.setAttribute('data-dev-banner', '');
		};

		updateHeight();
		window.addEventListener('resize', updateHeight);

		return () => {
			window.removeEventListener('resize', updateHeight);
			document.documentElement.style.removeProperty('--dev-banner-h');
			document.documentElement.removeAttribute('data-dev-banner');
		};
	}, [isDev]);

	if (!isDev) return null;

	return (
		<div
			ref={bannerRef}
			className="dev-banner"
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				zIndex: 1001,
				background: 'rgba(220, 50, 50, 0.95)',
				color: '#fff',
				textAlign: 'center',
				padding: '0.35rem 1rem',
				fontSize: '0.8rem',
				fontWeight: 700,
				letterSpacing: '1px',
				fontFamily: 'monospace',
				borderBottom: '2px solid #ff0000',
			}}
		>
			ENVIRONNEMENT DE DÉVELOPPEMENT — Les données peuvent être réinitialisées à tout
			moment
		</div>
	);
}
