import { getPayloadClient } from '@/lib/payload';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CharacterForm } from '@/components/roleplay/CharacterForm';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function NewCharacterPage() {
	const payload = await getPayloadClient();

	// Check auth
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) redirect('/roleplay');
	const session = verifySession(token);
	if (!session) redirect('/roleplay');

	// Check admin or operator role
	const adminPermissions = await checkAdminPermissions(session);
	const isAdmin = adminPermissions.isAdmin;

	if (!isAdmin) {
		// Check guild membership
		const user = await payload.find({
			collection: 'users',
			where: { discordId: { equals: session.discordId } },
			limit: 1,
		});
		const userData = user.docs[0];
		if (!userData?.isGuildMember) redirect('/roleplay');

		// Check operator role
		const roleplayConfig = await payload.findGlobal({ slug: 'roleplay' }).catch(() => null);
		const operatorRoleId = (roleplayConfig as any)?.operatorRoleId;
		if (operatorRoleId && !session.roles?.includes(operatorRoleId)) redirect('/roleplay');
		if (!operatorRoleId) redirect('/roleplay');
	}

	const [ranks, units] = await Promise.all([
		payload.find({ collection: 'ranks', sort: 'order', limit: 100, depth: 2 }),
		payload.find({ collection: 'units', limit: 100 }),
	]);

	let allCharacters: any[] = [];
	if (isAdmin) {
		const chars = await payload.find({ collection: 'characters', limit: 500, depth: 0, sort: 'fullName' });
		allCharacters = chars.docs.map((c: any) => ({ id: c.id, fullName: c.fullName }));
	}

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

			<div className="terminal-header">
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">CRÉATION DE DOSSIER PERSONNEL</span>
				</div>
				<div className="terminal-header-right">FORMULAIRE D&apos;ENREGISTREMENT</div>
			</div>

			<CharacterForm
				ranks={JSON.parse(JSON.stringify(ranks.docs))}
				units={JSON.parse(JSON.stringify(units.docs))}
				isAdmin={isAdmin}
				allCharacters={allCharacters}
			/>
		</div>
	);
}
