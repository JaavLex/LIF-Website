'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SyncRankButton({ characterId }: { characterId: number }) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleSync = async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/roleplay/characters/${characterId}/sync-rank`, {
				method: 'POST',
			});
			if (res.ok) {
				router.refresh();
			} else {
				const data = await res.json().catch(() => ({}));
				alert(data.message || 'Erreur lors de la synchronisation');
			}
		} catch {
			alert('Erreur réseau');
		} finally {
			setLoading(false);
		}
	};

	return (
		<button
			onClick={handleSync}
			disabled={loading}
			className="session-btn"
			style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: loading ? 0.6 : 1 }}
		>
			{loading ? 'Synchronisation...' : 'Mettre à jour le grade'}
		</button>
	);
}
