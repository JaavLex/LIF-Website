import { getPayloadClient } from '@/lib/payload';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { CharacterForm } from '@/components/roleplay/CharacterForm';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function NewCharacterPage() {
	const payload = await getPayloadClient();

	const [ranks, units] = await Promise.all([
		payload.find({ collection: 'ranks', sort: 'order', limit: 100, depth: 2 }),
		payload.find({ collection: 'units', limit: 100 }),
	]);

	// Fetch all characters for admin superior officer selector
	let allCharacters: any[] = [];

	// Check if current user is admin
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	const session = token ? verifySession(token) : null;
	let isAdmin = false;
	if (session) {
		const user = await payload.find({
			collection: 'users',
			where: { discordId: { equals: session.discordId } },
			limit: 1,
		});
		isAdmin = user.docs[0]?.role === 'admin';
		if (isAdmin) {
			const chars = await payload.find({ collection: 'characters', limit: 500, depth: 0, sort: 'fullName' });
			allCharacters = chars.docs.map((c: any) => ({ id: c.id, fullName: c.fullName }));
		}
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
