'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { VERSION_INFO } from '@/lib/version';

const STORAGE_KEY = 'lif-splash-seen.v1';

// Terminal boot lines — each appears in sequence with its own delay.
// `tag` is the bracketed status, `text` is the message body. Empty `tag`
// produces a blank prompt line for spacing.
const LINES: Array<{ delay: number; tag: string; text: string }> = [
	{ delay: 0.10, tag: 'BOOT', text: 'lif-secure-terminal v' + VERSION_INFO.version },
	{ delay: 0.25, tag: 'BOOT', text: 'copyright (c) légion internationale francophone' },
	{ delay: 0.45, tag: ' OK ', text: 'cpu.cortex ............... online' },
	{ delay: 0.62, tag: ' OK ', text: 'mem.encrypted ............ 32768 KB' },
	{ delay: 0.78, tag: ' OK ', text: 'net.uplink ............... handshake complete' },
	{ delay: 0.95, tag: ' OK ', text: 'auth.session ............. verified' },
	{ delay: 1.12, tag: ' OK ', text: 'tls.certificate .......... pinned' },
	{ delay: 1.30, tag: ' OK ', text: 'roster.sync .............. 247 dossiers' },
	{ delay: 1.48, tag: ' OK ', text: 'comms.relay .............. armed' },
	{ delay: 1.66, tag: 'WARN', text: 'transmissions surveillées · niveau 03' },
	{ delay: 1.86, tag: ' OK ', text: 'mount /armureries ........ ready' },
	{ delay: 2.04, tag: ' OK ', text: 'mount /archives .......... ready' },
	{ delay: 2.22, tag: ' OK ', text: 'render.layout ............ done' },
	{ delay: 2.46, tag: '', text: '' },
	{ delay: 2.56, tag: '', text: 'système opérationnel — bienvenue, opérateur.' },
];

const TOTAL_DURATION = 3400; // ms — slightly after the last line

// The terminal boot splash is part of the in-universe "secure terminal"
// experience and should only appear on the terminal-themed sections of
// the site (/roleplay and /comms). Marketing/public pages keep their
// normal presentation.
const TERMINAL_PATH_PREFIXES = ['/roleplay', '/comms'];

function isTerminalPath(pathname: string | null): boolean {
	if (!pathname) return false;
	return TERMINAL_PATH_PREFIXES.some(
		prefix => pathname === prefix || pathname.startsWith(prefix + '/'),
	);
}

export function SplashScreen() {
	const pathname = usePathname();
	const onTerminalRoute = isTerminalPath(pathname);

	// IMPORTANT: default `visible: true` so the splash covers the page from
	// the very first paint. If we used `false` + useEffect, the page would
	// render first and the splash would pop on top after hydration — making
	// it look like "both exist at the same time". sessionStorage is checked
	// inside useEffect and dismisses immediately if already seen.
	const [visible, setVisible] = useState(true);
	const [closing, setClosing] = useState(false);

	useEffect(() => {
		// Only consume the "seen" flag when we're actually going to show the
		// splash — otherwise visiting a non-terminal page first would silently
		// mark the flag and suppress the splash on the next terminal visit.
		if (!onTerminalRoute) return;
		try {
			const seen = sessionStorage.getItem(STORAGE_KEY);
			if (seen) {
				// Already shown this session — vanish without animation.
				setVisible(false);
				return;
			}
			sessionStorage.setItem(STORAGE_KEY, '1');
		} catch {
			// Storage blocked — just show the splash normally.
		}
	}, [onTerminalRoute]);

	// Auto-dismiss after the boot sequence finishes
	useEffect(() => {
		if (!visible || closing) return;
		const t = setTimeout(() => dismiss(), TOTAL_DURATION);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible, closing]);

	// Skip on any keypress
	useEffect(() => {
		if (!visible) return;
		const onKey = () => dismiss();
		window.addEventListener('keydown', onKey, { once: true });
		return () => window.removeEventListener('keydown', onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]);

	function dismiss() {
		setClosing(true);
		// Wait for fade-out animation before unmounting
		setTimeout(() => setVisible(false), 320);
	}

	if (!visible || !onTerminalRoute) return null;

	return (
		<div
			className={`splash-screen${closing ? ' splash-screen--closing' : ''}`}
			role="dialog"
			aria-label="Initialisation du terminal"
			onClick={dismiss}
		>
			<div className="splash-screen-crt" aria-hidden />
			<div className="splash-screen-scanlines" aria-hidden />
			<div className="splash-screen-vignette" aria-hidden />
			<div className="splash-screen-flicker" aria-hidden />

			<div className="splash-screen-shell">
				<div className="splash-screen-topbar" aria-hidden>
					<span className="splash-screen-topbar-dot" />
					<span className="splash-screen-topbar-dot" />
					<span className="splash-screen-topbar-dot" />
					<span className="splash-screen-topbar-title">
						/dev/tty01 — l.i.f secure shell
					</span>
				</div>

				<pre className="splash-screen-output">
					{LINES.map((line, i) => (
						<span
							key={i}
							className="splash-screen-line"
							style={{ animationDelay: `${line.delay}s` }}
						>
							{line.tag ? (
								<>
									<span
										className={`splash-screen-tag splash-screen-tag--${
											line.tag.trim().toLowerCase() || 'sys'
										}`}
									>
										[{line.tag}]
									</span>
									<span className="splash-screen-text">{line.text}</span>
								</>
							) : line.text ? (
								<span className="splash-screen-text splash-screen-text--final">
									&gt; {line.text}
								</span>
							) : (
								<span className="splash-screen-text">&nbsp;</span>
							)}
						</span>
					))}
					<span
						className="splash-screen-line splash-screen-line--prompt"
						style={{ animationDelay: '2.85s' }}
					>
						<span className="splash-screen-text">
							&gt; appuyez sur une touche pour continuer
							<span className="splash-screen-cursor">▮</span>
						</span>
					</span>
				</pre>

				<div className="splash-screen-foot" aria-hidden>
					<span>L.I.F · LÉGION INTERNATIONALE FRANCOPHONE</span>
					<span>v{VERSION_INFO.version}</span>
				</div>
			</div>
		</div>
	);
}
