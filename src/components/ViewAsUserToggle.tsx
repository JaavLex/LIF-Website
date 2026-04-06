'use client';

import { useState, useEffect } from 'react';

export function ViewAsUserToggle() {
	const [visible, setVisible] = useState(false);
	const [viewingAsUser, setViewingAsUser] = useState(false);
	const [toggling, setToggling] = useState(false);

	useEffect(() => {
		// Only show in dev environment
		if (process.env.NEXT_PUBLIC_LIF_ENVIRONMENT !== 'dev') return;

		// Check if user is a real admin
		fetch('/api/auth/admin-check')
			.then(r => r.json())
			.then(data => {
				if (data.isAdmin || data.isRealAdmin || data.viewingAsUser) {
					setVisible(true);
					setViewingAsUser(!!data.viewingAsUser);
				}
			})
			.catch(() => {});
	}, []);

	if (!visible) return null;

	const handleToggle = async () => {
		setToggling(true);
		try {
			const res = await fetch('/api/auth/view-as-user', { method: 'POST' });
			if (res.ok) {
				// Hard reload with cache bust to ensure server re-renders
				window.location.href = window.location.pathname + '?t=' + Date.now();
				return;
			}
		} catch {}
		setToggling(false);
	};

	return (
		<button
			onClick={handleToggle}
			disabled={toggling}
			style={{
				position: 'fixed',
				top: 'calc(var(--dev-banner-h, 0px) + 0.5rem)',
				left: '0.5rem',
				zIndex: 10000,
				padding: '0.6rem 1rem',
				background: viewingAsUser ? '#c44' : 'rgba(74, 124, 35, 0.9)',
				color: '#fff',
				border: viewingAsUser ? '2px solid #f66' : '2px solid rgba(74, 124, 35, 1)',
				fontSize: '0.75rem',
				fontWeight: 700,
				fontFamily: 'monospace',
				cursor: toggling ? 'not-allowed' : 'pointer',
				opacity: toggling ? 0.6 : 1,
				letterSpacing: '0.05em',
				textTransform: 'uppercase',
				boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
			}}
		>
			{toggling
				? '...'
				: viewingAsUser
					? 'Mode utilisateur — Revenir admin'
					: 'Voir comme utilisateur'}
		</button>
	);
}
