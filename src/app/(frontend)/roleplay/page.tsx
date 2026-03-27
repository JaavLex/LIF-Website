import { getPayloadClient } from '@/lib/payload';
import Link from 'next/link';
import { PersonnelFilters } from '@/components/roleplay/PersonnelFilters';
import { SessionBar } from '@/components/roleplay/SessionBar';

export const dynamic = 'force-dynamic';

export default async function RoleplayPage() {
	const payload = await getPayloadClient();

	const [characters, ranks, units] = await Promise.all([
		payload.find({
			collection: 'characters',
			where: {
				isArchived: { not_equals: true },
			},
			sort: '-createdAt',
			limit: 100,
			depth: 2,
		}),
		payload.find({
			collection: 'ranks',
			sort: 'order',
			limit: 100,
		}),
		payload.find({
			collection: 'units',
			limit: 100,
		}),
	]);

	return (
		<div className="terminal-container">
			<SessionBar />

			<div className="terminal-header">
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">SYSTÈME DE GESTION DU PERSONNEL</span>
				</div>
				<div className="terminal-header-right">
					LIF-PERSONNEL v2.0 | CLASSIFICATION: RESTREINT
				</div>
			</div>

			<div className="terminal-panel">
				<h1>BASE DE DONNÉES DU PERSONNEL</h1>

				<div className="system-status">
					<div className="status-item">
						<span className="status-indicator" />
						<span>Système opérationnel</span>
					</div>
					<div className="status-item">
						<span className="status-indicator" />
						<span>{characters.totalDocs} dossier{characters.totalDocs !== 1 ? 's' : ''} enregistré{characters.totalDocs !== 1 ? 's' : ''}</span>
					</div>
					<div className="status-item">
						<span className="status-indicator" />
						<span>{characters.docs.filter((c: any) => c.status === 'in-service').length} en service actif</span>
					</div>
				</div>

				<PersonnelFilters
					characters={JSON.parse(JSON.stringify(characters.docs))}
					ranks={JSON.parse(JSON.stringify(ranks.docs))}
					units={JSON.parse(JSON.stringify(units.docs))}
				/>
			</div>

			<div style={{ textAlign: 'center', padding: '1rem' }}>
				<Link href="/" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
					← Retour au site principal
				</Link>
			</div>
		</div>
	);
}
