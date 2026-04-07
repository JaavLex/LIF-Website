import type { Metadata } from 'next';
import './roleplay.css';
import { RoleplayShell } from '@/components/roleplay/RoleplayShell';
import MatrixBackground from '@/components/roleplay/MatrixBackground';

export const metadata: Metadata = {
	title: 'Base de Données du Personnel | LIF Roleplay',
	description:
		'Système de gestion du personnel et de roleplay de la Légion Internationale Francophone.',
};

export const dynamic = 'force-dynamic';

export default function RoleplayLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="terminal">
			<MatrixBackground />
			<RoleplayShell>{children}</RoleplayShell>
		</div>
	);
}
