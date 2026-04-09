import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { checkCommsEligibility } from '@/lib/comms';
import { checkAdminPermissions } from '@/lib/admin';
import { CommsLayout } from '@/components/comms/CommsLayout';
import './comms.css';

export const dynamic = 'force-dynamic';

export default async function CommsPage() {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) redirect('/roleplay');
	const session = verifySession(token);
	if (!session) redirect('/roleplay');

	const eligibility = await checkCommsEligibility(session);

	if (!eligibility.eligible) {
		const messages: Record<string, string> = {
			not_authenticated: 'Vous devez être connecté avec Discord.',
			not_guild_member:
				'Vous devez être membre du serveur Discord pour accéder aux comms.',
			no_operator_role:
				'Vous devez être opérateur (entrée en service) pour accéder aux comms.',
			no_active_character:
				'Vous devez avoir un personnage actif (en service) pour accéder aux comms.',
			comms_banned: 'Votre accès aux comms a été révoqué.',
			disclaimer_required: 'Acceptez l\'avis pour continuer.',
		};
		return (
			<div className="terminal-container">
				<Link href="/roleplay" className="retour-link">
					← Retour
				</Link>
				<div
					className="terminal-panel"
					style={{ textAlign: 'center', padding: '3rem' }}
				>
					<h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
						Accès aux Comms refusé
					</h2>
					<p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
						{messages[eligibility.reason] || 'Accès refusé.'}
					</p>
					{eligibility.reason === 'no_active_character' && (
						<Link
							href="/roleplay/personnage/nouveau"
							className="session-btn"
							style={{ padding: '0.6rem 1.2rem' }}
						>
							Créer un personnage
						</Link>
					)}
					{(eligibility.reason === 'not_guild_member' ||
						eligibility.reason === 'no_operator_role') &&
						eligibility.discordInviteUrl && (
							<a
								href={eligibility.discordInviteUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="session-btn"
								style={{ padding: '0.6rem 1.2rem' }}
							>
								Rejoindre le Discord
							</a>
						)}
				</div>
			</div>
		);
	}

	const adminPerms = await checkAdminPermissions(session);

	return <CommsLayout character={eligibility.character} isAdmin={adminPerms.isAdmin} />;
}
