import { getPayloadClient } from '@/lib/payload';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { IntelligenceList } from '@/components/roleplay/IntelligenceList';

export const dynamic = 'force-dynamic';

export default async function IntelligencePage() {
	const payload = await getPayloadClient();

	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	const session = token ? verifySession(token) : null;

	let isAdmin = false;
	let adminPermissions: any = null;
	let hasIntelRole = false;
	let userCharacters: any[] = [];

	if (session) {
		adminPermissions = await checkAdminPermissions(session);
		isAdmin = adminPermissions.isAdmin;

		const roleplayConfig = await payload.findGlobal({ slug: 'roleplay' }).catch(() => null);
		const intelligenceRoleId = (roleplayConfig as any)?.intelligenceRoleId || '1424804277813248091';
		hasIntelRole = session.roles?.includes(intelligenceRoleId) || isAdmin;

		// Fetch user's characters to use as "posted by"
		if (hasIntelRole) {
			const chars = await payload.find({
				collection: 'characters',
				where: { discordId: { equals: session.discordId } },
				limit: 20,
				depth: 0,
			});
			userCharacters = chars.docs;
		}
	}

	const intelligence = await payload.find({
		collection: 'intelligence',
		sort: '-date',
		limit: 200,
		depth: 2,
	});

	const factions = await payload.find({
		collection: 'factions',
		limit: 100,
		depth: 0,
	}).catch(() => ({ docs: [] }));

	const characters = await payload.find({
		collection: 'characters',
		limit: 500,
		depth: 0,
	});

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

			{isAdmin && adminPermissions && (
				<div className="admin-indicator">
					<span className="admin-indicator-dot" />
					<span>MODE ADMIN</span>
					<span className="admin-role-name">{adminPermissions.roleName}</span>
				</div>
			)}

			<div className="terminal-header">
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">RENSEIGNEMENTS</span>
				</div>
				<div className="terminal-header-right">
					LIF-INTEL v1.0 | {intelligence.totalDocs} rapport{intelligence.totalDocs !== 1 ? 's' : ''}
				</div>
			</div>

			<div className="terminal-panel">
				<IntelligenceList
					reports={JSON.parse(JSON.stringify(intelligence.docs))}
					isAdmin={isAdmin}
					hasIntelRole={hasIntelRole}
					userCharacters={JSON.parse(JSON.stringify(userCharacters))}
					allCharacters={JSON.parse(JSON.stringify(characters.docs))}
					factions={JSON.parse(JSON.stringify(factions.docs))}
				/>
			</div>
		</div>
	);
}
