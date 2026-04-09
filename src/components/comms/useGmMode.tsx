'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

export interface NpcListItem {
	id: number;
	firstName: string;
	lastName: string;
	fullName: string;
	callsign: string | null;
	avatarUrl: string | null;
	rankAbbreviation: string | null;
	isTarget: boolean;
}

interface GmModeState {
	enabled: boolean;
	defaultCharacterId: number | null;
	overrideCharacterId: number | null;
	npcList: NpcListItem[] | null;
	npcListLoading: boolean;
	npcListError: string | null;
}

interface GmModeContextValue extends GmModeState {
	setEnabled: (value: boolean) => void;
	setDefault: (id: number | null) => void;
	setOverride: (id: number | null) => void;
	clearOverride: () => void;
	effectiveCharacterId: number | null;
}

const GmModeContext = createContext<GmModeContextValue | null>(null);

const INITIAL_STATE: GmModeState = {
	enabled: false,
	defaultCharacterId: null,
	overrideCharacterId: null,
	npcList: null,
	npcListLoading: false,
	npcListError: null,
};

export function GmModeProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<GmModeState>(INITIAL_STATE);

	// Fetch the NPC list on first enable. Cached for the lifetime of the
	// provider — re-mounting (e.g. leaving /roleplay/comms) resets it.
	//
	// IMPORTANT: deps must NOT include `state.npcListLoading`. If it did, the
	// `setState(npcListLoading: true)` below would trigger a rerender, the
	// effect would re-run, its cleanup would flip `cancelled = true` on the
	// still-pending first fetch, and the fetch's `.then` would early-return
	// without ever clearing the loading flag — hanging the spinner forever.
	useEffect(() => {
		if (!state.enabled) return;
		if (state.npcList) return;
		let cancelled = false;
		setState((s) => (s.npcListLoading ? s : { ...s, npcListLoading: true, npcListError: null }));
		fetch('/api/roleplay/characters/npcs', { cache: 'no-store' })
			.then(async (r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				const data = await r.json();
				if (cancelled) return;
				setState((s) => ({
					...s,
					npcList: data.npcs || [],
					npcListLoading: false,
				}));
			})
			.catch((err: any) => {
				if (cancelled) return;
				setState((s) => ({
					...s,
					npcListLoading: false,
					npcListError: err?.message || 'Erreur de chargement',
				}));
			});
		return () => {
			cancelled = true;
		};
	}, [state.enabled, state.npcList]);

	const setEnabled = useCallback((value: boolean) => {
		setState((s) =>
			value ? { ...s, enabled: true } : { ...INITIAL_STATE },
		);
	}, []);

	const setDefault = useCallback((id: number | null) => {
		setState((s) => ({
			...s,
			defaultCharacterId: id,
			overrideCharacterId: null,
		}));
	}, []);

	const setOverride = useCallback((id: number | null) => {
		setState((s) => ({ ...s, overrideCharacterId: id }));
	}, []);

	const clearOverride = useCallback(() => {
		setState((s) => ({ ...s, overrideCharacterId: null }));
	}, []);

	const value = useMemo<GmModeContextValue>(
		() => {
			const { overrideCharacterId, defaultCharacterId } = state;
			return {
				...state,
				setEnabled,
				setDefault,
				setOverride,
				clearOverride,
				effectiveCharacterId: overrideCharacterId ?? defaultCharacterId,
			};
		},
		[state, setEnabled, setDefault, setOverride, clearOverride],
	);

	return (
		<GmModeContext.Provider value={value}>{children}</GmModeContext.Provider>
	);
}

export function useGmMode(): GmModeContextValue {
	const ctx = useContext(GmModeContext);
	if (!ctx) {
		throw new Error('useGmMode must be used inside <GmModeProvider>');
	}
	return ctx;
}
