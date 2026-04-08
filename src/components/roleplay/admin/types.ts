import type React from 'react';

// Serialized shapes (after serialize() strips Payload internals).
// These use `any` for media/relation fields since the serialized data
// can be either a populated object or an ID depending on depth.
export interface UnitItem {
	id: number;
	name: string;
	slug: string;
	color?: string | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	insignia?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	description?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parentFaction?: any;
}

export interface FactionItem {
	id: number;
	name: string;
	slug: string;
	type?: string | null;
	color?: string | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	logo?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	description?: any;
}

export interface RankItem {
	id: number;
	name: string;
	abbreviation?: string | null;
	order?: number | null;
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
