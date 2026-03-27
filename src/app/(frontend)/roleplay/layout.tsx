import type { Metadata } from 'next';
import './roleplay.css';

export const metadata: Metadata = {
	title: 'Base de Données du Personnel | LIF Roleplay',
	description:
		'Système de gestion du personnel et de roleplay de la Légion Internationale Francophone.',
};

export default function RoleplayLayout({ children }: { children: React.ReactNode }) {
	return <div className="terminal">{children}</div>;
}
