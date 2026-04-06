import { getPayloadClient } from '@/lib/payload';
import { serialize } from '@/lib/constants';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CharacterForm } from '@/components/roleplay/CharacterForm';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import type { Roleplay } from '@/payload-types';

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
		const roleplayConfig = await payload
			.findGlobal({ slug: 'roleplay' })
			.catch(() => null) as Roleplay | null;
		const operatorRoleId = roleplayConfig?.operatorRoleId;
		if (operatorRoleId && !session.roles?.includes(operatorRoleId))
			redirect('/roleplay');
		if (!operatorRoleId) redirect('/roleplay');
	}

	// Check if user already has an in-service character
	const existingActive = await payload.find({
		collection: 'characters',
		where: {
			and: [
				{ discordId: { equals: session.discordId } },
				{ status: { equals: 'in-service' } },
			],
		},
		limit: 1,
		depth: 0,
	});
	if (existingActive.docs.length > 0) {
		return (
			<div className="terminal-container">
				<Link href="/roleplay" className="retour-link">
					← Retour à la base de données
				</Link>
				<div className="terminal-panel" style={{ textAlign: 'center', padding: '3rem' }}>
					<h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Création impossible</h2>
					<p style={{ color: 'var(--muted)' }}>
						Vous ne pouvez pas avoir plus d&apos;un personnage actif à la fois.
					</p>
					<Link
						href={`/roleplay/personnage/${existingActive.docs[0].id}`}
						style={{
							display: 'inline-block',
							marginTop: '1rem',
							padding: '0.5rem 1rem',
							border: '1px solid var(--primary)',
							color: 'var(--primary)',
							textDecoration: 'none',
							fontSize: '0.85rem',
						}}
					>
						Voir votre personnage actif
					</Link>
				</div>
			</div>
		);
	}

	const [ranks, units, factions] = await Promise.all([
		payload.find({ collection: 'ranks', sort: 'order', limit: 100, depth: 2 }),
		payload.find({ collection: 'units', limit: 100, depth: 1 }),
		payload.find({ collection: 'factions', sort: 'name', limit: 100 }),
	]);

	let allCharacters: any[] = [];
	if (isAdmin) {
		const chars = await payload.find({
			collection: 'characters',
			limit: 500,
			depth: 0,
			sort: 'fullName',
		});
		allCharacters = chars.docs.map((c: any) => ({ id: c.id, fullName: c.fullName }));
	}

	return (
		<div className="terminal-container">
			<Link href="/roleplay" className="retour-link">
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
				ranks={serialize(ranks.docs)}
				units={serialize(units.docs)}
				factions={serialize(factions.docs)}
				isAdmin={isAdmin}
				allCharacters={allCharacters}
			/>
		</div>
	);
}
