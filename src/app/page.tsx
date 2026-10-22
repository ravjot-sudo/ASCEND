import Scene from "@/components/Scene";
import { MediaPanel } from "@/components/MediaPanel";
import { Gate, Notes, Player, SmoothScroll, Tracklist } from "@/components/ui";

const NOTES = [
  { mark: "Liner", text: "Undertow is four pieces about the pull you don't notice until you're already in it. No samples, no stems, no files: every note you hear is written by your browser, live, the moment you press play." },
  { mark: "I", text: "The title track starts slow and heavy, a bass line that keeps stepping back down the same five notes like a tide that won't commit." },
  { mark: "II", text: "Salt Choir is the softest thing here: voices stacked in fifths, sung by nobody, slightly out of tune on purpose." },
  { mark: "III", text: "Low Water is the one with teeth, square waves and a kick that sits right under the sternum." },
  { mark: "IV", text: "Riptide Hymn closes at a hundred and twenty: bright, major, and quicker than it should be. That's how riptides work." },
];

const DATES = [
  { d: "21.11.2026", place: "Everywhere", venue: "Release day, all platforms", s: "Out" },
  { d: "05.12.2026", place: "Ostend", venue: "Pier Hall", s: "Concept" },
  { d: "12.12.2026", place: "Rotterdam", venue: "Maassilo, Room 2", s: "Concept" },
  { d: "19.12.2026", place: "Lisbon", venue: "Armazém 16", s: "Concept" },
  { d: "09.01.2027", place: "Reykjavík", venue: "Harbour Shed", s: "Concept" },
];

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Scene />
      <div aria-hidden className="dots pointer-events-none fixed inset-0 -z-[5]" />
      <Gate />
      <Player />

      <header className="micro fixed inset-x-0 top-0 z-30 grid grid-cols-12 gap-x-5 px-4 pt-4 sm:px-6">
        <a href="#top" className="col-span-3 font-semibold hover:text-glint md:col-span-2">Tidewell°</a>
        <nav aria-label="Sections" className="col-span-5 hidden gap-8 md:flex">
          <a href="#tracks" className="hover:text-glint">Listen</a>
          <a href="#notes" className="hover:text-glint">Notes</a>
          <a href="#dates" className="hover:text-glint">Tide table</a>
        </nav>
        <p className="col-span-7 leading-snug md:col-span-4">
          “Undertow” debut EP<br /><span className="text-mute">Side A:</span> Undertow, Salt Choir<br /><span className="text-mute">Side B:</span> Low Water, Riptide Hymn<br />21.11.2026 · 00:00<br /><span className="text-mute">Generated live · ©2026</span>
        </p>
        <a href="#tracks" className="col-span-2 text-right hover:text-glint md:col-span-1">Play ↓</a>
      </header>

      <main id="top">
        <section className="relative h-[220vh]">
          <h1 className="sr-only">Tidewell, Undertow EP</h1>
          <div className="micro pointer-events-none absolute inset-x-0 top-0 h-svh">
            <span className="absolute top-1/2 left-4 sm:left-6">EP</span>
            <span className="absolute top-1/2 right-4 sm:right-6">I–IV</span>
            <span className="absolute bottom-6 left-6 hidden text-mute sm:block">WebAudio · 4 tracks</span>
            <span className="absolute bottom-20 left-1/2 -translate-x-1/2 text-mute sm:bottom-6">Scroll to go under ↓</span>
          </div>
        </section>

        <section id="notes" aria-label="Sleeve notes" className="px-4 py-[16vh] sm:px-6">
          <Notes items={NOTES} />
        </section>

        <section aria-label="Film" className="grid grid-cols-12 gap-x-5 px-4 pt-[6vh] sm:px-6">
          <MediaPanel still="/media/moon-sea.webp" video="/media/moon-sea.mp4" label="Moonlight on open water, a rendered loop" className="col-span-12 aspect-[3/4] sm:col-span-6 sm:col-start-4 md:col-span-4 md:col-start-7" />
          <p className="micro col-span-12 pt-3 leading-relaxed text-mute md:col-span-2 md:col-start-11 md:pt-0">● Undertow<br />Open water (rendered)</p>
        </section>

        <section id="tracks" aria-label="Tracklist" className="px-4 py-[14vh] sm:px-6">
          <Tracklist />
        </section>

        <section id="dates" aria-labelledby="dates-h" className="grid grid-cols-12 gap-x-5 px-4 py-[14vh] sm:px-6">
          <h2 id="dates-h" className="micro col-span-12 pb-6 text-mute md:col-span-2 md:col-start-2">● Tide table</h2>
          <ul className="col-span-12 md:col-span-9">
            {DATES.map((x) => (
              <li key={x.d} className="grid grid-cols-12 items-baseline gap-x-4 border-t border-line py-4 transition-colors hover:text-glint">
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
        <p className="col-span-6 text-right md:col-span-4"><a href="#top" className="hover:text-glint">Back to the surface ↑</a></p>
      </footer>
    </>
  );
}
