'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';

interface ChannelLite {
	id: number;
	lastMessageAt?: string | null;
	lastMessageMentionsViewer?: boolean;
}

/**
 * COMMS button for /roleplay with a live unread mention badge. Polls
 * /api/comms/channels every 12s, increments a per-channel counter on
 * advance-with-mention, sums them for the badge, and clears the counter for a
 * channel when the user opens it (storage event from /comms).
 *
 * Counter state is held in localStorage so the badge survives navigation
 * between /roleplay pages without resetting.
 */
const STORAGE_KEY = 'comms.mentionCounts.v1';
const SEEN_KEY = 'comms.seenLastAt.v1';

function readMap(key: string): Record<string, string | number> {
	if (typeof window === 'undefined') return {};
	try {
		const raw = window.localStorage.getItem(key);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function writeMap(key: string, value: Record<string, string | number>) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}

export function CommsNavButton() {
	const [total, setTotal] = useState(0);
	const enabledRef = useRef(true);

	useEffect(() => {
		if (!enabledRef.current) return;
		let cancelled = false;

		const recompute = () => {
			const counts = readMap(STORAGE_KEY) as Record<string, number>;
			const sum = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
			setTotal(sum);
		};

		const poll = async () => {
			try {
				const res = await fetch('/api/comms/channels', {
					cache: 'no-store',
					headers: { 'cache-control': 'no-cache' },
				});
				if (!res.ok) {
					if (res.status === 401 || res.status === 403) {
						enabledRef.current = false;
					}
					return;
				}
				const data = await res.json();
				const channels: ChannelLite[] = data.channels || [];
				const seen = readMap(SEEN_KEY) as Record<string, string>;
				const counts = readMap(STORAGE_KEY) as Record<string, number>;
				let changed = false;
				for (const ch of channels) {
					if (!ch.lastMessageAt) continue;
					const prev = seen[String(ch.id)];
					if (prev && ch.lastMessageAt > prev && ch.lastMessageMentionsViewer) {
						counts[String(ch.id)] = (counts[String(ch.id)] || 0) + 1;
						changed = true;
					}
					if (seen[String(ch.id)] !== ch.lastMessageAt) {
						seen[String(ch.id)] = ch.lastMessageAt;
						changed = true;
					}
				}
				if (changed) {
					writeMap(SEEN_KEY, seen);
					writeMap(STORAGE_KEY, counts);
				}
				if (!cancelled) recompute();
			} catch {}
		};

		recompute();
		poll();
		const interval = setInterval(poll, 12_000);

		// React to /comms clearing a channel's count (cross-tab + same-tab)
		const onStorage = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY) recompute();
		};
		const onCustom = () => recompute();
		window.addEventListener('storage', onStorage);
		window.addEventListener('comms-mention-counts-change', onCustom);

		return () => {
			cancelled = true;
			clearInterval(interval);
			window.removeEventListener('storage', onStorage);
			window.removeEventListener('comms-mention-counts-change', onCustom);
		};
	}, []);

	return (
		<Link
			href="/roleplay/comms"
			className="rp-nav-btn rp-nav-btn--comms"
			data-tutorial="comms-button"
		>
			<span className="rp-nav-btn__bar" aria-hidden="true" />
			<span className="rp-nav-btn__icon" aria-hidden="true">
				<Radio size={18} strokeWidth={2.2} />
			</span>
			<span className="rp-nav-btn__text">
				<span className="rp-nav-btn__code">CMD-02 // CANAL</span>
				<span className="rp-nav-btn__label">COMMS</span>
			</span>
			<span className="rp-nav-btn__arrow" aria-hidden="true">
				→
			</span>
			{total > 0 && (
				<span
					className="rp-nav-btn__badge"
					data-count={total > 99 ? 3 : String(total).length}
					aria-label={`${total} mention${total > 1 ? 's' : ''} non lue${total > 1 ? 's' : ''}`}
					title={`${total} mention${total > 1 ? 's' : ''} non lue${total > 1 ? 's' : ''}`}
				>
					{total > 99 ? '99+' : total}
				</span>
			)}
		</Link>
	);
}
