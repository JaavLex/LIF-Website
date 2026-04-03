'use client';

export function DevBanner() {
	if (process.env.NEXT_PUBLIC_LIF_ENVIRONMENT !== 'dev') return null;

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				zIndex: 99999,
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
			ENVIRONNEMENT DE DEVELOPPEMENT — Les donnees peuvent etre reinitilisees a tout
			moment
		</div>
	);
}
