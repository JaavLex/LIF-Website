'use client';

import { useState, useEffect, useRef } from 'react';

interface RoleplayShellProps {
	children: React.ReactNode;
}

const MUSIC_DISABLED_KEY = 'lif-roleplay-music-disabled';
const MUSIC_VOLUME_KEY = 'lif-roleplay-music-volume';

const PLAYLIST = [
	{
		src: '/song/Aube%20Op%C3%A9rationelle%20-%20LIF.mp3',
		title: 'Aube Opérationnelle',
	},
	{ src: '/song/Contrat%20-%20LIF.mp3', title: 'Contrat' },
	{ src: '/song/Discipline%20-%20LIF.mp3', title: 'Discipline' },
	{ src: '/song/Guerre%20Electronique%20-%20LIF.mp3', title: 'Guerre Électronique' },
];

function shufflePlaylist(): number[] {
	const indices = PLAYLIST.map((_, i) => i);
	for (let i = indices.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[indices[i], indices[j]] = [indices[j], indices[i]];
	}
	return indices;
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

const DRAWER_OPEN_KEY = 'lif-roleplay-music-drawer-open';

function RoleplayAudio({ enabled }: { enabled: boolean }) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [disabled, setDisabled] = useState(false);
	const [volume, setVolume] = useState(0.2);
	const [order, setOrder] = useState<number[]>(() => shufflePlaylist());
	const [currentIndex, setCurrentIndex] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [hovering, setHovering] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);

	const currentTrack = PLAYLIST[order[currentIndex]];

	useEffect(() => {
		const storedDisabled = localStorage.getItem(MUSIC_DISABLED_KEY);
		const storedVolume = localStorage.getItem(MUSIC_VOLUME_KEY);
		const storedDrawer = localStorage.getItem(DRAWER_OPEN_KEY);

		if (storedDisabled === '1') {
			setDisabled(true);
		}

		if (storedVolume) {
			const parsedVolume = Number(storedVolume);
			if (!Number.isNaN(parsedVolume)) {
				setVolume(Math.min(1, Math.max(0, parsedVolume)));
			}
		}

		if (storedDrawer === '1') {
			setDrawerOpen(true);
		}
	}, []);

	useEffect(() => {
		localStorage.setItem(DRAWER_OPEN_KEY, drawerOpen ? '1' : '0');
	}, [drawerOpen]);

	useEffect(() => {
		if (!audioRef.current) return;
		audioRef.current.volume = volume;
		localStorage.setItem(MUSIC_VOLUME_KEY, String(volume));
	}, [volume]);

	useEffect(() => {
		localStorage.setItem(MUSIC_DISABLED_KEY, disabled ? '1' : '0');
	}, [disabled]);

	const playTrack = useCallback(
		(index: number) => {
			const audio = audioRef.current;
			if (!audio) return;
			audio.src = PLAYLIST[order[index]].src;
			audio.load();
			if (!disabled) {
				void audio.play().catch(() => {});
			}
		},
		[order, disabled],
	);

	const nextTrack = useCallback(() => {
		setCurrentIndex(prev => {
			const next = (prev + 1) % order.length;
			return next;
		});
	}, [order.length]);

	const prevTrack = useCallback(() => {
		const audio = audioRef.current;
		// If more than 3 seconds in, restart current track
		if (audio && audio.currentTime > 3) {
			audio.currentTime = 0;
			return;
		}
		setCurrentIndex(prev => {
			const next = (prev - 1 + order.length) % order.length;
			return next;
		});
	}, [order.length]);

	// Load track when index changes
	useEffect(() => {
		playTrack(currentIndex);
	}, [currentIndex, playTrack]);

	// Auto-advance when track ends
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const handleEnded = () => {
			setCurrentIndex(prev => {
				const next = prev + 1;
				if (next >= order.length) {
					// Reshuffle and restart
					const newOrder = shufflePlaylist();
					setOrder(newOrder);
					return 0;
				}
				return next;
			});
		};

		audio.addEventListener('ended', handleEnded);
		return () => audio.removeEventListener('ended', handleEnded);
	}, [order.length]);

	// Time tracking
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
		const handleDurationChange = () => setDuration(audio.duration || 0);

		audio.addEventListener('timeupdate', handleTimeUpdate);
		audio.addEventListener('durationchange', handleDurationChange);
		audio.addEventListener('loadedmetadata', handleDurationChange);

		return () => {
			audio.removeEventListener('timeupdate', handleTimeUpdate);
			audio.removeEventListener('durationchange', handleDurationChange);
			audio.removeEventListener('loadedmetadata', handleDurationChange);
		};
	}, []);

	// Autoplay on first user gesture
	useEffect(() => {
		if (!enabled || disabled || !audioRef.current) return;

		const audio = audioRef.current;
		audio.volume = volume;

		const tryPlay = async () => {
			try {
				await audio.play();
				cleanup();
			} catch {
				// Browser blocked autoplay
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

	// Play/pause on disable toggle
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
			<audio ref={audioRef} src={currentTrack.src} preload="auto" />
			<button
				type="button"
				className={`roleplay-audio-drawer-tab${drawerOpen ? ' open' : ''}`}
				onClick={() => setDrawerOpen((v) => !v)}
				title={drawerOpen ? 'Masquer le lecteur' : 'Afficher le lecteur'}
				aria-label="Toggle music player"
			>
				{drawerOpen ? '▶' : '◀'}
			</button>
			<div
				className={`roleplay-audio-controls roleplay-audio-drawer${drawerOpen ? ' open' : ''}`}
				data-tutorial="audio-controls"
				onMouseEnter={() => setHovering(true)}
				onMouseLeave={() => setHovering(false)}
			>
				<div className="audio-track-info">
					<span className="audio-track-title">{currentTrack.title}</span>
					{hovering && duration > 0 && (
						<span className="audio-track-time">
							{formatTime(currentTime)} / {formatTime(duration)}
						</span>
					)}
				</div>
				<div className="audio-controls-row">
					<button
						type="button"
						className="audio-btn"
						onClick={prevTrack}
						title="Précédent"
					>
						⏮
					</button>
					<button
						type="button"
						className="audio-btn"
						onClick={() => setDisabled(prev => !prev)}
						title={disabled ? 'Lecture' : 'Pause'}
					>
						{disabled ? '▶' : '⏸'}
					</button>
					<button
						type="button"
						className="audio-btn"
						onClick={nextTrack}
						title="Suivant"
					>
						⏭
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
			</div>
		</>
	);
}

export function RoleplayShell({ children }: RoleplayShellProps) {
	return (
		<>
			<RoleplayAudio enabled={true} />
			{children}
		</>
	);
}
