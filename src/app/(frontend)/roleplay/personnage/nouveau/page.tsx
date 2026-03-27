import { getPayloadClient } from '@/lib/payload';
import Link from 'next/link';
import { CharacterForm } from '@/components/roleplay/CharacterForm';

export const dynamic = 'force-dynamic';

export default async function NewCharacterPage() {
	const payload = await getPayloadClient();

	const [ranks, units] = await Promise.all([
		payload.find({ collection: 'ranks', sort: 'order', limit: 100 }),
		payload.find({ collection: 'units', limit: 100 }),
	]);

	return (
		<div className="terminal-container">
			<Link href="/roleplay" style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'inline-block', marginBottom: '1rem' }}>
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
				<div className="terminal-header-right">
					FORMULAIRE D&apos;ENREGISTREMENT
				</div>
			</div>

			<CharacterForm
				ranks={JSON.parse(JSON.stringify(ranks.docs))}
				units={JSON.parse(JSON.stringify(units.docs))}
			/>
		</div>
	);
}
