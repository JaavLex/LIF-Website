import type { Metadata } from 'next';
import './roleplay.css';
import { RoleplayShell } from '@/components/roleplay/RoleplayShell';
import { getPayloadClient } from '@/lib/payload';

export const metadata: Metadata = {
	title: 'Base de Données du Personnel | LIF Roleplay',
	description:
		'Système de gestion du personnel et de roleplay de la Légion Internationale Francophone.',
};

export const dynamic = 'force-dynamic';

export default async function RoleplayLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const payload = await getPayloadClient();
	const roleplayConfig = await payload
		.findGlobal({ slug: 'roleplay' })
		.catch(() => null);

	const loadingEnabled = (roleplayConfig as any)?.loadingEnabled !== false;
	const loadingMessages =
		(roleplayConfig as any)?.loadingMessages?.map((m: any) => m.message) ||
		undefined;

	return (
		<div className="terminal">
			<RoleplayShell
				loadingEnabled={loadingEnabled}
				loadingMessages={loadingMessages}
			>
				{children}
			</RoleplayShell>
		</div>
	);
}
