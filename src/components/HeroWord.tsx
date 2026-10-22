"use client";
// The hero word, bound to its own box like the reference's wordmark (a GL view synced to the element: 83% of the
// content width, 2496:1173, centred in the first screen). Ours is real 3D: the ASCEND outlines traced from the
// artwork (ascend-shapes.json), extruded and bevelled, with the artwork's chrome lettering on the face and dark
// gunmetal chrome on the bevels; a soft white glow and twinkling streak stars at the letter tips.
// Motion (reference constants): flips in from pi and 2x the camera distance over 1.5 s expo-out once the gate
// opens; leans toward the pointer (0.15 rad, soft 0.06 smoothing, stars lean a little further); scroll progress of
// the box (page top -> box bottom at the viewport top) turns it back 0.08 pi, pushes it 0.3x deeper and drifts the
// box down 12% of its height.
import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, useTexture } from "@react-three/drei";
import { signal } from "@/lib/signal";
import wordShapes from "./ascend-shapes.json";

const ART = { w: 1340, h: 588 };                 // the word crop, px
const WW = 2, WH = (WW * ART.h) / ART.w;         // word size in scene units
const ASPECT = 2496 / 1173, FOV = 30;
const CAM_Z = (WW / 0.94) / (2 * Math.tan(((FOV / 2) * Math.PI) / 180) * ASPECT); // word fills 94% of the box width
const LEAN = 0.15, EASE = 0.06, FLIP = Math.PI, DEPTH = 2, TURN = Math.PI * 0.08, RECEDE = 0.3, INTRO = 1.5;
const expoOut = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const box = { progress: 0 }; // scroll progress of the DOM box, written by the wrapper
const toWord = ([x, y]: number[]) => [(x / ART.w - 0.5) * WW, (0.5 - y / ART.h) * WH] as const;

function useWordGeometry() {
  return useMemo(() => {
    const { shapes } = wordShapes as { shapes: { outer: number[][]; holes: number[][][] }[] };
    const P = (p: number[]) => new THREE.Vector2(...toWord(p));
    const list = shapes.map((sh) => { const shape = new THREE.Shape(sh.outer.map(P)); shape.holes = sh.holes.map((hole) => new THREE.Path(hole.map(P))); return shape; });
    const uv: THREE.UVGenerator = {
      generateTopUV: (_g, v, a, b, c) => [a, b, c].map((i) => new THREE.Vector2(v[i * 3] / WW + 0.5, v[i * 3 + 1] / WH + 0.5)),
      generateSideWallUV: () => [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()],
    };
    const g = new THREE.ExtrudeGeometry(list, { depth: 0.034, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.006, bevelSegments: 3, UVGenerator: uv });
    g.translate(0, 0, -0.017);
    return g;
  }, []);
}

// The word itself, shared by the hero and the mini on the CD: the artwork's chrome lettering glowing on the caps
// (it brightens with the music) and dark gunmetal chrome on the bevels and sides.
export function WordMesh() {
  const tex = useTexture("/media/ascend-word.webp", (t) => { for (const x of [t].flat()) x.colorSpace = THREE.SRGBColorSpace; });
  const geo = useWordGeometry(), cap = useRef<THREE.MeshPhysicalMaterial>(null!);
  useFrame(() => { cap.current.emissiveIntensity = 1 + signal.level * 0.25; });
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial attach="material-0" ref={cap} color="#000000" emissive="#ffffff" emissiveMap={tex} emissiveIntensity={1} metalness={1} roughness={0.22} clearcoat={1} clearcoatRoughness={0.1} toneMapped={false} />
      <meshPhysicalMaterial attach="material-1" color="#6b6c72" metalness={1} roughness={0.28} clearcoat={0.5} envMapIntensity={0.8} />
    </mesh>
  );
}

// Studio light for the chrome (no HDR download).
export function WordLight() {
  return (
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={4} color="#eef0ff" position={[0, 4, -4]} scale={[10, 2, 1]} />
      <Lightformer intensity={2} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[16, 0.6, 1]} />
      <Lightformer intensity={1.2} position={[5, -1, -1]} rotation-y={-Math.PI / 2} scale={[16, 0.6, 1]} />
      <Lightformer form="ring" intensity={2.5} position={[0, 1, 5]} scale={2} />
    </Environment>
  );
}

// Star glints at letter tips (word-crop px), each a soft 4-point star with a long diagonal streak.
const TIPS: [number, number][] = [[35, 556], [345, 82], [470, 40], [640, 26], [830, 24], [1100, 40], [1290, 300], [1225, 440], [255, 300]];
function Stars() {
  const [star, streak] = useMemo(() => {
    const s = 128, h = s / 2, c = document.createElement("canvas"); c.width = c.height = s;
    const g = c.getContext("2d")!, rg = g.createRadialGradient(h, h, 0, h, h, h);
    rg.addColorStop(0, "#fff"); rg.addColorStop(0.2, "rgba(255,255,255,.5)"); rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.beginPath(); g.moveTo(h, 0);
    g.quadraticCurveTo(h, h, s, h); g.quadraticCurveTo(h, h, h, s); g.quadraticCurveTo(h, h, 0, h); g.quadraticCurveTo(h, h, h, 0); g.fill();
    const w = 256, c2 = document.createElement("canvas"); c2.width = w; c2.height = 8;
    const g2 = c2.getContext("2d")!, lg = g2.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, "rgba(255,255,255,0.95)"); lg.addColorStop(1, "rgba(255,255,255,0)");
    g2.fillStyle = lg; g2.fillRect(0, 3, w, 2);
    return [new THREE.CanvasTexture(c), new THREE.CanvasTexture(c2)];
  }, []);
  const pts = useMemo(() => TIPS.map((p, i) => ({ p: toWord(p), ph: i * 1.7, s: 0.07 + (i % 3) * 0.018 })), []);
  const stars = useRef<THREE.Sprite[]>([]), rays = useRef<THREE.Sprite[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    pts.forEach((pt, i) => {
      const k = Math.max(0, Math.sin(t * 1.1 + pt.ph)), s = pt.s * (0.35 + k * k + signal.level * 0.4);
      stars.current[i]?.scale.setScalar(s);
      rays.current[i]?.scale.set(s * 9, s * 0.16, 1);
    });
  });
  return pts.map((pt, i) => (
    <group key={i} position={[pt.p[0], pt.p[1], 0.03]}>
      <sprite ref={(el) => { if (el) stars.current[i] = el; }}>
        <spriteMaterial map={star} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite ref={(el) => { if (el) rays.current[i] = el; }}>
        <spriteMaterial map={streak} rotation={0.75} opacity={0.75} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  ));
}

function Word() {
  const word = useRef<THREE.Group>(null!), stars = useRef<THREE.Group>(null!);
  const born = useRef(0), tilt = useRef(new THREE.Vector2());
  useEffect(() => {
    const on = () => { born.current = performance.now(); };
    if (document.documentElement.classList.contains("entered")) born.current = performance.now() - INTRO * 1000; // returning visitor: no intro
    addEventListener("undertow:entered", on);
    return () => removeEventListener("undertow:entered", on);
  }, []);
  useFrame(({ clock }, dt) => {
    const calm = still();
    const since = born.current ? (performance.now() - born.current) / 1000 : 0;
    const intro = calm ? 1 : born.current ? expoOut(Math.min(1, since / INTRO)) : 0, n = 1 - intro, scroll = box.progress;
    const t = tilt.current;
    if (calm) t.set(0, 0); else { const k = Math.min(1, EASE * dt * 60); t.x += (signal.mx - t.x) * k; t.y += (signal.my - t.y) * k; }
    const float = calm ? 0 : Math.sin(clock.elapsedTime * 0.8) * 0.012;
    const w = word.current;
    w.rotation.set(t.y * LEAN + n * FLIP + scroll * TURN, t.x * LEAN, 0);
    w.position.set(0, float, -(n * DEPTH + scroll * RECEDE) * CAM_Z);
    w.visible = born.current > 0 || calm;
    const st = stars.current; // the star layer leans a touch further (parallax) and only shows once the word has landed
    st.rotation.set(t.y * LEAN * 1.15 + scroll * TURN, t.x * LEAN * 1.15, 0);
    st.position.copy(w.position);
    st.visible = intro > 0.92;
  });
  return (
    <>
      <group ref={word}><WordMesh /></group>
      <group ref={stars}><Stars /></group>
    </>
  );
}

const webgl = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
let gl: boolean | undefined;
const noop = () => () => {};
export const useWebGL = () => useSyncExternalStore(noop, () => (gl ??= webgl()), () => null); // probed once

export function HeroWord() {
  const el = useRef<HTMLDivElement>(null);
  const ok = useWebGL();
  useEffect(() => {
    const node = el.current!;
    let end = 1;
    const measure = () => { const r = node.getBoundingClientRect(); end = Math.max(1, r.bottom + scrollY - node.offsetHeight * box.progress * 0.12); };
    const on = () => {
      box.progress = Math.min(1, Math.max(0, scrollY / end));
      node.style.translate = `0 ${node.offsetHeight * 0.12 * box.progress}px`;
    };
    measure(); on();
    addEventListener("scroll", on, { passive: true }); addEventListener("resize", measure);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", measure); };
  }, []);
  return (
    <div ref={el} className="hero-word relative z-10 w-full aspect-[2496/1173] s:w-[83%]">
      {ok === false && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/media/ascend-word.webp" alt="" className="absolute inset-0 size-full object-contain" />
      )}
      {ok && (
        <Canvas className="hero-canvas !absolute inset-0" dpr={[1, 2]} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }} camera={{ position: [0, 0, CAM_Z], fov: FOV }}>
          <Suspense fallback={null}>
            <WordLight />
            <Word />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
