// Small synthesized sound effects (PLAN §8): WebAudio only, no files. Warm, round and quiet, muted by the sound setting.
// Everything goes through one soft low-pass filter, so nothing is ever hissy or sharp.
// Clicks are a short wooden "tock" (a falling sine, like tapping a wooden block), rewards are marimba or kalimba-like plinks.
// Browsers only allow audio after a user gesture; every call here happens inside a click or key handler.
import { settings } from '../state/settings.svelte';

export type SfxKind = 'correct' | 'wrong' | 'block' | 'pass' | 'click' | 'open';

/** `over` adds a quiet, quickly fading overtone at that frequency ratio: it is what makes a plink sound wooden or bell-like. */
type Tone = { kind: 'tone'; freq: number; at: number; dur: number; gain: number; slideTo?: number; over?: number };
type Noise = { kind: 'noise'; at: number; dur: number; gain: number; freq: number };
type Part = Tone | Noise;

const tone = (freq: number, at: number, dur: number, gain: number, extra: Partial<Tone> = {}): Tone => ({ kind: 'tone', freq, at, dur, gain, ...extra });
const noise = (at: number, dur: number, gain: number, freq: number): Noise => ({ kind: 'noise', at, dur, gain, freq });

// Pentatonic notes (C D E G A), so every combination sounds friendly.
const SOUNDS: Record<SfxKind, readonly Part[]> = {
	// A wooden "tock": a quick falling pitch with a soft overtone and a barely audible tap at the start.
	click: [noise(0, 0.006, 0.1, 1500), tone(310, 0, 0.07, 0.2, { slideTo: 150, over: 2 })],
	// A small round "bloop" for menus and switches.
	open: [tone(340, 0, 0.1, 0.16, { slideTo: 560 }), tone(680, 0, 0.06, 0.04, { slideTo: 1000 })],
	// Two kalimba plinks, going up.
	correct: [tone(784, 0, 0.3, 0.2, { over: 4 }), tone(1175, 0.08, 0.4, 0.17, { over: 4 })],
	// A soft, low thud. Not a buzzer, never harsh.
	wrong: [tone(165, 0, 0.2, 0.26, { slideTo: 110 }), tone(330, 0, 0.08, 0.05, { slideTo: 220 })],
	// A block is done: a rising three-note plink.
	block: [tone(523, 0, 0.35, 0.18, { over: 4 }), tone(659, 0.1, 0.35, 0.18, { over: 4 }), tone(784, 0.2, 0.55, 0.19, { over: 4 })],
	// A passed test: a small run up the scale.
	pass: [
		tone(523, 0, 0.4, 0.17, { over: 4 }),
		tone(587, 0.11, 0.4, 0.17, { over: 4 }),
		tone(659, 0.22, 0.4, 0.17, { over: 4 }),
		tone(784, 0.33, 0.45, 0.18, { over: 4 }),
		tone(1047, 0.46, 0.9, 0.19, { over: 4 })
	]
};

// Kinds that play very often get a tiny random pitch change, so they never sound like a machine.
const VARIATION: Partial<Record<SfxKind, number>> = { click: 0.06, open: 0.04, wrong: 0.03 };

let context: AudioContext | null = null;
let master: AudioNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function audio(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (context) return context;
	const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!Ctor) return null;
	try {
		context = new Ctor();
		// One warm low-pass for everything, then a gentle limiter.
		const soften = context.createBiquadFilter();
		soften.type = 'lowpass';
		soften.frequency.value = 4200;
		soften.Q.value = 0.5;
		const limiter = context.createDynamicsCompressor();
		limiter.threshold.value = -14;
		limiter.ratio.value = 6;
		soften.connect(limiter).connect(context.destination);
		master = soften;
	} catch {
		context = null;
		master = null;
	}
	return context;
}

function noiseSource(ctx: AudioContext): AudioBufferSourceNode {
	if (!noiseBuffer) {
		noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
		const data = noiseBuffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	}
	const source = ctx.createBufferSource();
	source.buffer = noiseBuffer;
	return source;
}

/** A fast attack and an exponential fade, so nothing ever pops by accident. */
function envelope(gain: GainNode, t0: number, dur: number, peak: number, attack: number) {
	gain.gain.setValueAtTime(0.0001, t0);
	gain.gain.linearRampToValueAtTime(peak, t0 + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

export function playSfx(kind: SfxKind): void {
	if (!settings.value.sound.enabled) return;
	const ctx = audio();
	if (!ctx || !master) return;
	void ctx.resume().catch(() => {});
	const start = ctx.currentTime + 0.005;
	const vary = 1 + (Math.random() * 2 - 1) * (VARIATION[kind] ?? 0);

	for (const part of SOUNDS[kind]) {
		const t0 = start + part.at;
		const t1 = t0 + part.dur;
		const gain = ctx.createGain();
		gain.connect(master);

		if (part.kind === 'noise') {
			const source = noiseSource(ctx);
			const filter = ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.value = part.freq;
			envelope(gain, t0, part.dur, part.gain, 0.001);
			source.connect(filter).connect(gain);
			source.start(t0);
			source.stop(t1 + 0.02);
			continue;
		}

		const osc = ctx.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(part.freq * vary, t0);
		if (part.slideTo) osc.frequency.exponentialRampToValueAtTime(part.slideTo * vary, t1);
		envelope(gain, t0, part.dur, part.gain, 0.004);
		osc.connect(gain);
		osc.start(t0);
		osc.stop(t1 + 0.02);

		if (part.over) {
			const over = ctx.createOscillator();
			const overGain = ctx.createGain();
			over.type = 'sine';
			over.frequency.setValueAtTime(part.freq * part.over * vary, t0);
			if (part.slideTo) over.frequency.exponentialRampToValueAtTime(part.slideTo * part.over * vary, t1);
			envelope(overGain, t0, part.dur * 0.4, part.gain * 0.2, 0.003);
			over.connect(overGain).connect(master);
			over.start(t0);
			over.stop(t0 + part.dur * 0.4 + 0.02);
		}
	}
}
