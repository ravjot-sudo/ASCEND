"use client";
// Sequencer screen, laid out to the reference's measured page (1440 px: tracks panel 216u wide, controls 4 x 3 cells
// of 45u, a 16-step grid with 7u column gaps, 3u radii, a full-width share bar), with our own kits and sounds.
import { useCallback, useEffect, useSyncExternalStore, type CSSProperties } from "react";
import { pause as pauseReal, playTrack, TRACKS } from "@/lib/audio";
import {
  KITS, clearAll, copyPattern, hydrate, markCopied, pastePattern, play, preview, resetLoop, selectKit, selectPattern,
  seq, shareUrl, stop, toggleFollow, toggleStep,
} from "@/lib/sequencer";

const U = (n: number) => `calc(var(--u) * ${n})`;
const panel = "bg-[var(--surface)] shadow-[inset_0_0_0_1px_var(--hairline)]";
const radius: CSSProperties = { borderRadius: U(3) };

export function Sequencer() {
  const s = useSyncExternalStore(seq.subscribe, seq.get, seq.server);
  // Play runs the toy kit AND the real song; kits and sides stay in sync.
  const start = useCallback(() => { play(); playTrack(seq.get().kit); }, []);
  const end = useCallback(() => { stop(); pauseReal(); }, []);
  const pickKit = useCallback((i: number) => { const was = seq.get().playing; selectKit(i); if (was && i !== seq.get().kit) playTrack(i); }, []);
  const share = useCallback(async () => {
    try { await navigator.clipboard.writeText(shareUrl()); markCopied(true); setTimeout(() => markCopied(false), 1600); } catch {}
  }, []);
  useEffect(() => {
    hydrate();
    // No gate on this page: reveal the header straight away.
    document.documentElement.classList.add("entered");
    dispatchEvent(new Event("undertow:entered"));
    const key = (e: KeyboardEvent) => { if (e.code === "Space" && !(e.target as HTMLElement)?.closest("button, input")) { e.preventDefault(); if (seq.get().playing) end(); else start(); } };
    addEventListener("keydown", key);
    return () => { removeEventListener("keydown", key); stop(); pauseReal(); };
  }, [start, end]);

  const kit = KITS[s.kit], p = s.pattern[s.kit], grid = s.grids[s.kit][p];
  const cell = "hoverable flex items-center justify-center shadow-[inset_-1px_-1px_0_var(--line-strong)]";
  const row45: CSSProperties = { height: U(45) };

  return (
    <main className="seq t-body flex flex-col text-mute" style={{ paddingInline: U(10), paddingBottom: U(18), "--rows": kit.rows.length } as CSSProperties}>
      <div className="seq-top shrink-0">
        <div className={`${panel} overflow-hidden`} style={radius}>
          <p className="flex items-center border-b border-[var(--line-strong)]" style={{ height: U(35), paddingLeft: U(8) }}>● TRACKS</p>
          {KITS.map((k, i) => (
            <button key={k.slug} onClick={() => pickKit(i)} aria-pressed={i === s.kit}
              className={`hoverable flex w-full items-center text-left ${i < KITS.length - 1 ? "border-b border-[var(--line-strong)]" : ""} ${i === s.kit ? "bg-[var(--surface-2)]" : ""}`}
              style={{ ...row45, paddingLeft: U(10), paddingRight: U(9) }}>
              <span aria-hidden className={`shrink-0 ${i === s.kit ? "bg-[#96ff1e]" : "bg-[var(--mute)]"}`} style={{ width: U(2), height: U(12) }} />
              <span style={{ marginLeft: U(10) }}>{k.title}</span>
              <span className="ml-auto">{i + 1}</span>
            </button>
          ))}
        </div>
        <div className={`${panel} grid grid-cols-4 overflow-hidden`} style={radius}>
          <button onClick={start} className={cell} style={row45} aria-pressed={s.playing}>
            <svg aria-hidden viewBox="0 0 8 10" className="fill-current" style={{ width: U(8), height: U(10) }}><path d="M0 0v10l8-5z" /></svg>
            <span style={{ marginLeft: U(5) }}>Play</span>
          </button>
          <button onClick={end} className={cell} style={row45}>
            <span aria-hidden className="bg-current" style={{ width: U(10), height: U(10) }} />
            <span style={{ marginLeft: U(7) }}>Stop</span>
          </button>
          <p className={`${cell} cursor-default`} style={row45}>BPM<span style={{ marginLeft: U(2) }}>{kit.bpm}</span></p>
          <button onClick={clearAll} className={cell} style={row45}>Clear all</button>
          <button onClick={copyPattern} className={cell} style={row45}>Copy</button>
          <button onClick={pastePattern} disabled={!s.clip[s.kit]} className={`${cell} disabled:text-[color-mix(in_srgb,var(--mute)_40%,transparent)] disabled:hover:after:opacity-0`} style={row45}>Paste</button>
          <button onClick={resetLoop} className={cell} style={row45}>Reset loop</button>
          <button onClick={toggleFollow} aria-pressed={s.follow} className={`${cell} ${s.follow ? "bg-[var(--surface-2)]" : ""}`} style={row45}>
            {s.follow ? "✓ Follow on" : "Follow off"}
          </button>
          {[0, 1, 2, 3].map((i) => (
            <button key={i} onClick={() => selectPattern(i)} aria-pressed={i === p}
              className={`${cell} ${i === p ? "bg-[var(--surface-2)]" : ""} ${s.queued === i ? "animate-pulse" : ""}`} style={row45}>
              Pattern {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
        {/* rx: the real streamed track behind this kit, played through the site's YouTube player */}
        <button onClick={() => { stop(); pauseReal(); playTrack(s.kit); }}
          className={`${panel} hoverable col-span-4 flex items-center justify-center`} style={{ ...radius, height: U(45) }}>
          ▶ {TRACKS[s.kit].side} · Listen to the real track (YouTube ↗)
        </button>
      </div>

      <div className="seq-scroll min-h-0 flex-1" style={{ marginTop: U(40.5) }}>
      <div className="seq-grid">
        <p className="t-meta flex justify-center">{kit.title}</p>
        {Array.from({ length: 16 }, (_, i) => <p key={i} className="t-meta flex justify-center">{String(i + 1).padStart(2, "0")}</p>)}
        {kit.rows.map((r, ri) => (
          <div key={r.label} className="contents">
            <button onClick={() => preview(ri)} className={`${panel} hoverable flex min-h-0 min-w-0 items-center text-left`} style={{ ...radius, paddingLeft: U(12), paddingRight: U(8) }}>
              <span className="min-w-0 truncate">{r.label}</span>
            </button>
            {grid[ri].map((on, si) => {
              const head = s.head && s.head.pattern === p && s.head.step === si;
              return (
                <button key={si} onClick={() => toggleStep(ri, si)} aria-pressed={on} aria-label={`${r.label} step ${si + 1}`}
                  className="hoverable min-h-0 transition-colors duration-75"
                  style={{ ...radius, background: on ? (head ? "#ffffff" : "var(--mute)") : head ? "var(--surface-2)" : "var(--surface)" }} />
              );
            })}
          </div>
        ))}
      </div>
      </div>

      <button onClick={share} className={`${panel} hoverable flex shrink-0 items-center justify-center`} style={{ ...radius, marginTop: U(10), height: U(42) }}>
        {s.copied ? "Link copied" : "Share sequence ↗"}
      </button>
    </main>
  );
}
