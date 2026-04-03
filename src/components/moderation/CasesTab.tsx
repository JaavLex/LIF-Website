'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MODERATION_REASON_LABELS, MODERATION_STATUS_LABELS } from '@/lib/constants';

interface CasesTabProps {
	authorized: boolean;
	onError: (error: string) => void;
}

export default function CasesTab({ authorized, onError }: CasesTabProps) {
	const router = useRouter();
	const [cases, setCases] = useState<any[]>([]);
	const [casesLoading, setCasesLoading] = useState(false);
	const [caseStatusFilter, setCaseStatusFilter] = useState('');

	useEffect(() => {
		if (authorized) loadCases();
	}, [caseStatusFilter, authorized]);

	async function loadCases() {
		setCasesLoading(true);
		try {
			const params = new URLSearchParams();
			if (caseStatusFilter) params.set('status', caseStatusFilter);
			const res = await fetch(`/api/moderation/cases?${params}`);
			if (!res.ok) throw new Error('Erreur chargement');
			const data = await res.json();
			setCases(data.cases);
		} catch (err: any) {
			onError(err.message);
		}
		setCasesLoading(false);
	}

	return (
		<>
			<div className="mod-filters">
				<select
					className="mod-filter-select"
					value={caseStatusFilter}
					onChange={e => setCaseStatusFilter(e.target.value)}
				>
					<option value="">Tous les statuts</option>
					{Object.entries(MODERATION_STATUS_LABELS).map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
			</div>

			{casesLoading ? (
				<div className="mod-loading">Chargement des dossiers</div>
			) : cases.length === 0 ? (
				<div className="mod-empty">Aucun dossier trouvé</div>
			) : (
				<ul className="mod-case-list">
					{cases.map((c: any) => (
						<li
							key={c.id}
							className="mod-case-list-item"
							onClick={() => router.push(`/moderation/dossier/${c.id}`)}
						>
							<span className="mod-case-list-number">#{c.caseNumber}</span>
							<div className="mod-case-list-target">
								<div>{c.targetDiscordUsername}</div>
								<div className="mod-case-list-reason">
									{MODERATION_REASON_LABELS[c.reason] || c.reason}
								</div>
							</div>
							<span className={`mod-case-status ${c.status}`}>
								{MODERATION_STATUS_LABELS[c.status] || c.status}
							</span>
							<span className="mod-case-list-date">
								{new Date(c.createdAt).toLocaleDateString('fr-FR')}
							</span>
						</li>
					))}
				</ul>
			)}
		</>
	);
}
