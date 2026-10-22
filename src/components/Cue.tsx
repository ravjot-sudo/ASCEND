"use client";
// Track cues (rebuilt from the reference's observed behaviour, our own code): hovering any [data-cue] mention in the
// section dims the section to #232323, lights every mention of that track in white, and shows that track's clip in a
// fixed panel (top 12u, the first 5 columns, radius 4u). Leaving the section clears it; scrolling faster than
// 2 viewport-heights per second cancels the cue and switches cues off until the scroll settles.
import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

const CLIPS: Record<string, { video: string; still: string }> = {
  I: { video: "/media/moon-sea.mp4", still: "/media/moon-sea.webp" },
  II: { video: "/media/moon-sea-close.mp4", still: "/media/moon-sea-close.webp" },
  III: { video: "/media/moon-sea.mp4", still: "/media/moon-sea.webp" },
  IV: { video: "/media/moon-sea-close.mp4", still: "/media/moon-sea-close.webp" },
};
let cue: string | null = null;
const subs = new Set<() => void>();
const setCue = (c: string | null) => { if (c !== cue) { cue = c; subs.forEach((f) => f()); } };
const store = { get: () => cue, sub: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; } };

export function CueSection({ className = "", style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  const el = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = el.current!;
    if (!matchMedia("(hover: hover)").matches) return;
    const paint = (c: string | null) => {
      root.classList.toggle("cued", !!c);
      root.querySelectorAll<HTMLElement>("[data-cue]").forEach((n) => n.classList.toggle("lit", !!c && n.dataset.cue === c));
      setCue(c);
    };
    const over = (e: MouseEvent) => { const c = (e.target as Element | null)?.closest?.("[data-cue]")?.getAttribute("data-cue"); paint(c && CLIPS[c] ? c : null); };
    const leave = () => paint(null);
    let lastY = scrollY, lastT = performance.now(), fast = false, raf = 0;
    const tick = (t: number) => {
      const v = Math.abs(scrollY - lastY) / Math.max(1, t - lastT) * 1000 / innerHeight; // viewport-heights per second
      lastY = scrollY; lastT = t;
      const f = v > 2;
      if (f !== fast) { fast = f; root.classList.toggle("scrolling", f); if (f) paint(null); }
      raf = requestAnimationFrame(tick);
    };
    root.addEventListener("mouseover", over); root.addEventListener("mouseleave", leave);
    raf = requestAnimationFrame(tick);
    return () => { root.removeEventListener("mouseover", over); root.removeEventListener("mouseleave", leave); cancelAnimationFrame(raf); paint(null); };
  }, []);
  return <section ref={el} className={className} style={style}>{children}</section>;
}

export function CuePreview() {
  const c = useSyncExternalStore(store.sub, store.get, () => null);
  const clip = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = clip.current;
    if (!v) return;
    if (!c) { v.pause(); return; }
    const src = CLIPS[c].video;
    if (!v.src.endsWith(src)) v.src = src;
    v.currentTime = 0;
    v.play().catch(() => {});
  }, [c]);
  return (
    <div aria-hidden className="site pointer-events-none fixed inset-x-0 z-[70]" style={{ top: "calc(var(--u) * 12)" }}>
      <div className={`col-span-4 overflow-hidden transition-opacity duration-200 s:col-span-5 ${c ? "opacity-100" : "opacity-0"}`} style={{ borderRadius: "calc(var(--u) * 4)", aspectRatio: "16 / 9" }}>
        <video ref={clip} muted loop playsInline preload="none" poster={c ? CLIPS[c].still : undefined} className="size-full object-cover" />
      </div>
    </div>
  );
}
