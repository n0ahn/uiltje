// Small synthesized sound effects (PLAN §8): WebAudio only, no files. Soft, tactile and cozy, muted by the sound setting.
// Clicks are a short burst of filtered noise plus a tiny wooden "body" thump (like a soft keyboard key), not a beep.
// Rewards use bell-like plinks (a sine with a quiet inharmonic overtone, like a glockenspiel or a marimba).
// Browsers only allow audio after a user gesture; every call here happens inside a click or key handler.
import { settings } from '../state/settings.svelte';

export type SfxKind = 'correct' | 'wrong' | 'block' | 'pass' | 'click' | 'open';

type Tone = { kind: 'tone'; freq: number; at: number; dur: number; gain: number; slideTo?: number; bell?: boolean; type?: OscillatorType };
type Noise = { kind: 'noise'; at: number; dur: number; gain: number; filter: BiquadFilterType; freq: number; q?: number };
type Part = Tone | Noise;

const tone = (freq: number, at: number, dur: number, gain: number, extra: Partial<Tone> = {}): Tone => ({ kind: 'tone', freq, at, dur, gain, ...extra });
const noise = (at: number, dur: number, gain: number, filter: BiquadFilterType, freq: number, q = 1): Noise => ({ kind: 'noise', at, dur, gain, filter, freq, q });

const SOUNDS: Record<SfxKind, readonly Part[]> = {
	// A soft "tock": a tiny noise tick on top of a short low thump.
	click: [noise(0, 0.014, 0.5, 'bandpass', 2600, 0.9), tone(190, 0, 0.05, 0.16, { slideTo: 105 })],
	// A little bubble pop for menus and switches.
	open: [noise(0, 0.01, 0.3, 'bandpass', 3200, 1), tone(420, 0, 0.09, 0.12, { slideTo: 860 })],
	// Two bright plinks, going up.
	correct: [tone(784, 0, 0.32, 0.17, { bell: true }), tone(1175, 0.075, 0.42, 0.15, { bell: true })],
	// A soft wooden "bonk", never a buzzer.
	wrong: [noise(0, 0.02, 0.35, 'lowpass', 900, 0.7), tone(176, 0, 0.18, 0.22, { slideTo: 120 })],
	// A block is done: a rising three-note plink.
	block: [tone(659, 0, 0.35, 0.16, { bell: true }), tone(784, 0.1, 0.35, 0.16, { bell: true }), tone(1047, 0.2, 0.6, 0.17, { bell: true })],
	// A passed test: a small sparkling run.
	pass: [
		tone(523, 0, 0.4, 0.15, { bell: true }),
		tone(659, 0.11, 0.4, 0.15, { bell: true }),
		tone(784, 0.22, 0.4, 0.15, { bell: true }),
		tone(1047, 0.33, 0.45, 0.16, { bell: true }),
		tone(1319, 0.46, 0.9, 0.17, { bell: true })
	]
};

// Kinds that play very often get a tiny random pitch change, so they never sound like a machine.
const VARIATION: Partial<Record<SfxKind, number>> = { click: 0.07, open: 0.05, wrong: 0.03 };

let context: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function audio(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (context) return context;
	const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!Ctor) return null;
	try {
		context = new Ctor();
	} catch {
		context = null;
	}
	return context;
}

function noiseSource(ctx: AudioContext): AudioBufferSourceNode {
	if (!noiseBuffer) {
		noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
		const data = noiseBuffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	}
	const source = ctx.createBufferSource();
	source.buffer = noiseBuffer;
	return source;
}

/** A fast attack and an exponential fade, so nothing ever clicks or pops by accident. */
function envelope(gain: GainNode, t0: number, dur: number, peak: number, attack: number) {
	gain.gain.setValueAtTime(0.0001, t0);
	gain.gain.linearRampToValueAtTime(peak, t0 + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

export function playSfx(kind: SfxKind): void {
	if (!settings.value.sound.enabled) return;
	const ctx = audio();
	if (!ctx) return;
	void ctx.resume().catch(() => {});
	const start = ctx.currentTime + 0.005;
	const vary = 1 + ((Math.random() * 2 - 1) * (VARIATION[kind] ?? 0));

	for (const part of SOUNDS[kind]) {
		const t0 = start + part.at;
		const t1 = t0 + part.dur;
		const gain = ctx.createGain();
		gain.connect(ctx.destination);

		if (part.kind === 'noise') {
			const source = noiseSource(ctx);
			const filter = ctx.createBiquadFilter();
			filter.type = part.filter;
			filter.frequency.value = part.freq * vary;
			filter.Q.value = part.q ?? 1;
			envelope(gain, t0, part.dur, part.gain, 0.0015);
			source.connect(filter).connect(gain);
			source.start(t0);
			source.stop(t1 + 0.02);
			continue;
		}

		const osc = ctx.createOscillator();
		osc.type = part.type ?? 'sine';
		osc.frequency.setValueAtTime(part.freq * vary, t0);
		if (part.slideTo) osc.frequency.exponentialRampToValueAtTime(part.slideTo * vary, t1);
		envelope(gain, t0, part.dur, part.gain, part.bell ? 0.004 : 0.003);
		osc.connect(gain);
		osc.start(t0);
		osc.stop(t1 + 0.02);

		if (part.bell) {
			// The quiet, quickly fading overtone is what makes it sound like a little bell.
			const over = ctx.createOscillator();
			const overGain = ctx.createGain();
			over.type = 'sine';
			over.frequency.value = part.freq * 2.76 * vary;
			envelope(overGain, t0, part.dur * 0.35, part.gain * 0.22, 0.003);
			over.connect(overGain).connect(ctx.destination);
			over.start(t0);
			over.stop(t0 + part.dur * 0.35 + 0.02);
		}
	}
}
