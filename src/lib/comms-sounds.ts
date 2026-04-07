/**
 * Synthesised audio cues for /comms.
 *
 * Two sounds, both generated at runtime via the Web Audio API so we don't
 * have to ship binary asset files:
 *  - playNotification(): a soft two-tone "ping" for any new message
 *  - playRadioPing(): a radio static crackle followed by a sharper alert
 *    tone, used when the viewer is mentioned (@-pinged)
 *
 * The mute state is persisted in localStorage and shared across tabs.
 */

const MUTE_KEY = 'comms.sounds.muted';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!audioCtx) {
		try {
			audioCtx = new (window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext)();
		} catch {
			return null;
		}
	}
	// Browsers suspend the context until a user gesture; resume() is a no-op
	// once it's running.
	if (audioCtx && audioCtx.state === 'suspended') {
		audioCtx.resume().catch(() => {});
	}
	return audioCtx;
}

export function isCommsMuted(): boolean {
	if (typeof window === 'undefined') return true;
	return window.localStorage.getItem(MUTE_KEY) === '1';
}

export function setCommsMuted(v: boolean): void {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(MUTE_KEY, v ? '1' : '0');
	// Let other tabs/components react.
	window.dispatchEvent(new CustomEvent('comms-mute-change', { detail: v }));
}

export function playNotification(): void {
	if (isCommsMuted()) return;
	const ctx = getCtx();
	if (!ctx) return;
	const now = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(880, now);
	osc.frequency.exponentialRampToValueAtTime(523, now + 0.16);
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
	osc.connect(gain).connect(ctx.destination);
	osc.start(now);
	osc.stop(now + 0.25);
}

export function playRadioPing(): void {
	if (isCommsMuted()) return;
	const ctx = getCtx();
	if (!ctx) return;
	const now = ctx.currentTime;

	// 1) Short white-noise burst, band-pass filtered → radio static.
	const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.22, ctx.sampleRate);
	const data = noiseBuffer.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	const noise = ctx.createBufferSource();
	noise.buffer = noiseBuffer;
	const noiseGain = ctx.createGain();
	noiseGain.gain.setValueAtTime(0.0001, now);
	noiseGain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
	noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
	const filter = ctx.createBiquadFilter();
	filter.type = 'bandpass';
	filter.frequency.value = 2200;
	filter.Q.value = 1.4;
	noise.connect(filter).connect(noiseGain).connect(ctx.destination);
	noise.start(now);
	noise.stop(now + 0.22);

	// 2) Sharper alert chirp following the static.
	const osc = ctx.createOscillator();
	const oscGain = ctx.createGain();
	osc.type = 'square';
	osc.frequency.setValueAtTime(1320, now + 0.18);
	osc.frequency.exponentialRampToValueAtTime(1760, now + 0.32);
	oscGain.gain.setValueAtTime(0.0001, now + 0.18);
	oscGain.gain.exponentialRampToValueAtTime(0.1, now + 0.2);
	oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
	osc.connect(oscGain).connect(ctx.destination);
	osc.start(now + 0.18);
	osc.stop(now + 0.4);
}
