"use client";
// P32: lazy video panel. Still under a muted loop; src set only when near, plays only while visible.
// A cursor chip trails the pointer and the click toggles the EP's live sound.
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { audioStore, toggle } from "@/lib/audio";

export function MediaPanel({ still, video, label, className = "", style }: { still: string; video: string; label: string; className?: string; style?: CSSProperties }) {
  const box = useRef<HTMLButtonElement>(null), clip = useRef<HTMLVideoElement>(null), chip = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);
  const s = useSyncExternalStore(audioStore.subscribe, audioStore.get, audioStore.get);
  const text = s.playing ? "Sound off" : "Sound on";

  useEffect(() => {
    const v = clip.current!, b = box.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Attach + fetch only when the panel is actually on screen (heavy files stream, they don't
    // pre-download from 3/4 of a viewport away and eat the connection).
    let first = true;
    const near = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || !first) return;
      first = false;
      v.src = video; v.load(); v.play().catch(() => {});
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => setShown(true));
      else v.addEventListener("playing", () => setShown(true), { once: true });
    });
    const vis = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); });
    near.observe(b); vis.observe(b);
    return () => { near.disconnect(); vis.disconnect(); };
  }, [video]);

  useEffect(() => {
    const b = box.current!, c = chip.current!;
    if (!matchMedia("(hover: hover)").matches) return;
    let x = 0, y = 0, tx = 0, ty = 0, r = 0, raf = 0, inside = false;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      const k = still ? 1 : 0.18, px = x;
      x += (tx - x) * k; y += (ty - y) * k;
      r = Math.max(-12, Math.min(12, (x - px) * 0.4));
      c.style.transform = `translate3d(calc(${x}px + var(--u) * 10), calc(${y}px + var(--u) * 10), 0) rotate(${still ? 0 : r}deg)`;
      if (inside || Math.abs(tx - x) > 0.5) raf = requestAnimationFrame(tick); else raf = 0;
    };
    const move = (e: PointerEvent) => {
      const rc = b.getBoundingClientRect(); tx = e.clientX - rc.left; ty = e.clientY - rc.top;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const enter = (e: PointerEvent) => { const rc = b.getBoundingClientRect(); x = tx = e.clientX - rc.left; y = ty = e.clientY - rc.top; inside = true; c.style.opacity = "1"; move(e); };
    const leave = () => { inside = false; c.style.opacity = "0"; };
    b.addEventListener("pointerenter", enter); b.addEventListener("pointermove", move); b.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); b.removeEventListener("pointerenter", enter); b.removeEventListener("pointermove", move); b.removeEventListener("pointerleave", leave); };
  }, []);

  return (
    <button ref={box} onClick={toggle} aria-pressed={s.playing} aria-label={`${label}. ${text}`} style={{ borderRadius: "calc(var(--u) * 5)", ...style }} className={`group relative block cursor-pointer overflow-hidden bg-[#0b0b0b] text-left ${className}`}>
      <video ref={clip} muted loop playsInline preload="none" aria-hidden className="absolute inset-0 size-full object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={still} alt="" loading="lazy" className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${shown ? "opacity-0" : "opacity-100"}`} />
      <span ref={chip} aria-hidden className="t-body pointer-events-none absolute top-0 left-0 z-10 text-white opacity-0 mix-blend-difference transition-opacity duration-300 [@media(hover:none)]:hidden">{text}</span>
      <span aria-hidden className="t-body absolute z-10 text-white/70 [@media(hover:hover)]:hidden" style={{ left: "calc(var(--u) * 10)", bottom: "calc(var(--u) * 5)" }}>{text}</span>
    </button>
  );
}
