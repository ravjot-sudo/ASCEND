// Generative WebAudio EP: every note is synthesised live, nothing is downloaded (P29).
import { signal } from "./signal";

export type Track = { title: string; side: string; bpm: number; root: number; key: string; scale: number[]; wave: OscillatorType };
export const TRACKS: Track[] = [
  { title: "Undertow", side: "I", bpm: 84, root: 45, key: "A minor", scale: [0, 3, 5, 7, 10], wave: "sawtooth" },
  { title: "Salt Choir", side: "II", bpm: 72, root: 50, key: "D dorian", scale: [0, 2, 3, 7, 9], wave: "triangle" },
  { title: "Low Water", side: "III", bpm: 100, root: 41, key: "F minor", scale: [0, 3, 7, 8, 10], wave: "square" },
  { title: "Riptide Hymn", side: "IV", bpm: 120, root: 48, key: "C major", scale: [0, 2, 4, 7, 9], wave: "sawtooth" },
];

type State = { playing: boolean; index: number };
let state: State = { playing: false, index: 0 };
const subs = new Set<() => void>();
const set = (s: Partial<State>) => { state = { ...state, ...s }; subs.forEach((f) => f()); };
export const audioStore = { get: () => state, subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; } };

let ctx: AudioContext | null = null, master: GainNode, noise: AudioBuffer;
let timer = 0, next = 0, step = 0, pausedAt = 0;
let startedAt: number | null = null; // AudioContext time the current track began (null = not started; 0 is a valid time)
let analyser: AnalyserNode | null = null;
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

function init() {
  const c = (ctx = new AudioContext());
  master = c.createGain(); master.gain.value = 0;
  const an = (analyser = c.createAnalyser()); an.fftSize = 256; an.smoothingTimeConstant = 0.8;
  master.connect(c.createDynamicsCompressor()).connect(an).connect(c.destination);
  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const bins = new Uint8Array(an.frequencyBinCount);
  const loop = () => {
    an.getByteFrequencyData(bins);
    let s = 0, b = 0; for (let i = 0; i < bins.length; i++) { s += bins[i]; if (i < 6) b += bins[i]; }
    signal.level += (Math.min(1, s / bins.length / 110) - signal.level) * 0.15;
    signal.bass += (b / 6 / 255 - signal.bass) * 0.25;
    requestAnimationFrame(loop);
  };
  loop();
}

function env(g: GainNode, t: number, a: number, peak: number, r: number) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + r);
}
function voice(type: OscillatorType, f: number, t: number, dur: number, peak: number, cutoff = 2400, detune = 0, attack = 0.01) {
  const c = ctx!, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
  o.type = type; o.frequency.value = f; o.detune.value = detune; lp.frequency.value = cutoff;
  env(g, t, attack, peak, dur); o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t + attack + dur + 0.05);
}
function kick(t: number) {
  const c = ctx!, o = c.createOscillator(), g = c.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  env(g, t, 0.004, 0.9, 0.35); o.connect(g).connect(master); o.start(t); o.stop(t + 0.4);
}
function hat(t: number, peak = 0.1) {
  const c = ctx!, s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise; hp.type = "highpass"; hp.frequency.value = 7000;
  env(g, t, 0.002, peak, 0.05); s.connect(hp).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + 0.08);
}

function play(s: number, t: number) {
  const tr = TRACKS[state.index], sc = tr.scale, beat = 60 / tr.bpm;
  const n = (k: number) => tr.root + sc[((k % sc.length) + sc.length) % sc.length] + 12 * Math.floor(k / sc.length);
  const deg = [0, 0, 3, 2][(s >> 5) % 4];
  if (s % 4 === 0 && (tr.bpm > 80 || s % 8 === 0)) kick(t);
  if (s % 4 === 2) hat(t);
  if (tr.bpm >= 100 && s % 2 === 1) hat(t, 0.04);
  if (s % 8 === 0) voice(tr.wave, hz(n(deg + [0, 0, 1, -1][(s >> 3) % 4]) - 12), t, beat * 1.6, 0.22, 420);
  if (s % 32 === 0) for (const k of [0, 2, 4]) for (const d of [-8, 8]) voice("sawtooth", hz(n(deg + k) + 12), t, beat * 8, 0.03, 1100, d, beat * 2);
  if (Math.random() < 0.28) voice("triangle", hz(n(deg + Math.floor(Math.random() * 8)) + 12), t, beat * 0.6, 0.07, 3200);
}
function tick() {
  const dt = 60 / TRACKS[state.index].bpm / 4;
  while (next < ctx!.currentTime + 0.12) { play(step, next); next += dt; step++; }
}

export async function playTrack(i = state.index) {
  if (!ctx) init();
  await ctx!.resume();
  const now = ctx!.currentTime;
  if (i !== state.index || startedAt === null) startedAt = now; else if (!state.playing) startedAt += now - pausedAt;
  if (i !== state.index || !timer) { step = 0; next = now + 0.06; }
  set({ index: i, playing: true });
  master.gain.setTargetAtTime(0.5, ctx!.currentTime, 0.3);
  if (!timer) timer = window.setInterval(tick, 25);
}
export function pause() {
  if (!ctx) return;
  pausedAt = ctx.currentTime; master.gain.setTargetAtTime(0, ctx.currentTime, 0.12); clearInterval(timer); timer = 0; set({ playing: false });
}
export const toggle = () => (state.playing ? pause() : playTrack());
export const nextTrack = () => playTrack((state.index + 1) % TRACKS.length);
export const prevTrack = () => playTrack((state.index + TRACKS.length - 1) % TRACKS.length);
/** Seconds into the current track (frozen while paused). */
export const elapsed = () => (ctx && startedAt !== null ? (state.playing ? ctx.currentTime : pausedAt) - startedAt : 0);
/** Copies the live spectrum (0–255 per bin) into `out`; returns false before the engine starts. */
export const readWave = (out: Uint8Array<ArrayBuffer>) => { if (!analyser) return false; analyser.getByteFrequencyData(out); return true; };
