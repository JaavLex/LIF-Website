import { getPayloadClient } from '@/lib/payload';
import { serialize } from '@/lib/constants';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CharacterForm } from '@/components/roleplay/CharacterForm';
import { UnitSelector } from '@/components/roleplay/UnitSelector';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import type { Roleplay } from '@/payload-types';

export const dynamic = 'force-dynamic';

export default async function NewCharacterPage({
	searchParams,
}: {
	searchParams: Promise<{ unit?: string }>;
}) {
	const { unit: unitSlug } = await searchParams;
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
		const user = await payload.find({
			collection: 'users',
			where: { discordId: { equals: session.discordId } },
			limit: 1,
		});
		const userData = user.docs[0];
		if (!userData?.isGuildMember) redirect('/roleplay');

		const roleplayConfig = (await payload
			.findGlobal({ slug: 'roleplay' })
			.catch(() => null)) as Roleplay | null;
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
				<div
					className="terminal-panel"
					style={{ textAlign: 'center', padding: '3rem' }}
				>
					<h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
						Création impossible
					</h2>
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

	// Restrict the unit chooser to LIF parent units (the ones a player joins)
	const playerUnits = units.docs.filter((u: any) => {
		const fname =
			typeof u.parentFaction === 'object' && u.parentFaction
				? u.parentFaction.name
				: null;
		return !fname || fname === 'LIF';
	});

	// If no unit selected → show the chooser
	if (!unitSlug) {
		return (
			<div className="terminal-container">
				<Link href="/roleplay" className="retour-link">
					← Retour à la base de données
				</Link>
				<UnitSelector units={serialize(playerUnits) as any} />
			</div>
		);
	}

	// Resolve the chosen unit by slug
	const lockedUnit = playerUnits.find(
		(u: any) => (u.slug || '').toLowerCase() === unitSlug.toLowerCase(),
	);

	if (!lockedUnit) {
		// Unknown slug → bounce back to selector
		redirect('/roleplay/personnage/nouveau');
	}

	let allCharacters: any[] = [];
	if (isAdmin) {
		const chars = await payload.find({
			collection: 'characters',
			limit: 500,
			depth: 0,
			sort: 'fullName',
		});
		allCharacters = chars.docs.map((c: any) => ({
			id: c.id,
			fullName: c.fullName,
		}));
	}

	return (
		<div className="terminal-container">
			<Link
				href="/roleplay/personnage/nouveau"
				className="retour-link"
			>
				← Changer d&apos;unité
			</Link>

			<CharacterForm
				ranks={serialize(ranks.docs)}
				units={serialize(units.docs)}
				factions={serialize(factions.docs)}
				isAdmin={isAdmin}
				allCharacters={allCharacters}
				lockedUnit={serialize(lockedUnit) as any}
			/>
		</div>
	);
}
