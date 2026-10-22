"use client";
// Line reveal (rebuilt from Ascension's observed behaviour, our own code): the text is split into measured lines,
// each inside a mask; once the block is 20% above the viewport bottom the lines rise from 105% with an
// expo-out curve, 1.75 s each, 0.1 s apart. Waits for fonts (max 1.5 s); re-splits on width change.
// No JS or reduced motion: plain text, nothing hidden.
import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";

const fontsReady = () => Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);

export function Lines({ as = "p", text, className = "", indent = false, delay = 0 }: { as?: ElementType; text: string; className?: string; indent?: boolean; delay?: number }) {
  const el = useRef<HTMLElement>(null);
  const [starts, setStarts] = useState<number[] | null>(null); // index of the first word on each line
  const [shown, setShown] = useState(false);
  const words = text.split(" ");

  useEffect(() => {
    const node = el.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let width = node.clientWidth;
    const ro = new ResizeObserver(() => { if (node.clientWidth !== width) { width = node.clientWidth; setStarts(null); } });
    // Reveal once the top passes 80% of the viewport. A position check (not an IntersectionObserver) so a block that a
    // fast jump or an anchor link skips past still reveals.
    const check = () => { if (node.getBoundingClientRect().top < innerHeight * 0.8) { setShown(true); removeEventListener("scroll", check); } };
    const raf = requestAnimationFrame(check);
    addEventListener("scroll", check, { passive: true });
    ro.observe(node);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener("scroll", check); };
  }, []);

  useEffect(() => {
    if (starts) return;
    const node = el.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let off = false;
    fontsReady().then(() => {
      if (off) return;
      const out: number[] = []; let top = -Infinity;
      node.querySelectorAll<HTMLElement>("[data-w]").forEach((s, i) => { if (Math.abs(s.offsetTop - top) > 2) { out.push(i); top = s.offsetTop; } });
      setStarts(out);
    });
    return () => { off = true; };
  }, [starts]);

  const word = (w: string, i: number) => <span key={i} data-w>{w} </span>;
  const body = starts
    ? starts.map((s, l) => (
        <span key={l} className="line-mask" style={l === 0 && indent ? { textIndent: "var(--indent)" } : undefined}>
          <span className="line" style={{ "--l": l } as CSSProperties}>{words.slice(s, starts[l + 1] ?? words.length).map((w, i) => word(w, s + i))}</span>
        </span>
      ))
    : words.map(word);
  const Tag = as;
  return (
    <Tag ref={el} className={`lines ${indent ? "indent-cols" : ""} ${starts ? "is-split" : ""} ${shown ? "is-shown" : ""} ${className}`} style={delay ? ({ "--d": `${delay}s` } as CSSProperties) : undefined}>
      {body}
    </Tag>
  );
}
