// Step sequencer, rebuilt from the reference's observed behaviour with our own code, kits and sounds:
// one kit per track, 4 patterns x rows x 16 steps; a 25 ms scheduler with a 120 ms lookahead; with Follow on the
// patterns chain 1 -> 4 and the view follows the playhead, otherwise the selected pattern loops; a pattern picked
// while playing is queued for the next bar; choke rows cut their previous voice; edits persist locally and a share
// link encodes the kit in the URL. Every sound is synthesised here; nothing is sampled.
import { audioStore, pause as pauseMusic } from "./audio";

type Voice = "kick" | "clap" | "hat" | "openhat" | "rim" | "bass" | "sub" | "pluck" | "lead" | "pad" | "riser";
type Row = { label: string; voice: Voice; choke?: boolean; deg?: number[]; original: number[][] };
export type Kit = { slug: string; title: string; bpm: number; root: number; scale: number[]; gain: number; rows: Row[] };

const four = (...s: number[]) => [s, s, s, s];
export const KITS: Kit[] = [
  {
    slug: "undertow", title: "Undertow", bpm: 84, root: 45, scale: [0, 3, 5, 7, 10], gain: 0.9,
    rows: [
      { label: "Kick", voice: "kick", original: [[1, 9], [1, 9, 11], [1, 9], [1, 9, 13]] },
      { label: "Rim", voice: "rim", original: four(5, 13) },
      { label: "Hat", voice: "hat", original: four(3, 7, 11, 15) },
      { label: "Bass", voice: "bass", choke: true, deg: [0, 0, 0, 0, 0, 0, 3, 3, 2, 2, 2, 2, 1, 1, 0, 0], original: [[1, 7], [1, 9], [1, 7, 13], [1, 9, 15]] },
      { label: "Pluck", voice: "pluck", deg: [4, 2, 3, 1, 4, 2, 3, 0, 4, 2, 3, 1, 5, 4, 3, 2], original: [[3, 6], [11], [3, 6, 14], []] },
      { label: "Pad", voice: "pad", choke: true, deg: Array(16).fill(0), original: [[1], [], [1], []] },
      { label: "Undertow", voice: "riser", choke: true, original: [[], [], [], [13]] },
    ],
  },
  {
    slug: "salt-choir", title: "Salt Choir", bpm: 72, root: 50, scale: [0, 2, 3, 7, 9], gain: 0.85,
    rows: [
      { label: "Kick", voice: "kick", original: four(1, 11) },
      { label: "Snap", voice: "clap", original: four(9) },
      { label: "Shaker", voice: "hat", original: four(1, 3, 5, 7, 9, 11, 13, 15) },
      { label: "Choir", voice: "pad", choke: true, deg: Array(16).fill(0), original: [[1], [1], [1], [1]] },
      { label: "Bell", voice: "pluck", deg: [0, 2, 4, 2, 3, 2, 1, 0, 4, 3, 2, 1, 0, 1, 2, 4], original: [[1, 4, 7], [], [9, 12], [1, 15]] },
      { label: "Sub", voice: "sub", choke: true, deg: Array(16).fill(0), original: [[1], [9], [1], []] },
    ],
  },
  {
    slug: "low-water", title: "Low Water", bpm: 100, root: 41, scale: [0, 3, 7, 8, 10], gain: 0.8,
    rows: [
      { label: "Kick", voice: "kick", original: four(1, 5, 9, 13) },
      { label: "Clap", voice: "clap", original: four(5, 13) },
      { label: "Hat", voice: "hat", original: four(3, 7, 11, 15) },
      { label: "Open Hat", voice: "openhat", original: [[], [15], [], [7, 15]] },
      { label: "Bass", voice: "bass", choke: true, deg: [0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 4, 4, 2, 2], original: four(3, 7, 11, 15) },
      { label: "Stab", voice: "lead", choke: true, deg: [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 1, 1, 1, 1], original: [[15], [7], [15], [7]] },
      { label: "Low Water", voice: "riser", choke: true, original: [[], [], [], [9]] },
    ],
  },
  {
    slug: "riptide-hymn", title: "Riptide Hymn", bpm: 120, root: 48, scale: [0, 2, 4, 7, 9], gain: 0.75,
    rows: [
      { label: "Kick", voice: "kick", original: four(1, 5, 9, 13) },
      { label: "Clap", voice: "clap", original: four(5, 13) },
      { label: "Hat", voice: "hat", original: four(3, 7, 11, 15) },
      { label: "Bass", voice: "bass", choke: true, deg: [0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 2, 2, 2, 2], original: four(3, 7, 11, 15) },
      { label: "Lead", voice: "lead", choke: true, deg: [4, 4, 3, 3, 2, 2, 4, 4, 5, 5, 4, 4, 3, 3, 2, 2], original: [[1, 5, 9, 13], [1, 5, 9, 13], [1, 5, 9, 13, 15], [1, 5, 9]] },
      { label: "Hymn Pad", voice: "pad", choke: true, deg: Array(16).fill(0), original: [[15], [], [], []] },
      { label: "Riptide", voice: "riser", choke: true, original: [[], [], [], [15]] },
    ],
  },
];

// ---------- state ----------
type Grid = boolean[][]; // [row][step]
type Head = { pattern: number; step: number } | null;
type State = { kit: number; grids: Grid[][]; pattern: number[]; playing: boolean; follow: boolean; head: Head; queued: number | null; clip: (Grid | null)[]; copied: boolean };

const blank = (k: Kit): Grid[] => Array.from({ length: 4 }, () => k.rows.map(() => Array(16).fill(false)));
const original = (k: Kit): Grid[] => Array.from({ length: 4 }, (_, p) => k.rows.map((r) => { const g = Array(16).fill(false); r.original[p].forEach((s) => (g[s - 1] = true)); return g; }));
const fresh = (): State => ({ kit: 0, grids: KITS.map(original), pattern: KITS.map(() => 0), playing: false, follow: true, head: null, queued: null, clip: KITS.map(() => null), copied: false });

let state: State = fresh();
const SERVER = fresh();
const subs = new Set<() => void>();
const KEY = "undertow:sequencer:1";
let saveTimer = 0;
function set(s: Partial<State>, persist = false) {
  state = { ...state, ...s };
  subs.forEach((f) => f());
  if (persist && typeof window !== "undefined") {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify({ kit: state.kit, grids: state.grids, pattern: state.pattern, follow: state.follow })); } catch {}
    }, 400);
  }
}
export const seq = { get: () => state, server: () => SERVER, subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; } };

/** Restore saved edits, then apply a shared kit from the URL (?k=<kit>&s=<code>) if present. Call once on mount. */
export function hydrate() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && Array.isArray(saved.grids) && saved.grids.length === KITS.length) set({ kit: saved.kit ?? 0, grids: saved.grids, pattern: saved.pattern ?? state.pattern, follow: saved.follow ?? true });
  } catch {}
  const q = new URLSearchParams(location.search), k = Number(q.get("k")), code = q.get("s");
  if (code && KITS[k]) {
    const grids = decode(code, KITS[k]);
    if (grids) { const all = [...state.grids]; all[k] = grids; set({ kit: k, grids: all }, true); }
  }
}

// ---------- share codes: the kit's 4 x rows x 16 steps as bits, base64url ----------
function encode(grids: Grid[]) {
  const bits = grids.flat(2), bytes = new Uint8Array(Math.ceil(bits.length / 8));
  bits.forEach((b, i) => { if (b) bytes[i >> 3] |= 128 >> (i & 7); });
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decode(code: string, k: Kit): Grid[] | null {
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (code.length % 4)) % 4));
    const at = (i: number) => ((bin.charCodeAt(i >> 3) || 0) & (128 >> (i & 7))) !== 0;
    let i = 0;
    return Array.from({ length: 4 }, () => k.rows.map(() => Array.from({ length: 16 }, () => at(i++))));
  } catch { return null; }
}
export function shareUrl() { return `${location.origin}/sequencer?k=${state.kit}&s=${encode(state.grids[state.kit])}`; }

// ---------- sound: our own synth voices ----------
let ctx: AudioContext | null = null, out: GainNode, kitGain: GainNode, noise: AudioBuffer;
const live = new Set<AudioScheduledSourceNode>();
let chokes: (AudioScheduledSourceNode[] | null)[] = [];
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

function audio() {
  if (ctx) return ctx;
  const c = (ctx = new AudioContext());
  out = c.createGain(); out.gain.value = 0.8;
  kitGain = c.createGain(); kitGain.gain.value = KITS[state.kit].gain;
  kitGain.connect(c.createDynamicsCompressor()).connect(out).connect(c.destination);
  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return c;
}
function env(g: GainNode, t: number, a: number, peak: number, r: number) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + r);
}
function osc(type: OscillatorType, f: number, t: number, dur: number, peak: number, cutoff = 4000, a = 0.005, detune = 0) {
  const c = ctx!, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
  o.type = type; o.frequency.value = f; o.detune.value = detune; lp.frequency.value = cutoff;
  env(g, t, a, peak, dur); o.connect(lp).connect(g).connect(kitGain); o.start(t); o.stop(t + a + dur + 0.05);
  return o;
}
function burst(t: number, type: BiquadFilterType, f: number, dur: number, peak: number, q = 0.7) {
  const c = ctx!, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise; bp.type = type; bp.frequency.value = f; bp.Q.value = q;
  env(g, t, 0.002, peak, dur); s.connect(bp).connect(g).connect(kitGain); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  return s;
}
function voice(k: Kit, r: Row, step: number, t: number): AudioScheduledSourceNode[] {
  const note = (oct: number) => k.root + 12 * oct + k.scale[((r.deg?.[step] ?? 0) % k.scale.length + k.scale.length) % k.scale.length];
  const beat = 60 / k.bpm;
  switch (r.voice) {
    case "kick": {
      const c = ctx!, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
      env(g, t, 0.003, 0.95, 0.38); o.connect(g).connect(kitGain); o.start(t); o.stop(t + 0.45);
      return [o];
    }
    case "clap": return [0, 0.012, 0.024].map((d, i) => burst(t + d, "bandpass", 1500, i === 2 ? 0.2 : 0.03, 0.5));
    case "hat": return [burst(t, "highpass", 8000, 0.045, 0.22)];
    case "openhat": return [burst(t, "highpass", 7000, 0.3, 0.18)];
    case "rim": return [osc("square", 1700, t, 0.03, 0.12, 3000), burst(t, "bandpass", 2500, 0.03, 0.25, 3)];
    case "bass": return [osc("sawtooth", hz(note(-1)), t, beat * 0.9, 0.3, 520)];
    case "sub": return [osc("sine", hz(note(-2)), t, beat * 2, 0.45, 800, 0.02)];
    case "pluck": return [osc("triangle", hz(note(1)), t, 0.35, 0.16, 3600), osc("sine", hz(note(2)), t, 0.2, 0.05)];
    case "lead": return [-7, 7].map((d) => osc("square", hz(note(1)), t, beat * 0.45, 0.06, 2400, 0.005, d));
    case "pad": return [0, 2, 4].flatMap((deg) => [-9, 9].map((d) => osc("sawtooth", hz(k.root + 12 + k.scale[deg % k.scale.length]), t, beat * 6, 0.025, 1100, beat, d)));
    case "riser": {
      const c = ctx!, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), len = beat * 2;
      s.buffer = noise; s.loop = true; bp.type = "bandpass"; bp.Q.value = 4;
      bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + len);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + len * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      s.connect(bp).connect(g).connect(kitGain); s.start(t); s.stop(t + len + 0.05);
      return [s];
    }
  }
}
function trigger(row: number, step: number, t: number) {
  const k = KITS[state.kit], r = k.rows[row];
  if (r.choke) chokes[row]?.forEach((n) => { try { n.stop(t); } catch {} });
  const nodes = voice(k, r, step, t);
  nodes.forEach((n) => { live.add(n); n.onended = () => live.delete(n); });
  if (r.choke) chokes[row] = nodes;
}

// ---------- transport ----------
let timer = 0, raf = 0, cursor = { pattern: 0, step: 0, time: 0 }, played: { pattern: number; step: number; time: number }[] = [];
function tick() {
  const c = ctx!, k = KITS[state.kit], dt = 60 / k.bpm / 4;
  while (cursor.time < c.currentTime + 0.12) {
    const g = state.grids[state.kit][cursor.pattern];
    g.forEach((row, ri) => { if (row[cursor.step]) trigger(ri, cursor.step, cursor.time); });
    played.push({ ...cursor });
    if (cursor.step < 15) cursor = { pattern: cursor.pattern, step: cursor.step + 1, time: cursor.time + dt };
    else {
      const q = state.queued;
      const next = q ?? (state.follow ? (cursor.pattern + 1) % 4 : state.pattern[state.kit]);
      if (q !== null) set({ queued: null });
      cursor = { pattern: next, step: 0, time: cursor.time + dt };
    }
  }
}
function follow() {
  const c = ctx!;
  let i = 0; while (i < played.length && played[i].time <= c.currentTime) i++;
  if (i) {
    const h = played[i - 1]; played = played.slice(i - 1);
    if (!state.head || h.step !== state.head.step || h.pattern !== state.head.pattern) {
      const pattern = state.follow ? state.pattern.map((p, ki) => (ki === state.kit ? h.pattern : p)) : state.pattern;
      set({ head: { pattern: h.pattern, step: h.step }, pattern });
    }
  }
  raf = requestAnimationFrame(follow);
}
export async function play() {
  if (state.playing) return;
  const c = audio(); await c.resume();
  if (audioStore.get().playing) pauseMusic(); // the record ducks out while the sequencer runs
  kitGain.gain.setValueAtTime(KITS[state.kit].gain, c.currentTime);
  chokes = []; played = [];
  cursor = { pattern: state.pattern[state.kit], step: 0, time: c.currentTime + 0.05 };
  set({ playing: true, queued: null });
  tick(); timer = window.setInterval(tick, 25); raf = requestAnimationFrame(follow);
}
export function stop() {
  clearInterval(timer); timer = 0; cancelAnimationFrame(raf);
  live.forEach((n) => { try { n.stop(); } catch {} }); live.clear(); chokes = []; played = [];
  set({ playing: false, head: null, queued: null });
}

// ---------- editing ----------
const withPattern = (fn: (g: Grid) => Grid) => {
  const grids = state.grids.map((kg, ki) => ki !== state.kit ? kg : kg.map((g, pi) => (pi === state.pattern[state.kit] ? fn(g) : g)));
  set({ grids }, true);
};
export function toggleStep(row: number, step: number) {
  const on = !state.grids[state.kit][state.pattern[state.kit]][row][step];
  withPattern((g) => g.map((r, ri) => (ri === row ? r.map((v, si) => (si === step ? on : v)) : r)));
  if (on && !state.playing) { const c = audio(); c.resume(); trigger(row, step, c.currentTime); }
}
export function preview(row: number) { const c = audio(); c.resume(); trigger(row, 0, c.currentTime); }
export function selectPattern(p: number) {
  set({ pattern: state.pattern.map((v, ki) => (ki === state.kit ? p : v)) }, true);
  if (state.playing && state.head?.pattern !== p) set({ queued: p });
}
export function selectKit(i: number) { if (i === state.kit) return; stop(); set({ kit: i, copied: false }, true); }
export function clearAll() { set({ grids: state.grids.map((g, ki) => (ki === state.kit ? blank(KITS[ki]) : g)) }, true); }
export function resetLoop() {
  stop();
  set({ grids: state.grids.map((g, ki) => (ki === state.kit ? original(KITS[ki]) : g)), pattern: state.pattern.map((p, ki) => (ki === state.kit ? 0 : p)) }, true);
}
export function copyPattern() { set({ clip: state.clip.map((c, ki) => (ki === state.kit ? state.grids[ki][state.pattern[ki]].map((r) => [...r]) : c)) }); }
export function pastePattern() { const c = state.clip[state.kit]; if (c) withPattern(() => c.map((r) => [...r])); }
export function toggleFollow() { set({ follow: !state.follow }, true); }
export function markCopied(v: boolean) { set({ copied: v }); }
