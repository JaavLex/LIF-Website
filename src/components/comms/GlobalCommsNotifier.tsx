'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface Toast {
	id: number;
	channelId: number;
	channelName: string;
	snippet: string;
}

interface ChannelLite {
	id: number;
	name: string;
	lastMessageAt?: string | null;
	lastMessagePreview?: string | null;
}

/**
 * Site-wide comms notifier. Polls /api/comms/channels every 30s and pops a
 * toast when any channel's lastMessageAt advances. Suppressed on /comms pages
 * (those have their own in-page toaster). Silently no-ops if the user is not
 * eligible (403 from the API).
 */
export function GlobalCommsNotifier() {
	const pathname = usePathname();
	const router = useRouter();
	const [toasts, setToasts] = useState<Toast[]>([]);
	const seenRef = useRef<Map<number, string>>(new Map());
	const initializedRef = useRef(false);
	const enabledRef = useRef(true);
	const toastIdRef = useRef(0);

	const onCommsPage = pathname?.startsWith('/roleplay/comms') ?? false;

	useEffect(() => {
		if (onCommsPage) return; // /comms has its own toaster
		if (!enabledRef.current) return;

		let cancelled = false;

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
				const seen = seenRef.current;
				if (initializedRef.current) {
					for (const ch of channels) {
						if (!ch.lastMessageAt) continue;
						const prev = seen.get(ch.id);
						if (prev && ch.lastMessageAt > prev) {
							const toastId = ++toastIdRef.current;
							if (!cancelled) {
								setToasts((t) => [
									...t,
									{
										id: toastId,
										channelId: ch.id,
										channelName: ch.name,
										snippet: ch.lastMessagePreview || '',
									},
								]);
								setTimeout(() => {
									setToasts((t) => t.filter((x) => x.id !== toastId));
								}, 6000);
							}
						}
					}
				}
				for (const ch of channels) {
					if (ch.lastMessageAt) seen.set(ch.id, ch.lastMessageAt);
				}
				initializedRef.current = true;
			} catch {}
		};

		poll();
		const interval = setInterval(poll, 12_000);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [onCommsPage]);

	if (onCommsPage || toasts.length === 0) return null;

	return (
		<div className="comms-toast-stack comms-toast-stack-global">
			{toasts.map((t) => (
				<button
					key={t.id}
					type="button"
					className="comms-toast"
					onClick={() => {
						router.push(`/roleplay/comms?channel=${t.channelId}`);
						setToasts((arr) => arr.filter((x) => x.id !== t.id));
					}}
				>
					<div className="comms-toast-channel">📨 {t.channelName}</div>
					{t.snippet && <div className="comms-toast-snippet">{t.snippet}</div>}
				</button>
			))}
		</div>
	);
}
