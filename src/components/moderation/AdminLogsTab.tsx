'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AdminLogsTabProps {
	authorized: boolean;
	onError: (msg: string) => void;
}

interface FacetActor {
	id: string;
	username: string;
	avatar: string | null;
	count: number;
}
interface FacetAction {
	action: string;
	count: number;
}
interface FacetEntity {
	entityType: string;
	count: number;
}

interface LogEntry {
	id: number;
	createdAt: string;
	actorDiscordId: string;
	actorDiscordUsername: string;
	actorDiscordAvatar: string | null;
	actorAdminLevel: string | null;
	action: string;
	summary: string;
	entityType: string | null;
	entityId: string | null;
	entityLabel: string | null;
	diff: Record<string, { before: unknown; after: unknown }> | null;
	metadata: Record<string, unknown> | null;
	ip: string | null;
	userAgent: string | null;
}

interface Filters {
	actor: string;
	action: string;
	entityType: string;
	dateFrom: string;
	dateTo: string;
	q: string;
}

const EMPTY_FILTERS: Filters = {
	actor: '',
	action: '',
	entityType: '',
	dateFrom: '',
	dateTo: '',
	q: '',
};

function relativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const sec = Math.round(diff / 1000);
	if (sec < 60) return `il y a ${sec}s`;
	const min = Math.round(sec / 60);
	if (min < 60) return `il y a ${min} min`;
	const h = Math.round(min / 60);
	if (h < 24) return `il y a ${h} h`;
	const d = Math.round(h / 24);
	return `il y a ${d} j`;
}

function filtersToQuery(f: Filters): string {
	const sp = new URLSearchParams();
	for (const [k, v] of Object.entries(f)) {
		if (v) sp.set(k, v);
	}
	const s = sp.toString();
	return s ? `?${s}` : '';
}

export default function AdminLogsTab({ authorized, onError }: AdminLogsTabProps) {
	const [entries, setEntries] = useState<LogEntry[]>([]);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [expanded, setExpanded] = useState<Set<number>>(new Set());
	const [filters, setFilters] = useState<Filters>(() => {
		if (typeof window === 'undefined') return EMPTY_FILTERS;
		const sp = new URLSearchParams(window.location.search);
		return {
			actor: sp.get('actor') ?? '',
			action: sp.get('action') ?? '',
			entityType: sp.get('entityType') ?? '',
			dateFrom: sp.get('dateFrom') ?? '',
			dateTo: sp.get('dateTo') ?? '',
			q: sp.get('q') ?? '',
		};
	});
	const [facets, setFacets] = useState<{
		actors: FacetActor[];
		actions: FacetAction[];
		entityTypes: FacetEntity[];
	}>({ actors: [], actions: [], entityTypes: [] });

	const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

	const loadFacets = useCallback(async () => {
		try {
			const res = await fetch('/api/moderation/admin-logs/facets');
			if (!res.ok) return;
			const data = await res.json();
			setFacets(data);
		} catch {
			// Silent — facets are a navigation aid, not authoritative.
		}
	}, []);

	const loadPage = useCallback(
		async (reset: boolean, cursor: string | null) => {
			setLoading(true);
			try {
				const sp = new URLSearchParams();
				for (const [k, v] of Object.entries(filters)) if (v) sp.set(k, v);
				if (!reset && cursor) sp.set('cursor', cursor);
				sp.set('limit', '50');

				const res = await fetch(`/api/moderation/admin-logs?${sp.toString()}`);
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.error || `Erreur ${res.status}`);
				}
				const data = await res.json();
				setEntries((prev) => (reset ? data.entries : [...prev, ...data.entries]));
				setNextCursor(data.nextCursor);
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Erreur lors du chargement des journaux';
				onError(msg);
			} finally {
				setLoading(false);
			}
		},
		[filters, onError],
	);

	// Reset + reload on filter change. URL mirror so filters survive reload.
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const query = filtersToQuery(filters);
			window.history.replaceState(
				null,
				'',
				`${window.location.pathname}${query}${window.location.hash}`,
			);
		}
		// Debounce search field + other filters uniformly (400ms). Cheap,
		// and prevents a burst of requests when clearing multiple fields.
		if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		searchDebounceRef.current = setTimeout(() => {
			setEntries([]);
			setNextCursor(null);
			loadPage(true, null);
		}, 400);
		return () => {
			if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	useEffect(() => {
		if (authorized) loadFacets();
	}, [authorized, loadFacets]);

	const toggleExpanded = useCallback((id: number) => {
		setExpanded((s) => {
			const next = new Set(s);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const entityHref = (e: LogEntry): string | null => {
		if (!e.entityType || !e.entityId) return null;
		switch (e.entityType) {
			case 'character':
				return `/roleplay/personnage/${e.entityId}`;
			case 'intelligence':
				return `/roleplay/intel/${e.entityId}`;
			default:
				return null;
		}
	};

	if (!authorized) {
		return <div className="mod-empty">Accès réservé aux administrateurs complets.</div>;
	}

	return (
		<div className="mod-admin-logs">
			<div className="mod-admin-logs__filters">
				<input
					type="search"
					placeholder="🔎 Recherche (résumé, nom d'entité)"
					value={filters.q}
					onChange={(e) => setFilters({ ...filters, q: e.target.value })}
				/>
				<select
					value={filters.actor}
					onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
				>
					<option value="">Tous les acteurs</option>
					{facets.actors.map((a) => (
						<option key={a.id} value={a.id}>
							{a.username} ({a.count})
						</option>
					))}
				</select>
				<select
					value={filters.action}
					onChange={(e) => setFilters({ ...filters, action: e.target.value })}
				>
					<option value="">Toutes les actions</option>
					{facets.actions.map((a) => (
						<option key={a.action} value={a.action}>
							{a.action} ({a.count})
						</option>
					))}
				</select>
				<select
					value={filters.entityType}
					onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
				>
					<option value="">Tous les types</option>
					{facets.entityTypes.map((e) => (
						<option key={e.entityType} value={e.entityType}>
							{e.entityType} ({e.count})
						</option>
					))}
				</select>
				<input
					type="date"
					value={filters.dateFrom}
					onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
				/>
				<input
					type="date"
					value={filters.dateTo}
					onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
				/>
				<button
					type="button"
					className="mod-btn"
					onClick={() => setFilters({ ...EMPTY_FILTERS })}
				>
					Réinitialiser
				</button>
				<button
					type="button"
					className="mod-btn"
					onClick={() => {
						setEntries([]);
						setNextCursor(null);
						loadPage(true, null);
						loadFacets();
					}}
				>
					⟳ Actualiser
				</button>
			</div>

			<div className="mod-admin-logs__list">
				{entries.length === 0 && !loading && (
					<div className="mod-empty">Aucune entrée</div>
				)}
				{entries.map((e) => {
					const isExp = expanded.has(e.id);
					const href = entityHref(e);
					return (
						<div key={e.id} className="mod-admin-logs__row">
							<button
								type="button"
								className="mod-admin-logs__row-head"
								onClick={() => toggleExpanded(e.id)}
							>
								<span className="mod-admin-logs__chev">{isExp ? '▼' : '▶'}</span>
								<span
									className="mod-admin-logs__time"
									title={new Date(e.createdAt).toLocaleString('fr-FR')}
								>
									{relativeTime(e.createdAt)}
								</span>
								<span className="mod-admin-logs__actor">
									{e.actorDiscordAvatar && (
										<img
											src={e.actorDiscordAvatar}
											alt=""
											className="mod-admin-logs__avatar"
										/>
									)}
									{e.actorDiscordUsername}
								</span>
								<span className="mod-admin-logs__chip">{e.action}</span>
								<span className="mod-admin-logs__summary">{e.summary}</span>
							</button>
							{isExp && (
								<div className="mod-admin-logs__body">
									{e.entityLabel && (
										<div className="mod-admin-logs__entity">
											Entité:{' '}
											{href ? (
												<a href={href}>{e.entityLabel}</a>
											) : (
												<span>{e.entityLabel}</span>
											)}
										</div>
									)}
									{e.diff && Object.keys(e.diff).length > 0 && (
										<table className="mod-admin-logs__diff">
											<thead>
												<tr>
													<th>Champ</th>
													<th>Avant</th>
													<th>Après</th>
												</tr>
											</thead>
											<tbody>
												{Object.entries(e.diff).map(([field, { before, after }]) => (
													<tr key={field}>
														<td>{field}</td>
														<td>
															<code>{JSON.stringify(before)}</code>
														</td>
														<td>
															<code>{JSON.stringify(after)}</code>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
									{e.metadata && (
										<pre className="mod-admin-logs__metadata">
											{JSON.stringify(e.metadata, null, 2)}
										</pre>
									)}
									<div className="mod-admin-logs__meta">
										{e.ip && <span>IP: {e.ip}</span>}
										{e.actorAdminLevel && <span>Niveau: {e.actorAdminLevel}</span>}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{nextCursor && (
				<div className="mod-admin-logs__more">
					<button
						type="button"
						className="mod-btn"
						disabled={loading}
						onClick={() => loadPage(false, nextCursor)}
					>
						{loading ? 'Chargement…' : 'Charger 50 de plus'}
					</button>
				</div>
			)}
		</div>
	);
}
