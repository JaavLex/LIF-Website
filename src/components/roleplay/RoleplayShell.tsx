'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TerminalLoading } from './TerminalLoading';

interface RoleplayShellProps {
	children: React.ReactNode;
	loadingEnabled: boolean;
	loadingMessages?: string[];
}

const SESSION_KEY = 'lif-roleplay-loaded';
const MUSIC_DISABLED_KEY = 'lif-roleplay-music-disabled';
const MUSIC_VOLUME_KEY = 'lif-roleplay-music-volume';

function RoleplayAudio({ enabled }: { enabled: boolean }) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [disabled, setDisabled] = useState(false);
	const [volume, setVolume] = useState(0.2);

	useEffect(() => {
		const storedDisabled = localStorage.getItem(MUSIC_DISABLED_KEY);
		const storedVolume = localStorage.getItem(MUSIC_VOLUME_KEY);

		if (storedDisabled === '1') {
			setDisabled(true);
		}

		if (storedVolume) {
			const parsedVolume = Number(storedVolume);
			if (!Number.isNaN(parsedVolume)) {
				setVolume(Math.min(1, Math.max(0, parsedVolume)));
			}
		}
	}, []);

	useEffect(() => {
		if (!audioRef.current) return;
		audioRef.current.volume = volume;
		localStorage.setItem(MUSIC_VOLUME_KEY, String(volume));
	}, [volume]);

	useEffect(() => {
		localStorage.setItem(MUSIC_DISABLED_KEY, disabled ? '1' : '0');
	}, [disabled]);

	useEffect(() => {
		if (!enabled || disabled || !audioRef.current) return;

		const audio = audioRef.current;
		audio.volume = volume;

		const tryPlay = async () => {
			try {
				await audio.play();
				cleanup();
			} catch {
				// Browser blocked autoplay until a user gesture happens.
			}
		};

		const handleUserGesture = () => {
			void tryPlay();
		};

		const cleanup = () => {
			window.removeEventListener('click', handleUserGesture);
			window.removeEventListener('keydown', handleUserGesture);
			window.removeEventListener('touchstart', handleUserGesture);
		};

		void tryPlay();

		window.addEventListener('click', handleUserGesture);
		window.addEventListener('keydown', handleUserGesture);
		window.addEventListener('touchstart', handleUserGesture);

		return cleanup;
	}, [enabled, disabled, volume]);

	useEffect(() => {
		if (!audioRef.current) return;

		if (disabled) {
			audioRef.current.pause();
			return;
		}

		if (enabled) {
			void audioRef.current.play().catch(() => {});
		}
	}, [disabled, enabled]);

	return (
		<>
			<audio ref={audioRef} src="/song/LIFDB.mp3" loop preload="auto" />
			<div className="roleplay-audio-controls" data-tutorial="audio-controls">
				<button
					type="button"
					className="session-btn"
					onClick={() => setDisabled(prev => !prev)}
					style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
				>
					{disabled ? 'Activer musique' : 'Couper musique'}
				</button>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={volume}
					onChange={e => setVolume(Number(e.target.value))}
					disabled={disabled}
					aria-label="Volume musique"
				/>
			</div>
		</>
	);
}

export function RoleplayShell({
	children,
	loadingEnabled,
	loadingMessages,
}: RoleplayShellProps) {
	const [showLoading, setShowLoading] = useState(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		// Only show loading on first entry to roleplay section per session
		if (loadingEnabled && !sessionStorage.getItem(SESSION_KEY)) {
			setShowLoading(true);
		} else {
			setReady(true);
		}
	}, [loadingEnabled]);

	const handleLoadingComplete = useCallback(() => {
		sessionStorage.setItem(SESSION_KEY, '1');
		setShowLoading(false);
		setReady(true);
	}, []);

	if (showLoading) {
		return (
			<TerminalLoading
				messages={loadingMessages}
				onComplete={handleLoadingComplete}
			/>
		);
	}

	if (!ready) return null;

	return (
		<>
			<RoleplayAudio enabled={ready} />
			{children}
		</>
	);
}
