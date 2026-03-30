import { getPayloadClient } from '@/lib/payload';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { CharacterForm } from '@/components/roleplay/CharacterForm';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function EditCharacterPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const payload = await getPayloadClient();
	const characterId = parseInt(id, 10);
	if (isNaN(characterId)) notFound();

	// Check auth
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) redirect('/roleplay');
	const session = verifySession(token);
	if (!session) redirect('/roleplay');

	// Fetch character
	let character: any;
	try {
		character = await payload.findByID({
			collection: 'characters',
			id: characterId,
			depth: 2,
		});
	} catch {
		notFound();
	}

	if (!character) notFound();

	// Check ownership or admin (Discord role-based)
	const { isAdmin } = await checkAdminPermissions(session);
	const isOwner = character.discordId === session.discordId;

	if (!isAdmin && !isOwner) redirect('/roleplay');

	const [ranks, units] = await Promise.all([
		payload.find({ collection: 'ranks', sort: 'order', limit: 100, depth: 2 }),
		payload.find({ collection: 'units', limit: 100 }),
	]);

	let allCharacters: any[] = [];
	let allUsers: any[] = [];
	if (isAdmin) {
		const [chars, users] = await Promise.all([
			payload.find({
				collection: 'characters',
				limit: 500,
				depth: 0,
				sort: 'fullName',
			}),
			payload.find({
				collection: 'users',
				limit: 500,
				depth: 0,
				where: { discordId: { exists: true } },
			}),
		]);
		allCharacters = chars.docs.map((c: any) => ({ id: c.id, fullName: c.fullName }));
		allUsers = users.docs.map((u: any) => ({
			discordId: u.discordId,
			discordUsername: u.discordUsername,
		}));
	}

	return (
		<div className="terminal-container">
			<Link
				href={`/roleplay/personnage/${character.id}`}
				style={{
					color: 'var(--muted)',
					fontSize: '0.85rem',
					display: 'inline-block',
					marginBottom: '1rem',
				}}
			>
				← Retour au dossier
			</Link>

			<div className="terminal-header">
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">
						MODIFICATION — {character.militaryId || 'N/A'}
					</span>
				</div>
				<div className="terminal-header-right">ÉDITION</div>
			</div>

			<CharacterForm
				ranks={JSON.parse(JSON.stringify(ranks.docs))}
				units={JSON.parse(JSON.stringify(units.docs))}
				editData={JSON.parse(JSON.stringify(character))}
				isAdmin={isAdmin}
				allCharacters={allCharacters}
				allUsers={allUsers}
			/>
		</div>
	);
}
