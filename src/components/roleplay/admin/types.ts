import type React from 'react';

export interface UnitItem {
	id: number;
	name: string;
	slug: string;
	color?: string;
	insignia?: { url?: string; id?: number } | null;
	description?: any;
	parentFaction?: { id: number; name: string } | number | null;
}

export interface FactionItem {
	id: number;
	name: string;
	slug: string;
	type?: string;
	color?: string;
	logo?: { url?: string; id?: number } | null;
	description?: any;
}

export async function uploadFile(file: File): Promise<number> {
	const formData = new FormData();
	formData.append('file', file);
	formData.append('alt', file.name);
	const res = await fetch('/api/upload', { method: 'POST', body: formData });
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message || "Erreur lors de l'upload");
	}
	const data = await res.json();
	return data.id;
}

export const labelStyle: React.CSSProperties = {
	display: 'block',
	fontSize: '0.8rem',
	color: 'var(--muted)',
	marginBottom: '0.35rem',
};
