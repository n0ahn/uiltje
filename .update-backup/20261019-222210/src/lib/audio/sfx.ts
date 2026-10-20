// Small synthesized sound effects (PLAN §8): WebAudio only, no files. Calm and short, muted by the sound setting.
// Browsers only allow audio after a user gesture; every call here happens inside a click or key handler.
import { settings } from '../state/settings.svelte';

export type SfxKind = 'correct' | 'wrong' | 'block' | 'pass' | 'click' | 'open';

type Note = { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number; slideTo?: number };

const SOUNDS: Record<SfxKind, readonly Note[]> = {
	// Interface sounds: very short and quiet, they play on every button.
	click: [{ freq: 720, at: 0, dur: 0.05, type: 'triangle', gain: 0.035, slideTo: 540 }],
	open: [
		{ freq: 520, at: 0, dur: 0.05, gain: 0.03 },
		{ freq: 780, at: 0.04, dur: 0.07, gain: 0.03 }
	],
	correct: [
		{ freq: 660, at: 0, dur: 0.09 },
		{ freq: 880, at: 0.07, dur: 0.14 }
	],
	wrong: [{ freq: 260, at: 0, dur: 0.2, type: 'triangle', gain: 0.07, slideTo: 200 }],
	block: [
		{ freq: 523, at: 0, dur: 0.12 },
		{ freq: 659, at: 0.1, dur: 0.12 },
		{ freq: 784, at: 0.2, dur: 0.22 }
	],
	pass: [
		{ freq: 523, at: 0, dur: 0.14 },
		{ freq: 659, at: 0.13, dur: 0.14 },
		{ freq: 784, at: 0.26, dur: 0.14 },
		{ freq: 1047, at: 0.39, dur: 0.4 }
	]
};

let context: AudioContext | null = null;

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

export function playSfx(kind: SfxKind): void {
	if (!settings.value.sound.enabled) return;
	const ctx = audio();
	if (!ctx) return;
	void ctx.resume().catch(() => {});
	const start = ctx.currentTime + 0.01;
	for (const note of SOUNDS[kind]) {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const t0 = start + note.at;
		const t1 = t0 + note.dur;
		osc.type = note.type ?? 'sine';
		osc.frequency.setValueAtTime(note.freq, t0);
		if (note.slideTo) osc.frequency.linearRampToValueAtTime(note.slideTo, t1);
		gain.gain.setValueAtTime(0.0001, t0);
		gain.gain.linearRampToValueAtTime(note.gain ?? 0.06, t0 + 0.012);
		gain.gain.exponentialRampToValueAtTime(0.0001, t1);
		osc.connect(gain).connect(ctx.destination);
		osc.start(t0);
		osc.stop(t1 + 0.02);
	}
}