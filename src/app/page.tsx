import Scene from "@/components/Scene";
import { Lines } from "@/components/Lines";
import { MediaPanel } from "@/components/MediaPanel";
import { Gate, Player, SmoothScroll, Tracklist } from "@/components/ui";

const INTRO = "Undertow is four pieces about the pull you don't notice until you're already in it. No samples, no stems, no files: every note you hear is written by your browser, live, the moment you press play.";
const SIDE_A = [
  { mark: "I", text: "The title track starts slow and heavy, a bass line that keeps stepping back down the same five notes like a tide that won't commit." },
  { mark: "II", text: "Salt Choir is the softest thing here: voices stacked in fifths, sung by nobody, slightly out of tune on purpose." },
];
const SIDE_B = [
  { mark: "III", text: "Low Water is the one with teeth, square waves and a kick that sits right under the sternum." },
  { mark: "IV", text: "Riptide Hymn closes at a hundred and twenty: bright, major, and quicker than it should be. That's how riptides work." },
];
const BIO = "Tidewell is a made-up artist from a made-up coast, a name for whatever the code decides to play tonight. The sound is cold and patient: long pads, a kick you feel more than hear, and melodies that never land in the same place twice.";
const FACTS = [
  { n: "1", title: "How the first loop started", text: "A single sine wave left running overnight, slowly detuned against itself. By morning it sounded like weather, and the rest of the record was built around that drift." },
  { n: "2", title: "Where the tide goes next", text: "Four rooms by the sea, each playing the same patches through different speakers, each night generated fresh. Nothing is recorded, so nothing repeats." },
];
const DATES = [
  { d: "21.11.2026", place: "Everywhere", venue: "Release day, all platforms", s: "Out" },
  { d: "05.12.2026", place: "Ostend", venue: "Pier Hall", s: "Concept" },
  { d: "12.12.2026", place: "Rotterdam", venue: "Maassilo, Room 2", s: "Concept" },
  { d: "19.12.2026", place: "Lisbon", venue: "Armazém 16", s: "Concept" },
  { d: "09.01.2027", place: "Reykjavík", venue: "Harbour Shed", s: "Concept" },
];

// Sleeve note: full-width paragraph, first line indented by whole columns, marker sitting in the indent.
function Note({ mark, text, markAt = "inner" }: { mark: string; text: string; markAt?: "start" | "inner" }) {
  return (
    <div className="grid grid-cols-12 gap-x-5">
      <span className={`micro col-span-4 col-start-1 row-start-1 pt-[0.85em] text-mute md:col-span-2 ${markAt === "inner" ? "md:col-start-4" : ""}`}>{mark}</span>
      <Lines text={text} indent className="note col-span-12 col-start-1 row-start-1" />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Scene />
      <div aria-hidden className="dots pointer-events-none fixed inset-0 -z-[5]" />
      <Gate />
      <Player />

      <header className="micro fixed inset-x-0 top-0 z-30 grid grid-cols-12 gap-x-5 px-4 pt-4 pb-10 sm:px-6 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-black/85 before:to-transparent">
        <a href="#top" className="col-span-3 font-semibold transition-opacity hover:opacity-60 md:col-span-2">Tidewell°</a>
        <nav aria-label="Sections" className="col-span-5 hidden gap-8 md:flex">
          <a href="#tracks" className="transition-opacity hover:opacity-60">Listen</a>
          <a href="#notes" className="transition-opacity hover:opacity-60">Notes</a>
          <a href="#about" className="transition-opacity hover:opacity-60">About</a>
          <a href="#dates" className="transition-opacity hover:opacity-60">Tide table</a>
        </nav>
        <a href="#tracks" className="col-span-2 col-start-11 text-right transition-opacity hover:opacity-60 md:col-span-1 md:col-start-12">Play ↓</a>
      </header>

      <main id="top">
        <section className="relative h-[220vh]">
          <h1 className="sr-only">Tidewell, Undertow EP</h1>
          <div className="micro pointer-events-none absolute inset-x-0 top-0 z-[35] h-svh">
            <div className="grid grid-cols-12 gap-x-5 px-4 pt-4 sm:px-6">
              <p className="col-span-7 col-start-4 leading-snug md:col-span-4 md:col-start-8">
                “Undertow” debut EP<br /><span className="text-mute">Side A:</span> Undertow, Salt Choir<br /><span className="text-mute">Side B:</span> Low Water, Riptide Hymn<br />21.11.2026 · 00:00<br /><span className="hidden text-mute sm:inline">Generated live · ©2026</span>
              </p>
            </div>
            <span className="absolute top-1/2 left-4 sm:left-6">EP</span>
            <span className="absolute top-1/2 right-4 sm:right-6">I–IV</span>
            <span className="absolute bottom-6 left-6 hidden text-mute sm:block">WebAudio · 4 tracks</span>
            <span className="absolute bottom-20 left-1/2 -translate-x-1/2 text-mute sm:bottom-6">Scroll to go under ↓</span>
          </div>
        </section>

        <section id="notes" aria-label="Sleeve notes" className="space-y-[9vh] px-4 pt-[14vh] sm:px-6">
          <Note mark="● Undertow" text={INTRO} markAt="start" />
          {SIDE_A.map((n) => <Note key={n.mark} {...n} />)}
        </section>

        <section id="tracks" aria-label="Tracklist" className="px-4 py-[14vh] sm:px-6">
          <Tracklist />
        </section>

        <section aria-label="Side B notes" className="space-y-[9vh] px-4 sm:px-6">
          {SIDE_B.map((n) => <Note key={n.mark} {...n} />)}
        </section>

        <section aria-label="Film" className="grid grid-cols-12 gap-x-5 px-4 pt-[14vh] sm:px-6">
          <MediaPanel still="/media/moon-sea.webp" video="/media/moon-sea.mp4" label="Moonlight on open water, a rendered loop" className="col-span-12 aspect-[3/4] sm:col-span-6 sm:col-start-4 md:col-span-4 md:col-start-7" />
          <Lines as="p" text="● Undertow / Open water (rendered)" className="micro col-span-12 pt-3 leading-relaxed text-mute md:col-span-2 md:col-start-11 md:pt-0" />
        </section>

        <section id="about" aria-label="About Tidewell" className="px-4 pt-[18vh] sm:px-6">
          <Note mark="● Tidewell" text={BIO} markAt="start" />
          <div className="mt-[12vh] grid grid-cols-12 gap-x-5 gap-y-12">
            <MediaPanel still="/media/moon-sea-close.webp" video="/media/moon-sea-close.mp4" label="Glitter on the water, a rendered loop" className="col-span-12 aspect-[487/754] sm:col-span-6 md:col-span-4" />
            <ol className="col-span-12 space-y-12 md:col-span-5 md:col-start-8 md:mt-[30vh]">
              {FACTS.map((f) => (
                <li key={f.n} className="grid grid-cols-[2rem_1fr] gap-x-3">
                  <span className="micro pt-1 text-mute">{f.n}.</span>
                  <div>
                    <Lines as="h3" text={f.title} className="text-xl font-bold tracking-tight md:text-2xl" />
                    <Lines text={f.text} className="mt-3 leading-relaxed text-mute" delay={0.15} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="dates" aria-labelledby="dates-h" className="grid grid-cols-12 gap-x-5 px-4 py-[16vh] sm:px-6">
          <h2 id="dates-h" className="micro col-span-12 pb-6 text-mute md:col-span-2 md:col-start-2"><Lines as="span" text="● Tide table" /></h2>
          <ul className="col-span-12 md:col-span-9">
            {DATES.map((x) => (
              <li key={x.d} className="grid grid-cols-12 items-baseline gap-x-4 border-t border-line py-4 transition-colors hover:bg-white/[0.04]">
                <span className="micro col-span-4 text-mute sm:col-span-2">{x.d}</span>
                <span className="col-span-8 text-2xl font-bold tracking-tight sm:col-span-4 md:text-3xl">{x.place}</span>
                <span className="col-span-8 col-start-5 text-mute sm:col-span-4 sm:col-start-auto">{x.venue}</span>
                <span className="micro col-span-12 text-right text-mute sm:col-span-2">{x.s}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="micro grid grid-cols-12 gap-x-5 gap-y-4 border-t border-line px-4 pt-8 pb-24 text-mute sm:px-6">
        <p className="col-span-12 md:col-span-4">© 2026 Tidewell. A concept release site. The artist, dates and venues are fictional.</p>
        <p className="col-span-6 md:col-span-4">Music generated live with WebAudio<br />Wordmark: MgOpen Moderna-derived typeface</p>
        <p className="col-span-6 text-right md:col-span-4"><a href="#top" className="transition-opacity hover:opacity-60">Back to the surface ↑</a></p>
      </footer>
    </>
  );
}
