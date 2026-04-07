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

/**
 * Master output bus — feeds the destination with a slight compressor so peaks
 * don't clip when noise + tones overlap.
 */
function getMasterBus(ctx: AudioContext): AudioNode {
	const comp = ctx.createDynamicsCompressor();
	comp.threshold.value = -10;
	comp.knee.value = 18;
	comp.ratio.value = 4;
	comp.attack.value = 0.003;
	comp.release.value = 0.12;
	comp.connect(ctx.destination);
	return comp;
}

/**
 * playNotification — short two-beep military terminal "blip-blip" for any new
 * message. Square wave through a band-pass for that vintage radio character.
 */
export function playNotification(): void {
	if (isCommsMuted()) return;
	const ctx = getCtx();
	if (!ctx) return;
	const now = ctx.currentTime;
	const out = getMasterBus(ctx);

	// Band-pass filter to give the square wave a "speaker through a radio"
	// timbre rather than a harsh PC beep.
	const bp = ctx.createBiquadFilter();
	bp.type = 'bandpass';
	bp.frequency.value = 1500;
	bp.Q.value = 2.5;
	bp.connect(out);

	const beep = (offset: number) => {
		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = 'square';
		osc.frequency.setValueAtTime(1400, now + offset);
		g.gain.setValueAtTime(0.0001, now + offset);
		g.gain.exponentialRampToValueAtTime(0.45, now + offset + 0.005);
		g.gain.setValueAtTime(0.45, now + offset + 0.06);
		g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.09);
		osc.connect(g).connect(bp);
		osc.start(now + offset);
		osc.stop(now + offset + 0.1);
	};

	beep(0);
	beep(0.13);
}

/**
 * playRadioPing — handheld military radio sequence for @-mentions:
 *   1. Squelch-open click (very short noise burst)
 *   2. Loud static carrier (~0.35s)
 *   3. Clear two-tone alert chirp riding over the tail of the static
 *   4. Squelch-close click
 * Significantly louder than playNotification — this is meant to grab attention.
 */
export function playRadioPing(): void {
	if (isCommsMuted()) return;
	const ctx = getCtx();
	if (!ctx) return;
	const now = ctx.currentTime;
	const out = getMasterBus(ctx);

	// ---- Squelch-open click ----
	const click1 = ctx.createBufferSource();
	const clickBuf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
	const cdata = clickBuf.getChannelData(0);
	for (let i = 0; i < cdata.length; i++) {
		cdata[i] = (Math.random() * 2 - 1) * (1 - i / cdata.length);
	}
	click1.buffer = clickBuf;
	const clickGain = ctx.createGain();
	clickGain.gain.value = 0.55;
	click1.connect(clickGain).connect(out);
	click1.start(now);

	// ---- Static carrier ----
	const noiseDur = 0.45;
	const noiseBuffer = ctx.createBuffer(
		1,
		Math.floor(ctx.sampleRate * noiseDur),
		ctx.sampleRate,
	);
	const ndata = noiseBuffer.getChannelData(0);
	for (let i = 0; i < ndata.length; i++) ndata[i] = Math.random() * 2 - 1;
	const noise = ctx.createBufferSource();
	noise.buffer = noiseBuffer;
	const noiseFilter = ctx.createBiquadFilter();
	noiseFilter.type = 'bandpass';
	noiseFilter.frequency.value = 1800;
	noiseFilter.Q.value = 0.9;
	const noiseGain = ctx.createGain();
	noiseGain.gain.setValueAtTime(0.0001, now + 0.02);
	noiseGain.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
	noiseGain.gain.setValueAtTime(0.35, now + 0.32);
	noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
	noise.connect(noiseFilter).connect(noiseGain).connect(out);
	noise.start(now + 0.02);
	noise.stop(now + 0.02 + noiseDur);

	// ---- Two-tone alert chirp (rides on top of the static) ----
	const toneStart = now + 0.12;
	const tone1 = ctx.createOscillator();
	const tone1Gain = ctx.createGain();
	tone1.type = 'square';
	tone1.frequency.setValueAtTime(1100, toneStart);
	tone1Gain.gain.setValueAtTime(0.0001, toneStart);
	tone1Gain.gain.exponentialRampToValueAtTime(0.4, toneStart + 0.01);
	tone1Gain.gain.setValueAtTime(0.4, toneStart + 0.11);
	tone1Gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.13);
	const toneFilter = ctx.createBiquadFilter();
	toneFilter.type = 'bandpass';
	toneFilter.frequency.value = 1400;
	toneFilter.Q.value = 1.8;
	tone1.connect(tone1Gain).connect(toneFilter).connect(out);
	tone1.start(toneStart);
	tone1.stop(toneStart + 0.14);

	const tone2Start = toneStart + 0.16;
	const tone2 = ctx.createOscillator();
	const tone2Gain = ctx.createGain();
	tone2.type = 'square';
	tone2.frequency.setValueAtTime(1650, tone2Start);
	tone2Gain.gain.setValueAtTime(0.0001, tone2Start);
	tone2Gain.gain.exponentialRampToValueAtTime(0.4, tone2Start + 0.01);
	tone2Gain.gain.setValueAtTime(0.4, tone2Start + 0.13);
	tone2Gain.gain.exponentialRampToValueAtTime(0.0001, tone2Start + 0.16);
	tone2.connect(tone2Gain).connect(toneFilter);
	tone2.start(tone2Start);
	tone2.stop(tone2Start + 0.17);

	// ---- Squelch-close click ----
	const click2 = ctx.createBufferSource();
	click2.buffer = clickBuf;
	const click2Gain = ctx.createGain();
	click2Gain.gain.value = 0.5;
	click2.connect(click2Gain).connect(out);
	click2.start(now + 0.5);
}
