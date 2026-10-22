import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Lines } from "./Lines";

// Shared header (measured reference layout): logo, nav at cols 3 / 4 + 30u / 6, Play at the right; release credits
// in cols 8-11 with the lead-in line and half/full column indents. The active page gets a "● " marker.
const U = (n: number) => `calc(var(--u) * ${n})`;
export const Slide = ({ d = 0, children }: { d?: number; children: ReactNode }) => (
  <span className="slide-mask"><span className="slide-up" style={{ "--d": `${0.1 * d}s` } as CSSProperties}>{children}</span></span>
);

export function SiteHeader({ active }: { active?: "listen" | "sequencer" | "about" }) {
  // Active marker hangs to the left of the word (reference), so the label keeps its column position.
  const dot = (k: string) => (active === k ? <span aria-hidden className="absolute right-full" style={{ marginRight: U(6) }}>●</span> : null);
  const cur = (k: string) => (active === k ? ("page" as const) : undefined);
  return (
    <header className="site t-body absolute inset-x-0 top-0 z-30 items-start text-mute" style={{ paddingTop: U(6) }}>
      <Link href="/" className="link col-span-2 row-start-1 text-[var(--chalk)]" style={{ marginTop: U(1) }}><Slide>Tidewell°</Slide></Link>
      <Link href="/#tracks" aria-current={cur("listen")} className="link hidden s:col-start-3 s:row-start-1 s:block"><Slide d={1}><span className="relative">{dot("listen")}Listen</span></Slide></Link>
      <Link href="/sequencer" aria-current={cur("sequencer")} className="link hidden whitespace-nowrap s:col-start-4 s:row-start-1 s:block" style={{ marginLeft: U(30) }}><Slide d={2}><span className="relative">{dot("sequencer")}Sequencer</span></Slide></Link>
      <Link href="/#about" aria-current={cur("about")} className="link hidden s:col-start-6 s:row-start-1 s:block"><Slide d={3}><span className="relative">{dot("about")}About</span></Slide></Link>
      <div className="mt-var col-span-4 row-start-2 s:col-span-4 s:col-start-8 s:row-start-1" style={{ "--mt": U(16), "--mt-s": U(7) } as CSSProperties}>
        <Lines as="p" className="t-title lead-in" text="“ASCEND” Debut EP" />
        <Lines as="p" className="t-title indent-half s:whitespace-nowrap" style={{ marginTop: U(3) }} text="Side A: ACENSION, Circles" />
        <Lines as="p" className="t-title indent-half s:whitespace-nowrap" text="Side B: Twinflame, Forest Walk" />
        <Lines as="p" className="t-title indent-full" text="21.11.2026 00:00" />
        <Lines as="p" className="t-title indent-full" text="Streams live" />
        <Lines as="p" className="t-title indent-full" text="©2026" />
      </div>
      <Link href="/#tracks" className="link col-start-4 row-start-1 text-right s:col-start-12"><Slide d={4}>Play</Slide></Link>
    </header>
  );
}
