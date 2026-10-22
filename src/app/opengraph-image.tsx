// Open Graph card, generated at build: the ASCEND artwork beside the title, on the site's own black.
import { ImageResponse } from "next/og";
import { COVER } from "./og-asset";

export const contentType = "image/png";
export const alt = "ASCEND — the debut EP from Tidewell, streaming live";
export const size = { width: 1200, height: 630 };

const mm = (x: number, y: number, w: number, o: number) => ({
  position: "absolute", left: x, top: y, width: w, height: 2, opacity: o,
  backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.85), rgba(255,255,255,0))",
  transform: "rotate(-38deg)",
} as const);

const dot = (x: number, y: number, s: number, o: number) => ({
  position: "absolute", left: x, top: y, width: s, height: s,
  borderRadius: 9999, backgroundColor: "#ffffff", opacity: o, display: "flex",
} as const);

export default () =>
  new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", position: "relative",
          backgroundColor: "#000",
          backgroundImage: "radial-gradient(900px 500px at 62% 15%, #14141c 0%, #000000 70%)",
          color: "#f4f5ff",
          fontFamily: "Geist",
        }}
      >
        {/* chrome word sparkle, echoing the artwork */}
        <div style={mm(-140, 330, 460, 0.5)} />
        <div style={mm(-40, 200, 380, 0.35)} />
        <div style={mm(1010, 60, 360, 0.55)} />
        <div style={dot(1180, 96, 7, 0.9)} />
        <div style={dot(1052, 128, 4, 0.55)} />
        <div style={dot(930, 40, 3, 0.4)} />

        {/* the artwork */}
        <div style={{ position: "absolute", left: 64, top: 145, display: "flex" }}>
          <img src={COVER} width={360} height={360} style={{ objectFit: "cover", borderRadius: 4 }} />
        </div>

        {/* the title block */}
        <div style={{ position: "absolute", left: 470, top: 40, display: "flex", flexDirection: "column" }}>
          <p style={{ margin: 0, marginTop: 118, display: "flex", fontSize: 21, letterSpacing: 7, color: "#9a9aa4" }}>
            TIDEWELL° · PRESENTING PEGASSI
          </p>
          <div style={{ display: "flex", fontSize: 188, fontWeight: 700, letterSpacing: -6, marginTop: 16, textShadow: "0 0 64px rgba(186,192,255,0.4)", marginLeft: -6 }}>
            ASCEND
          </div>
          <p style={{ margin: 0, display: "flex", fontSize: 23, letterSpacing: 5, color: "#c9c9d2" }}>
            THE DEBUT EP · FOUR TRACKS · STREAMS LIVE
          </p>
          <p style={{ margin: 0, marginTop: 26, display: "flex", fontSize: 19, letterSpacing: 3, color: "#65656e" }}>
            ascend-music.vercel.app
          </p>
        </div>
      </div>
    ),
    { ...size },
  );
