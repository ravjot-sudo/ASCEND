// Front cover for the gate: our moonlit-sea render with a vector chrome wordmark arched over the moon.
// Pure SVG/HTML so it stays sharp at any size; the glints twinkle in CSS.
const STAR = "M0 -1 Q0 0 1 0 Q0 0 0 1 Q0 0 -1 0 Q0 0 0 -1Z";
const GLINTS: [number, number, number, number][] = [ // x, y, size, delay
  [118, 205, 15, 0], [212, 146, 10, 0.9], [301, 128, 18, 0.4], [392, 146, 11, 1.4], [486, 200, 16, 0.7], [530, 248, 9, 1.9], [80, 262, 8, 1.2],
];

export function Cover() {
  return (
    <span className="cover" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/moon-sea.webp" alt="" className="absolute inset-0 size-full object-cover object-[50%_42%]" />
      <span className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_45%,transparent_40%,rgb(0_0_0/0.75))]" />
      <svg viewBox="0 0 600 600" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.36" stopColor="#c3c6ca" />
            <stop offset="0.5" stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#5d6066" />
            <stop offset="0.82" stopColor="#d9dbde" />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <path id="arc" d="M 62 268 Q 300 70 538 268" />
        </defs>
        <text x="300" y="46" textAnchor="middle" fill="#bdbdbd" fontSize="11" letterSpacing="2.4" style={{ fontFamily: "var(--font-geist-mono)" }}>
          TIDEWELL° · FIRST RECORD · FOUR LIVE PIECES
        </text>
        <text filter="url(#glow)" fill="url(#chrome)" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.4" paintOrder="stroke" fontSize="104" fontWeight="800" letterSpacing="-3" style={{ fontFamily: "var(--font-geist-sans)" }}>
          <textPath href="#arc" startOffset="50%" textAnchor="middle" textLength="452" lengthAdjust="spacingAndGlyphs">UNDERTOW</textPath>
        </text>
        {GLINTS.map(([x, y, s, d]) => (
          <path key={`${x}-${y}`} d={STAR} fill="#fff" className="twinkle" style={{ transform: `translate(${x}px, ${y}px) scale(${s})`, animationDelay: `${d}s` }} />
        ))}
        <text x="300" y="574" textAnchor="middle" fill="#8d8d8d" fontSize="10" letterSpacing="2" style={{ fontFamily: "var(--font-geist-mono)" }}>
          EP · 21.11.2026
        </text>
      </svg>
    </span>
  );
}
