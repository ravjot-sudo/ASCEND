import type { CSSProperties } from "react";
import Scene from "@/components/Scene";
import { Lines } from "@/components/Lines";
import { MediaPanel } from "@/components/MediaPanel";
import { CuePreview, CueSection } from "@/components/Cue";
import { Gate, Player, SmoothScroll } from "@/components/ui";
import { SiteHeader, Slide } from "@/components/SiteHeader";

// u = the reference's 0.1rem (viewport-scaled, see globals.css). Spacing below is the measured reference rhythm.
const U = (n: number) => `calc(var(--u) * ${n})`;
const mt = (m: number, s?: number) => ({ "--mt": U(m), ...(s === undefined ? {} : { "--mt-s": U(s) }) }) as CSSProperties;


const INTRO = "Undertow is four pieces about the pull you don't notice until you're already in it. No samples, no stems, no files: every note you hear is written live, the moment you press play.";
const BIO = "Tidewell is a made-up artist from a made-up coast, a name for whatever the code decides to play tonight. The sound is cold and patient: long pads, a kick you feel more than hear, and melodies that never land in the same place twice.";
const META = [
  { n: "1", text: "The first loop ran overnight, a sine wave slowly drifting against itself.", link: { label: "Listen ↗", href: "#tracks" } },
  { n: "2", text: "Four rooms by the sea, each night generated fresh. Nothing repeats.", link: { label: "Notes ↗", href: "#notes" } },
];
const FACTS = [
  { k: "A:", title: "How the first loop started.", text: "A single sine wave left running overnight, slowly detuned against itself. By morning it sounded like weather, and the rest of the record was built around that drift." },
  { k: "B:", title: "Where the tide goes next.", text: "Four rooms by the sea, each playing the same patches through different speakers, each night generated fresh. Nothing is recorded, so nothing repeats." },
];
const TITLES = [
  { cue: "I", title: "Undertow", meta: "84 BPM", order: "order-1" },
  { cue: "III", title: "Low Water", meta: "100 BPM", order: "order-3" },
  { cue: "II", title: "Salt Choir", meta: "72 BPM", order: "order-2" },
  { cue: "IV", title: "Riptide Hymn", meta: "120 BPM", order: "order-4" },
];

function Mark({ children, className = "", style }: { children: string; className?: string; style?: CSSProperties }) {
  return <Lines as="p" text={children} className={`t-mark mt-var ${className}`} style={style} />;
}
function Title({ cue, title, meta, order }: (typeof TITLES)[number]) {
  return (
    <Lines as="span" className={`block ${order} s:order-none`}>
      <span data-cue={cue}><sup className="ride">{cue}</sup>{" "}{title} ({meta})</span>
    </Lines>
  );
}

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Scene />
      <div aria-hidden className="grain-layer pointer-events-none fixed inset-0 -z-[5]" />
      <Gate />
      <CuePreview />
      <Player />

      <SiteHeader />

      <main id="top">
        <section className="hero relative">
          <h1 className="sr-only">Tidewell, Undertow EP</h1>
          <div className="t-body pointer-events-none absolute inset-x-0 top-0 h-svh text-mute">
            <p className="absolute top-1/2 hidden -translate-y-1/2 s:block" style={{ left: U(10) }}><Slide d={5}>EP</Slide></p>
            <p className="absolute top-1/2 hidden -translate-y-1/2 s:block" style={{ right: U(10) }}><Slide d={6}>01</Slide></p>
            <p className="absolute hidden s:block" style={{ left: U(10), bottom: U(8) }}><Slide d={7}>Live stream · 4 tracks</Slide></p>
          </div>
        </section>

        <CueSection className="site mt-var text-mute" style={mt(45, 7)}>
          <div id="notes" className="contents">
            <Mark className="col-span-2">● Undertow</Mark>
            <Lines as="p" text={INTRO} className="t-display mt-var col-indent col-span-4 [--indent:1] s:col-span-12 s:[--indent:5]" style={mt(-27)} />
            <Mark className="col-start-1 s:col-start-5" style={mt(10, 6)}>I</Mark>
            <Lines as="p" text="The [[I|title track|1]] starts slow and heavy, a bass line that keeps stepping back down the same five notes like a tide that won't commit." className="t-display mt-var col-start-2 col-end-[-1] s:col-start-6 s:col-span-7" style={mt(10, 6)} />
            <Mark className="col-start-1 s:col-start-5" style={mt(5, 18)}>II</Mark>
            <Lines as="p" text="[[II|Salt Choir|2]] is the softest thing here: voices stacked in fifths, sung by nobody, slightly out of tune on purpose." className="t-display mt-var col-start-2 col-end-[-1] s:col-start-7 s:col-span-6" style={mt(5, 18)} />
          </div>
          <div id="tracks" className="t-display mt-var col-start-2 col-end-[-1] flex flex-col leading-[calc(var(--u)*30)] s:col-start-1 s:block s:leading-[calc(var(--u)*45)]" style={mt(80, 120)}>
            <div className="contents s:flex s:justify-center" style={{ columnGap: U(27) }}>
              <Title {...TITLES[0]} /><Title {...TITLES[1]} />
            </div>
            <div className="mt-var contents s:flex s:justify-center" style={{ columnGap: U(15), ...mt(0, 10) }}>
              <Title {...TITLES[2]} /><Title {...TITLES[3]} />
            </div>
          </div>
          <Mark className="col-start-1 s:col-start-5" style={mt(70, 145)}>III</Mark>
          <Lines as="p" text="[[III|Low Water|3]] is the one with teeth, square waves and a kick that sits right under the sternum." className="t-display mt-var col-start-2 col-end-[-1] s:col-start-6 s:col-span-7" style={mt(70, 145)} />
          <Mark className="col-start-1 s:col-start-5" style={mt(5, 9)}>IV</Mark>
          <Lines as="p" text="[[IV|Riptide Hymn|4]] closes at a hundred and twenty: bright, major, and quicker than it should be. That's how riptides work." className="t-display mt-var col-start-2 col-end-[-1] s:col-start-7 s:col-span-6" style={mt(5, 9)} />
        </CueSection>

        <section aria-label="Film" className="site mt-var t-body text-mute" style={mt(110, 195)}>
          <MediaPanel still="/media/moon-sea.webp" video="/media/moon-sea.mp4" label="Moonlight on open water, a rendered loop" className="col-span-4 aspect-[484/645] s:col-start-7" />
          <div className="col-span-2 col-start-11 hidden s:block" style={{ lineHeight: U(20) }}>
            <Lines as="span" className="block" text="● Undertow" />
            <Lines as="span" className="block" text="Open water (rendered)" />
          </div>
        </section>

        <section id="about" aria-label="About Tidewell" className="site mt-var text-mute" style={mt(100, 205)}>
          <Mark className="col-span-2">● Tidewell</Mark>
          <Lines as="p" text={BIO} className="t-display mt-var col-indent col-span-4 [--indent:1] s:col-span-12 s:[--indent:6]" style={mt(-27)} />
        </section>

        <section aria-label="Tidewell notes" className="site mt-var text-mute" style={mt(125, 260)}>
          <MediaPanel still="/media/moon-sea-close.webp" video="/media/moon-sea-close.mp4" label="Glitter on the water, a rendered loop" className="mt-var col-span-4 row-start-2 aspect-[487/754] s:row-start-1" style={mt(100, 0)} />
          <div className="t-meta col-span-4 row-start-3 mt-10 hidden s:col-span-2 s:col-start-5 s:row-start-1 s:mt-0 s:block" style={{ lineHeight: U(16) }}>
            {META.map((m, i) => (
              <div key={m.n} className="relative" style={{ marginTop: i ? U(55) : 0 }}>
                <p className="absolute top-0 left-0">{m.n}</p>
                <div style={{ marginLeft: U(20), maxWidth: U(170) }}>
                  <Lines as="p" text={m.text} />
                  <p style={{ marginTop: U(15) }}><a href={m.link.href} className="link">{m.link.label}</a></p>
                </div>
              </div>
            ))}
          </div>
          <div className="site-4 t-copy col-span-4 row-start-1 s:col-start-9">
            {FACTS.map((f) => (
              <div key={f.k} className="contents">
                <Lines as="p" className="col-start-1 col-end-2" text={f.k} />
                <Lines as="p" className="col-start-2 col-end-[-1]" text={f.title} />
                <Lines as="p" className="col-start-2 col-end-[-1] w-full" style={{ marginLeft: U(35), maxWidth: U(310) }} text={f.text} delay={0.1} />
              </div>
            ))}
            <p className="col-start-2 col-end-[-1]" style={{ marginTop: U(45), marginLeft: U(35), maxWidth: U(330) }}>
              <a href="#top" className="link flex w-full justify-between"><span>More about Tidewell</span><span>→</span></a>
            </p>
          </div>
        </section>
      </main>

      <footer className="site mt-var t-copy text-mute pb-[calc(var(--u)*70)] s:pb-[calc(var(--u)*15)]" style={mt(220, 400)}>
        <p className="col-span-2 row-start-3 s:col-span-3 s:row-start-1 s:self-end">©2026 Tidewell</p>
        <p className="col-span-2 row-start-2 s:col-span-3 s:col-start-4 s:row-start-1" style={{ marginTop: 0 }}>Concept release site<br />Names are fictional</p>
        <p className="col-span-2 row-start-1 s:col-span-3 s:col-start-7">Music streams live from YouTube<br />Wordmark: MgOpen Moderna-derived typeface</p>
        <p className="col-span-2 col-start-3 row-start-1 s:col-span-2 s:col-start-10"><a href="#tracks" className="link">Listen</a><br /><a href="#top" className="link">Back to the surface ↑</a></p>
        <p className="col-span-2 row-start-3 text-right s:col-start-12 s:col-span-1 s:row-start-1 s:self-end">2026</p>
      </footer>
    </>
  );
}
