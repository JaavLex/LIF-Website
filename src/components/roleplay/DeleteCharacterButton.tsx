'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteCharacterButton({ characterId, characterName }: { characterId: number; characterName: string }) {
	const router = useRouter();
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le dossier de ${characterName} ? Cette action est irréversible.`)) return;

		setDeleting(true);
		try {
			const res = await fetch(`/api/roleplay/characters/${characterId}`, { method: 'DELETE' });
			if (res.ok) {
				router.push('/roleplay');
			} else {
				const data = await res.json().catch(() => ({}));
				alert(data.message || 'Erreur lors de la suppression');
			}
		} catch {
			alert('Erreur lors de la suppression');
		} finally {
			setDeleting(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleDelete}
			disabled={deleting}
			style={{
				padding: '0.5rem 1rem',
				fontSize: '0.85rem',
				whiteSpace: 'nowrap',
				background: 'transparent',
				border: '1px solid var(--danger)',
				color: 'var(--danger)',
				cursor: deleting ? 'wait' : 'pointer',
				opacity: deleting ? 0.5 : 1,
			}}
		>
			{deleting ? 'Suppression...' : 'Supprimer'}
		</button>
	);
}
