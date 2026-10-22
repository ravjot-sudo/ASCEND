"use client";
// Line reveal (rebuilt from the reference's observed behaviour, our own code): the text is split into measured lines,
// each inside a mask; once the gate has opened and the block's top is above 80% of the viewport, the lines rise from
// 105% with an expo-out curve, 1.75 s each, 0.1 s apart. Waits for fonts (max 1.5 s) and re-splits on width change.
// Text may carry track cues: "[[I|title track|1]]" renders words with data-cue="I" and a raised footnote "1".
// `children` mode wraps the content in one mask (for rows that are laid out as flex).
// No JS or reduced motion: plain text, nothing hidden.
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

type Word = { w: string; cue?: string; note?: string };
const parse = (text: string): Word[] => {
  const out: Word[] = [];
  for (const m of text.matchAll(/\[\[(\w+)\|([^|\]]+)(?:\|([^\]]+))?\]\](\S*)|(\S+)/g)) {
    if (m[5]) { out.push({ w: m[5] }); continue; }
    const ws = m[2].split(" ");
    ws.forEach((w, i) => out.push({ w: i === ws.length - 1 ? w + (m[4] ?? "") : w, cue: m[1], note: i === ws.length - 1 ? m[3] : undefined }));
  }
  return out;
};
const fontsReady = () => Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);
const entered = () => document.documentElement.classList.contains("entered");

export function Lines({ as = "p", text, children, className = "", lineClassName = "", delay = 0, style }: {
  as?: ElementType; text?: string; children?: ReactNode; className?: string; lineClassName?: string; delay?: number; style?: CSSProperties;
}) {
  const el = useRef<HTMLElement>(null);
  const [starts, setStarts] = useState<number[] | null>(null); // index of the first word on each line
  const [shown, setShown] = useState(false);
  const [ready, setReady] = useState(false); // children mode: masked only once JS runs (never hide text before that)
  const words = text ? parse(text) : [];

  useEffect(() => {
    const node = el.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let width = node.clientWidth;
    const ro = new ResizeObserver(() => { if (node.clientWidth !== width) { width = node.clientWidth; setStarts(null); } });
    // Position check, not an IntersectionObserver, so blocks skipped by a fast jump or an anchor link still reveal.
    const check = () => { if (entered() && node.getBoundingClientRect().top < innerHeight * 0.8) { setShown(true); stop(); } };
    const stop = () => { removeEventListener("scroll", check); removeEventListener("undertow:entered", check); };
    const raf = requestAnimationFrame(check);
    addEventListener("scroll", check, { passive: true });
    addEventListener("undertow:entered", check);
    ro.observe(node);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); stop(); };
  }, []);

  useEffect(() => {
    if (starts || (children && ready)) return;
    const node = el.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let off = false;
    fontsReady().then(() => {
      if (off) return;
      if (children) { setReady(true); return; }
      const out: number[] = []; let top = -Infinity;
      node.querySelectorAll<HTMLElement>("[data-w]").forEach((s, i) => { if (Math.abs(s.offsetTop - top) > 2) { out.push(i); top = s.offsetTop; } });
      setStarts(out);
    });
    return () => { off = true; };
  }, [starts, children, ready]);

  const word = ({ w, cue, note }: Word, i: number) => (
    <span key={i} data-w data-cue={cue}>{w}{note && <sup className="raised t-meta">{note}</sup>} </span>
  );
  const Tag = as;
  const split = children ? ready : !!starts;
  const body = children && ready
    ? <span className="line-mask"><span className={`line ${lineClassName}`}>{children}</span></span>
    : starts
      ? starts.map((s, l) => (
          <span key={l} className="line-mask">
            <span className="line" style={{ "--l": l } as CSSProperties}>{words.slice(s, starts[l + 1] ?? words.length).map((w, i) => word(w, s + i))}</span>
          </span>
        ))
      : children ?? words.map(word);
  return (
    <Tag ref={el} className={`lines ${split ? "is-split" : ""} ${shown ? "is-shown" : ""} ${className}`} style={{ ...(delay ? { "--d": `${delay}s` } : {}), ...style } as CSSProperties}>
      {body}
    </Tag>
  );
}
