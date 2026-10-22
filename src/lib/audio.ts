// Background music streams four tracks from YouTube via the IFrame Player API; each side is its own
// video (played in a single hidden 1px embed, looped on end). Embed audio can't be tapped by
// WebAudio, so the spectrum the visuals read is drawn locally; it follows the play state rather
// than the real waveform (P29).
import { signal } from "./signal";

export type Track = { title: string; side: string; id: string };
export const TRACKS: Track[] = [
  { title: "ACENSION", side: "I", id: "MH_Pq3Vcdy4" },
  { title: "Circles", side: "II", id: "m__KXFoKkFk" },
  { title: "Twinflame", side: "III", id: "BBWytCRHYv0" },
  { title: "Forest Walk", side: "IV", id: "b2PKXIU3QpQ" },
];

type State = { playing: boolean; index: number };
let state: State = { playing: false, index: 0 };
const subs = new Set<() => void>();
const set = (s: Partial<State>) => { state = { ...state, ...s }; subs.forEach((f) => f()); };
export const audioStore = { get: () => state, subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; } };

interface YTPlayer {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  setVolume(volume: number): void;
}
interface YTNamespace {
  Player: new (element: HTMLElement | string, options: {
    videoId: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: () => void;
      onStateChange?: (event: { data: number }) => void;
    };
  }) => YTPlayer;
}
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void; } }

let player: YTPlayer | null = null, ready = false, pending = false, pendingId = TRACKS[0].id, apiPromise: Promise<void> | null = null;
let frozenAt = 0; // seconds into the current track (frozen while paused)
let raf = 0, lastT = 0;
const bins = new Uint8Array(128); // local stand-in spectrum, kept in 0–255 like the old analyser
const targets = new Float32Array(bins.length);

function loadAPI(): Promise<void> {
  if (apiPromise) return apiPromise;
  if (window.YT?.Player) return (apiPromise = Promise.resolve());
  return (apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.append(s);
  }));
}

// Track ends → play again from the top (single embed loops its current video).
function mount() {
  if (player) return;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;overflow:hidden";
  document.body.append(host);
  player = new window.YT!.Player(host, {
    videoId: TRACKS[0].id,
    playerVars: { playsinline: 1 },
    events: {
      onReady: () => {
        ready = true;
        player!.setVolume(55);
        if (pending) { pending = false; player!.loadVideoById(pendingId); }
      },
      onStateChange: ({ data }) => {
        if (data === 1) set({ playing: true });
        else if (data === 2) { frozenAt = player!.getCurrentTime(); set({ playing: false }); }
        else if (data === 0) player!.playVideo(); // ended → loop the current track
      },
    },
  });
}

function ensureViz() {
  if (raf) return;
  for (let i = 0; i < bins.length; i++) targets[i] = Math.random() ** 1.6;
  raf = requestAnimationFrame((t) => { lastT = t; loop(t); });
}
function loop(t: number) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
  const live = state.playing ? 1 : 0;
  for (let i = 0; i < bins.length; i++) {
    if (Math.random() < (i < 8 ? 0.18 : 0.05)) targets[i] = i < 8 ? Math.random() : Math.random() ** 1.6;
    const target = live * targets[i] * (i < 8 ? 1 : 0.9 - (i / bins.length) * 0.55);
    const cur = bins[i] / 255;
    bins[i] = Math.round(255 * (cur + (target - cur) * Math.min(1, dt * (target > cur ? 14 : 7))));
  }
  let s = 0, b = 0; for (let i = 0; i < bins.length; i++) { s += bins[i]; if (i < 6) b += bins[i]; }
  signal.level += (Math.min(1, (s / bins.length) / 110) - signal.level) * 0.15;
  signal.bass += (b / 6 / 255 - signal.bass) * 0.25;
}

export async function playTrack(i = state.index) {
  const fresh = i !== state.index;
  if (fresh) frozenAt = 0;
  set({ index: i, playing: true });
  ensureViz();
  if (ready && player) {
    if (fresh) player.loadVideoById(TRACKS[i].id);
    else player.playVideo();
  } else {
    pending = true;
    pendingId = TRACKS[i].id;
    await loadAPI();
    mount();
  }
}
export function pause() {
  pending = false;
  if (ready && player) { frozenAt = player.getCurrentTime(); player.pauseVideo(); }
  set({ playing: false });
}
export const toggle = () => (state.playing ? pause() : playTrack());
export const nextTrack = () => playTrack((state.index + 1) % TRACKS.length);
export const prevTrack = () => playTrack((state.index + TRACKS.length - 1) % TRACKS.length);
/** Seconds into the current track (frozen while paused). */
export const elapsed = () => {
  if (!state.playing || !ready || !player) return frozenAt;
  frozenAt = player.getCurrentTime();
  return frozenAt;
};
/** Fills `out` with the live spectrum (0–255 per bin); returns false before the engine starts. */
export const readWave = (out: Uint8Array<ArrayBuffer>) => {
  if (!raf) return false;
  out.set(bins.subarray(0, Math.min(out.length, bins.length)));
  return true;
};
