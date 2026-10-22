"use client";
import Lenis from "lenis";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TRACKS, audioStore, elapsed, nextTrack, pause, playTrack, prevTrack, readWave, toggle } from "@/lib/audio";
import { signal } from "@/lib/signal";
import { Cover } from "./Cover";
import { Lines } from "./Lines";

const useAudio = () => useSyncExternalStore(audioStore.subscribe, audioStore.get, audioStore.get);

export function SmoothScroll() {
  useEffect(() => {
    history.scrollRestoration = "manual"; scrollTo(0, 0);
    const lenis = matchMedia("(prefers-reduced-motion: reduce)").matches ? null : new Lenis({ autoRaf: true, lerp: 0.09 });
    const root = document.documentElement;
    const on = () => {
      signal.progress = Math.min(1, scrollY / (innerHeight * 1.6));
      // past the descent the scene becomes a faint backdrop so the reading sections stay legible
      root.style.setProperty("--scene", String(Math.max(0.14, Math.min(1, 1 - (scrollY - innerHeight * 1.7) / (innerHeight * 0.7)))));
    };
    on(); addEventListener("scroll", on, { passive: true });
    return () => { removeEventListener("scroll", on); lenis?.destroy(); };
  }, []);
  return null;
}

// P29: one click unlocks WebAudio and lifts the curtain. The cover is the gate: the CD slides out of the
// sleeve on hover and all the way on click, then the curtain fades. Silent entry is always offered.
type GateState = "open" | "entering" | "fading" | "gone";
export function Gate() {
  const [state, setState] = useState<GateState>("open");
  const enter = (sound: boolean) => {
    if (state !== "open") return;
    if (sound) playTrack(0);
    const quick = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setState(quick ? "fading" : "entering");
    setTimeout(() => setState("fading"), quick ? 0 : 750);
    setTimeout(() => setState("gone"), quick ? 300 : 1450);
  };
  useEffect(() => {
    if (state === "gone") return;
    const h = document.documentElement; h.style.overflow = "hidden";
    return () => { h.style.overflow = ""; };
  }, [state]);
  if (state === "gone") return null;
  return (
    <div role="dialog" aria-modal aria-label="Enter Undertow" data-lenis-prevent className={`grain fixed inset-0 z-50 grid place-items-center overflow-hidden bg-black transition-opacity duration-700 ${state === "fading" ? "opacity-0" : ""}`}>
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <button autoFocus onClick={() => enter(true)} aria-label="Click to enter, sound on" className={`cover-wrap group ${state !== "open" ? "is-entering" : ""}`}>
          <span className="cover-box">
            <span className="cover-disc" aria-hidden>
              <span className="disc"><span className="disc-spin"><span>UNDERTOW</span></span></span>
            </span>
            <Cover />
          </span>
          <span className="text-[clamp(24px,2.6vw,36px)] font-semibold tracking-tight text-[#8a8a8a] transition-colors group-hover:text-fg group-focus-visible:text-fg">Click to enter</span>
        </button>
        <button onClick={() => enter(false)} className="micro text-mute underline-offset-4 hover:text-fg hover:underline">or enter in silence</button>
      </div>
      <p className="micro absolute bottom-5 left-1/2 w-max -translate-x-1/2 text-mute">Headphones help · every note is generated live</p>
    </div>
  );
}

const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const Icon = ({ d }: { d: string }) => <svg aria-hidden viewBox="0 0 12 12" className="mx-auto size-3 fill-current"><path d={d} /></svg>;

// Mini bar + expandable player: a spinning silver disc, a live waveform from the analyser, transport.
export function Player() {
  const s = useAudio(), [open, setOpen] = useState(false);
  const bar = useRef<HTMLSpanElement>(null), wave = useRef<HTMLCanvasElement>(null), time = useRef<HTMLSpanElement>(null);
  const sheet = useRef<HTMLDivElement>(null), opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let r = 0;
    const buf = new Uint8Array(128);
    const f = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, signal.level * 1.6)})`;
      if (time.current) time.current.textContent = fmt(elapsed());
      const c = wave.current;
      if (c) {
        const g = c.getContext("2d")!, w = c.width, h = c.height, n = 64, bw = w / n, live = readWave(buf);
        g.clearRect(0, 0, w, h); g.fillStyle = "#fff";
        for (let i = 0; i < n; i++) {
          const v = live ? (buf[Math.floor((i / n) ** 1.8 * 48)] / 255) ** 0.8 : 0, bh = Math.max(2, v * h); // low bins carry most of the energy
          g.globalAlpha = 0.3 + v * 0.7; g.fillRect(i * bw, (h - bh) / 2, Math.max(1, bw - 3), bh);
        }
      }
      r = requestAnimationFrame(f);
    };
    f(); return () => cancelAnimationFrame(r);
  }, []);
  useEffect(() => {
    if (!open) return;
    sheet.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); opener.current?.focus(); } };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);
  const t = TRACKS[s.index];
  return (
    <>
      {open && (
        <div ref={sheet} tabIndex={-1} role="region" aria-label="Player" data-lenis-prevent className="micro fixed inset-x-3 bottom-[64px] z-40 rounded-[5px] border border-line bg-black/90 p-3 outline-none backdrop-blur-md sm:right-5 sm:bottom-[72px] sm:left-auto sm:w-[340px]">
          <div className="flex justify-between pb-2 text-mute"><span>● Tracks</span><span>{TRACKS.length}</span></div>
          <ol className="grid grid-cols-2 gap-px border border-line bg-line">
            {TRACKS.map((x, i) => (
              <li key={x.title} className="bg-black">
                <button onClick={() => playTrack(i)} aria-current={s.index === i} className={`flex w-full items-center gap-2 p-2 text-left transition-colors hover:bg-white/5 hover:text-fg ${s.index === i ? "text-fg" : "text-mute"}`}>
                  <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${s.index === i && s.playing ? "bg-glint" : "bg-line"}`} />
                  <span className="truncate">{x.title}</span><span className="text-mute">{x.side}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="grid place-items-center py-6">
            <div aria-hidden className="disc"><div className={`disc-spin ${s.playing ? "" : "paused"}`}><span>UNDERTOW</span></div></div>
          </div>
          <div className="flex justify-between gap-2 text-mute"><span className="truncate text-fg">Tidewell · {t.title}</span><span ref={time}>00:00</span><span>BPM {t.bpm}</span></div>
          <canvas ref={wave} width={600} height={64} aria-hidden className="mt-2 h-8 w-full" />
          <div className="mt-2 grid grid-cols-3 gap-px border border-line bg-line">
            <button onClick={prevTrack} aria-label="Previous track" className="bg-black py-2.5 transition-colors hover:bg-white/10"><Icon d="M2 1h1.6v10H2zM10 1v10L4 6z" /></button>
            <button onClick={toggle} aria-label={s.playing ? "Pause" : "Play"} className="bg-black py-2.5 transition-colors hover:bg-white/10"><Icon d={s.playing ? "M2.5 1h2.5v10H2.5zM7 1h2.5v10H7z" : "M3 1v10l8-5z"} /></button>
            <button onClick={nextTrack} aria-label="Next track" className="bg-black py-2.5 transition-colors hover:bg-white/10"><Icon d="M8.4 1H10v10H8.4zM2 1v10l6-5z" /></button>
          </div>
        </div>
      )}
      <div className="micro fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-full border border-line bg-black/70 py-1.5 pr-1.5 pl-1.5 backdrop-blur-md sm:inset-x-auto sm:right-5 sm:bottom-5">
        <button onClick={toggle} aria-pressed={s.playing} aria-label={s.playing ? "Pause" : "Play"} className="grid size-7 shrink-0 place-items-center rounded-full bg-fg text-ink transition-opacity hover:opacity-75">
          <Icon d={s.playing ? "M2.5 1h2.5v10H2.5zM7 1h2.5v10H7z" : "M3 1v10l8-5z"} />
        </button>
        <span aria-live="polite" className="min-w-0 flex-1 truncate">{t.side} · {t.title}</span>
        <span className="relative h-px w-14 shrink-0 overflow-hidden bg-line"><span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-glint" /></span>
        <button ref={opener} onClick={() => setOpen((o) => !o)} aria-expanded={open} className="shrink-0 rounded-full border border-line px-3 py-1.5 hover:border-fg">{open ? "Close" : "Player"}</button>
      </div>
    </>
  );
}

export function Tracklist() {
  const s = useAudio();
  return (
    <div className="grid grid-cols-12 gap-x-5">
      <h2 className="micro col-span-12 pb-6 text-mute md:col-span-2 md:col-start-2"><Lines as="span" text="● Tracklist" /></h2>
      <ol className="col-span-12 grid gap-x-10 md:col-span-9 md:grid-cols-2">
        {TRACKS.map((t, i) => {
          const on = s.playing && s.index === i;
          return (
            <li key={t.title} className="border-t border-line">
              <button onClick={() => (on ? pause() : playTrack(i))} aria-pressed={on} className="group flex w-full items-baseline justify-between gap-4 py-5 text-left">
                <span className="flex items-baseline gap-4">
                  <span className="micro w-8 text-mute">{t.side}</span>
                  <span className={`text-3xl font-bold tracking-tight transition-colors md:text-5xl ${on ? "text-fg" : "text-fg/50 group-hover:text-fg"}`}>{t.title}</span>
                </span>
                <span className={`micro shrink-0 ${on ? "text-fg" : "text-mute"}`}>{on ? "● Playing" : `${t.bpm} bpm · ${t.key}`}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
