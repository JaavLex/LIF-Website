import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { TranscriptViewer } from '@/components/roleplay/TranscriptViewer';

export const dynamic = 'force-dynamic';

export default async function TranscriptsPage() {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;

	if (!token) redirect('/roleplay');

	const session = verifySession(token);
	if (!session) redirect('/roleplay');

	const adminPerms = await checkAdminPermissions(session);
	if (!adminPerms.isAdmin) redirect('/roleplay');

	return (
		<div className="terminal-container">
			<Link
				href="/roleplay"
				style={{
					color: 'var(--muted)',
					fontSize: '0.85rem',
					display: 'inline-block',
					marginBottom: '1rem',
				}}
			>
				← Retour à la base de données
			</Link>

			<div className="admin-indicator">
				<span className="admin-indicator-dot" />
				<span>MODE ADMIN</span>
				<span className="admin-role-name">{adminPerms.roleName}</span>
			</div>

			<div className="terminal-header">
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">HISTORIQUE DES TICKETS</span>
				</div>
				<div className="terminal-header-right">
					LIF-TICKETS v1.0 | ADMIN UNIQUEMENT
				</div>
			</div>

			<div className="terminal-panel">
				<h1 style={{ marginBottom: '1.5rem' }}>Transcripts des tickets</h1>
				<TranscriptViewer />
			</div>

			<div style={{ textAlign: 'center', padding: '1rem' }}>
				<Link
					href="/roleplay"
					style={{ color: 'var(--muted)', fontSize: '0.85rem' }}
				>
					← Retour à la base de données
				</Link>
			</div>
		</div>
	);
}
