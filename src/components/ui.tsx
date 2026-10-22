"use client";
import Lenis from "lenis";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { TRACKS, audioStore, elapsed, nextTrack, playTrack, prevTrack, readWave, toggle } from "@/lib/audio";
import { signal } from "@/lib/signal";
import { Cover } from "./Cover";

const useAudio = () => useSyncExternalStore(audioStore.subscribe, audioStore.get, audioStore.get);

export function SmoothScroll() {
  useEffect(() => {
    history.scrollRestoration = "manual"; scrollTo(0, 0);
    const lenis = matchMedia("(prefers-reduced-motion: reduce)").matches ? null : new Lenis({ autoRaf: true, lerp: 0.09 });
    const root = document.documentElement, hero = document.querySelector<HTMLElement>(".hero");
    const on = () => {
      const h = Math.max(innerHeight, hero?.offsetHeight ?? innerHeight * 1.6);
      signal.progress = Math.min(1, scrollY / (h * 0.85));
      // past the hero the scene becomes a faint backdrop so the reading sections stay legible
      root.style.setProperty("--scene", String(Math.max(0.14, Math.min(1, 1 - (scrollY - h * 0.85) / (innerHeight * 0.7)))));
    };
    on(); addEventListener("scroll", on, { passive: true }); addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); lenis?.destroy(); };
  }, []);
  return null;
}

// P29 gate, rebuilt from Ascension's observed sequence (our own code). The sleeve pops in once fonts are ready
// (max 3 s); the CD is pulled out of the sleeve on a spring as the pointer comes within 2.5 sleeve widths;
// the sleeve grows (to ~1.4x) and tilts with the pull; "Click to enter" trails the cursor and the whole screen is
// the target (no button chrome); the click throws the sleeve off to the lower left, then the curtain fades.
type GateState = "loading" | "open" | "entering" | "fading" | "gone";
export function Gate() {
  const [state, setState] = useState<GateState>("loading");
  const done = useRef(false), box = useRef<HTMLSpanElement>(null), disc = useRef<HTMLSpanElement>(null), chip = useRef<HTMLSpanElement>(null);
  const enter = (sound: boolean) => {
    if (done.current) return;
    done.current = true;
    // Disc exit target in the box's local units (the box is scaled by its zoom): 0.2 widths past the right edge, 0.6 heights up.
    const d = disc.current, b = box.current;
    if (d && b) {
      const r = d.getBoundingClientRect(), zoom = r.width / d.offsetWidth || 1;
      d.style.setProperty("--ex", `${(innerWidth + r.width * 0.2 - r.left) / zoom}px`);
      d.style.setProperty("--ey", `${(-0.6 * r.height) / zoom}px`);
    }
    if (chip.current) { chip.current.style.transition = "none"; chip.current.style.opacity = "0"; }
    if (sound) playTrack(0);
    const quick = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setState(quick ? "fading" : "entering");
    setTimeout(() => {
      setState("fading");
      document.documentElement.classList.add("entered");
      dispatchEvent(new Event("undertow:entered"));
    }, quick ? 0 : 700);
    setTimeout(() => setState("gone"), quick ? 300 : 1300);
  };
  useEffect(() => {
    let off = false;
    Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 3000))]).then(() => { if (!off) setState("open"); });
    return () => { off = true; };
  }, []);
  useEffect(() => {
    if (state === "gone") return;
    const h = document.documentElement; h.style.overflow = "hidden";
    return () => { h.style.overflow = ""; };
  }, [state]);
  // Pointer pull + cursor label. Spring on the CD (stiffness 140, damping 16); smoothstep falloff over 2.5 widths.
  useEffect(() => {
    if (!matchMedia("(hover: hover)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let px = 0, py = 0, seen = false, val = 0, vel = 0, last = 0, raf = 0;
    const tick = (t: number) => {
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t;
      const b = box.current;
      if (b) {
        const r = b.getBoundingClientRect(), d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const n = seen ? 1 - Math.min(1, d / (2.5 * r.width)) : 0, target = n * n * (3 - 2 * n);
        if (!done.current) { vel += ((target - val) * 140 - vel * 16) * dt; val += vel * dt; } // frozen once launched
        b.style.setProperty("--pull", val.toFixed(4));
      }
      if (chip.current) chip.current.style.transform = `translate3d(calc(${px}px + var(--u) * 10), calc(${py}px + var(--u) * 10), 0)`;
      raf = requestAnimationFrame(tick);
    };
    const move = (e: MouseEvent) => { px = e.clientX; py = e.clientY; if (chip.current) chip.current.style.opacity = "1"; seen = true; };
    const leave = () => { seen = false; if (chip.current) chip.current.style.opacity = "0"; };
    addEventListener("mousemove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    raf = requestAnimationFrame(tick);
    return () => { removeEventListener("mousemove", move); document.documentElement.removeEventListener("mouseleave", leave); cancelAnimationFrame(raf); };
  }, []);
  if (state === "gone") return null;
  return (
    <div role="dialog" aria-modal aria-label="Enter Undertow" data-lenis-prevent onClick={() => enter(true)} className={`grain fixed inset-0 z-50 grid cursor-pointer place-items-center overflow-hidden bg-black transition-opacity duration-500 ${state === "fading" ? "opacity-0" : ""}`}>
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <button onClick={(e) => { e.stopPropagation(); enter(true); }} aria-label="Click to enter, sound on" className={`cover-wrap group ${state === "loading" ? "" : "is-ready"} ${state === "entering" || state === "fading" ? "is-entering" : ""}`}>
          <span ref={box} className="cover-box">
            <span ref={disc} className="cover-disc" aria-hidden>
              <span className="disc"><span className="disc-spin"><span>UNDERTOW</span></span></span>
            </span>
            <Cover />
          </span>
          <span className="gate-label t-body text-mute">Click to enter</span>
        </button>
      </div>
      <span ref={chip} aria-hidden className={`gate-chip t-body pointer-events-none fixed top-0 left-0 z-10 text-mute opacity-0 transition-opacity duration-300 ${state === "entering" || state === "fading" ? "!opacity-0" : ""}`}>Click to enter</span>
      <p className="micro absolute bottom-5 left-1/2 w-max -translate-x-1/2 text-mute">Headphones help · music streams live</p>
    </div>
  );
}

const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const Icon = ({ d }: { d: string }) => <svg aria-hidden viewBox="0 0 12 12" className="mx-auto size-3 fill-current"><path d={d} /></svg>;

// Mini bar + expandable player: a spinning silver disc, a live waveform from the analyser, transport.
export function Player() {
  const s = useAudio(), [open, setOpen] = useState(false);
  const wave = useRef<HTMLCanvasElement>(null), time = useRef<HTMLSpanElement>(null);
  const sheet = useRef<HTMLDivElement>(null), opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let r = 0;
    const buf = new Uint8Array(128);
    const f = () => {
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
        <div ref={sheet} tabIndex={-1} role="region" aria-label="Player" data-lenis-prevent className="micro fixed left-[calc(var(--u)*10)] z-40 border border-line bg-[var(--surface)] p-3 outline-none sm:left-auto sm:w-[340px]" style={{ right: "calc(var(--u) * 10)", bottom: "calc(var(--u) * 54)", borderRadius: "calc(var(--u) * 5)" }}>
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
          <div className="flex justify-between gap-2 text-mute"><span className="truncate text-fg">Tidewell · {t.title}</span><span ref={time}>00:00</span><span className="shrink-0">YouTube</span>
          </div>
          <canvas ref={wave} width={600} height={64} aria-hidden className="mt-2 h-8 w-full" />
          <div className="mt-2 grid grid-cols-3 gap-px border border-line bg-line">
            <button onClick={prevTrack} aria-label="Previous track" className="bg-black py-2.5 transition-colors hover:bg-white/10"><Icon d="M2 1h1.6v10H2zM10 1v10L4 6z" /></button>
            <button onClick={toggle} aria-label={s.playing ? "Pause" : "Play"} className="bg-black py-2.5 transition-colors hover:bg-white/10"><Icon d={s.playing ? "M2.5 1h2.5v10H2.5zM7 1h2.5v10H7z" : "M3 1v10l8-5z"} /></button>
            <button onClick={nextTrack} aria-label="Next track" className="bg-black py-2.5 transition-colors hover:bg-white/10"><Icon d="M8.4 1H10v10H8.4zM2 1v10l6-5z" /></button>
          </div>
        </div>
      )}
      {/* Mini bar (measured reference): bottom-right 10u, 34u tall, surface fill, hairline edge, 5u radius; an
          equaliser that plays/pauses, and the track label that opens the player panel. Rises in after the gate. */}
      <div className="panel-rise t-body fixed z-40 flex items-stretch bg-[var(--surface)] text-mute shadow-[inset_0_0_0_1px_var(--hairline)]" style={{ right: "calc(var(--u) * 10)", bottom: "calc(var(--u) * 10)", height: "calc(var(--u) * 34)", borderRadius: "calc(var(--u) * 5)", "--d": "0.2s" } as CSSProperties}>
        <button onClick={toggle} aria-pressed={s.playing} aria-label={s.playing ? "Pause" : "Play"} className="flex items-center justify-center" style={{ width: "calc(var(--u) * 12)", marginLeft: "calc(var(--u) * 12)" }}>
          <span aria-hidden className={`eq flex items-end justify-between ${s.playing ? "on" : ""}`} style={{ width: "calc(var(--u) * 10)", height: "calc(var(--u) * 11)" }}><i /><i /><i /></span>
        </button>
        <button ref={opener} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${t.title}, Tidewell. ${open ? "Close" : "Open"} the player`} className="hoverable flex items-center whitespace-nowrap text-left" style={{ paddingInline: "calc(var(--u) * 13)", borderRadius: "inherit" }}>
          <span aria-live="polite">{t.title} - Tidewell°</span>
        </button>
      </div>
    </>
  );
}
