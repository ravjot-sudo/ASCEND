"use client";
import Lenis from "lenis";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { TRACKS, audioStore, nextTrack, pause, playTrack, toggle } from "@/lib/audio";
import { signal } from "@/lib/signal";

const useAudio = () => useSyncExternalStore(audioStore.subscribe, audioStore.get, audioStore.get);

export function SmoothScroll() {
  useEffect(() => {
    const lenis = matchMedia("(prefers-reduced-motion: reduce)").matches ? null : new Lenis({ autoRaf: true, lerp: 0.09 });
    const on = () => { signal.progress = Math.min(1, scrollY / (innerHeight * 1.6)); };
    on(); addEventListener("scroll", on, { passive: true });
    return () => { removeEventListener("scroll", on); lenis?.destroy(); };
  }, []);
  return null;
}

// P29: one click unlocks WebAudio and lifts the curtain. Silent entry is always offered.
export function Gate() {
  const [state, setState] = useState<"open" | "fading" | "gone">("open");
  const enter = (sound: boolean) => { if (sound) playTrack(0); setState("fading"); setTimeout(() => setState("gone"), 700); };
  if (state === "gone") return null;
  return (
    <div role="dialog" aria-modal aria-label="Enter Undertow" data-lenis-prevent className={`fixed inset-0 z-50 grid place-items-center bg-ink dots transition-opacity duration-700 ${state === "fading" ? "opacity-0" : ""}`}>
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        <p className="micro text-mute">Tidewell · Undertow · debut EP</p>
        <button autoFocus onClick={() => enter(true)} className="gate relative grid size-40 place-items-center rounded-full border border-line text-sm font-semibold tracking-tight transition-colors hover:border-glint hover:text-glint focus-visible:outline-2 focus-visible:outline-glint">
          Enter, sound on
        </button>
        <button onClick={() => enter(false)} className="micro text-mute underline-offset-4 hover:text-fg hover:underline">or enter in silence</button>
        <p className="max-w-xs text-sm text-mute">Headphones help. Every note is generated live in your browser. Nothing is streamed.</p>
      </div>
    </div>
  );
}

export function Player() {
  const s = useAudio(), bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let r = 0;
    const f = () => { if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, signal.level * 1.6)})`; r = requestAnimationFrame(f); };
    f(); return () => cancelAnimationFrame(r);
  }, []);
  const t = TRACKS[s.index];
  return (
    <div className="micro fixed right-3 bottom-3 z-40 flex items-center gap-3 rounded-full border border-line bg-ink/70 py-2 pr-3 pl-2 backdrop-blur-md sm:right-5 sm:bottom-5">
      <button onClick={toggle} aria-pressed={s.playing} aria-label={s.playing ? "Pause" : "Play"} className="grid size-7 place-items-center rounded-full bg-fg text-ink hover:bg-glint">{s.playing ? "❚❚" : "▶"}</button>
      <span aria-live="polite">{t.side} · {t.title}</span>
      <span className="relative h-px w-14 overflow-hidden bg-line"><span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-glint" /></span>
      <button onClick={nextTrack} aria-label="Next track" className="hover:text-glint">→</button>
    </div>
  );
}

// P31: sleeve notes; words lift as the paragraph crosses the viewport (opacity maths lives in CSS).
export function Notes({ items }: { items: { mark: string; text: string }[] }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ps = [...root.current!.querySelectorAll<HTMLElement>("[data-p]")];
    let r = 0;
    const f = () => {
      const vh = innerHeight;
      for (const p of ps) { const b = p.getBoundingClientRect(); p.style.setProperty("--p", String(Math.max(0, Math.min(1, (vh * 0.9 - b.top) / (b.height + vh * 0.3))))); }
      r = requestAnimationFrame(f);
    };
    f(); return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div ref={root} className="space-y-[10vh]">
      {items.map((it) => {
        const words = it.text.split(" ");
        return (
          <div key={it.mark} className="grid grid-cols-12 gap-x-5">
            <span className="micro col-span-12 pb-3 text-mute md:col-span-2 md:col-start-2 md:pt-4">{it.mark}</span>
            <p data-p style={{ "--n": words.length } as CSSProperties} className="note col-span-12 md:col-span-9">
              {words.map((w, j) => <span key={j} style={{ "--i": j } as CSSProperties}>{w} </span>)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function Tracklist() {
  const s = useAudio();
  return (
    <div className="grid grid-cols-12 gap-x-5">
      <h2 className="micro col-span-12 pb-6 text-mute md:col-span-2 md:col-start-2">● Tracklist</h2>
      <ol className="col-span-12 grid gap-x-10 md:col-span-9 md:grid-cols-2">
        {TRACKS.map((t, i) => {
          const on = s.playing && s.index === i;
          return (
            <li key={t.title} className="border-t border-line">
              <button onClick={() => (on ? pause() : playTrack(i))} aria-pressed={on} className="group flex w-full items-baseline justify-between gap-4 py-5 text-left">
                <span className="flex items-baseline gap-4">
                  <span className="micro w-8 text-mute">{t.side}</span>
                  <span className={`text-3xl font-bold tracking-tight transition-colors md:text-5xl ${on ? "text-glint" : "group-hover:text-glint"}`}>{t.title}</span>
                </span>
                <span className="micro shrink-0 text-mute">{on ? "Playing" : `${t.bpm} bpm · ${t.key}`}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
