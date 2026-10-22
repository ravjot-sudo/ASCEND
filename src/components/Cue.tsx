"use client";
// Track cues (rebuilt from the reference's observed behaviour, our own code): hovering any [data-cue] mention in the
// section dims the section to #232323, lights every mention of that track in white, and shows that track's video in a
// fixed panel (top 12u, the first 5 columns, radius 4u) — the actual YouTube video for that side, streaming muted.
// Leaving the section clears it; scrolling faster than 2 viewport-heights per second cancels the cue and switches
// cues off until the scroll settles.
import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { TRACKS, youTubeReady, type YTPlayer } from "@/lib/audio";

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

const sideId = (side: string) => TRACKS.find((t) => t.side === side)!.id;

export function CuePreview() {
  const c = useSyncExternalStore(store.sub, store.get, () => null);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!c) { pending.current = null; player.current?.stopVideo(); return; }
    pending.current = c;
    youTubeReady().then(() => {
      if (!host.current) return;
      if (!player.current) {
        player.current = new window.YT!.Player(host.current, {
          width: "100%", height: "100%",
          playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, iv_load_policy: 3, playsinline: 1, mute: 1 },
          events: {
            onReady: () => {
              player.current!.setVolume(0);
              if (pending.current) player.current!.loadVideoById(sideId(pending.current));
            },
          },
        });
      } else {
        player.current.loadVideoById(sideId(c));
        player.current.playVideo();
      }
    });
  }, [c]);

  return (
    <div aria-hidden className="site pointer-events-none fixed inset-x-0 z-[70]" style={{ top: "calc(var(--u) * 12)" }}>
      <div className={`col-span-4 relative overflow-hidden transition-opacity duration-200 bg-[#0b0b0b] s:col-span-5 ${c ? "opacity-100" : "opacity-0"}`} style={{ borderRadius: "calc(var(--u) * 4)", aspectRatio: "16 / 9" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c && <img src={CLIPS[c].still} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />}
        {/* the YT player mount: scaled a touch to keep the API's title chip out of frame */}
        <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: "none" }}>
          <div ref={host} className="size-full" style={{ transform: "scale(1.25) translateY(-12%)" }} />
        </div>
      </div>
    </div>
  );
}
