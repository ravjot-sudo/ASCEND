"use client";
// Persistent WebGL layer (P2): the ASCEND artwork (word + scene layers) over a night sea; scroll sinks the camera under (P3).
import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { signal } from "@/lib/signal";
import wordShapes from "./ascend-shapes.json";

const ABOVE = new THREE.Color("#000000"), BELOW = new THREE.Color("#030303");
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let gl: boolean | undefined; // probe once: useSyncExternalStore calls getSnapshot on every render
const webgl = () => (gl ??= (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } })());
const noop = () => () => {};

// 1 = the hero artwork is fully shown, 0 = scrolled away / under the sea. Written by HeroArt,
// read by the sea elements so they stay hidden while the artwork is on screen.
const artState = { t: 1 };

// The ASCEND artwork lives inside the scene as two layers cut from the cover: the door-and-stairs scene (the word
// knocked out) and the word itself as a real 3D object: the letter outlines traced from the artwork
// (ascend-shapes.json), extruded and bevelled, with the artwork's own chrome lettering on the front face and mirror
// chrome on the bevels and sides, so head-on it is the picture and as it turns it is a solid. The click that enters
// sets a born-time (the picture settles from a slight over-scale, the pop) and scrolling dissolves it into the sea.
//
// Word motion (reference constants, rebuilt): flips in from pi and from 2x the camera distance over 1.5 s expo-out;
// leans toward the pointer (0.15 rad) with soft smoothing (0.06 per frame) and a slow idle float; scrolling turns it
// back 0.08 pi, pushes it 0.3x further away and drifts it down 12% of its height.
const WORD = { w: 1340 / 1600, h: 588 / 1600, y: 0.5 - 406 / 1600 }; // crop of the 1600px cover, in cover units
const LEAN = 0.15, EASE = 0.06, FLIP = Math.PI, DEPTH = 2, TURN = Math.PI * 0.08, RECEDE = 0.3, INTRO = 1.5;
const expoOut = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

function useWordGeometry() {
  return useMemo(() => {
    const { w, h, shapes } = wordShapes as { w: number; h: number; shapes: { outer: number[][]; holes: number[][][] }[] };
    const P = ([x, y]: number[]) => new THREE.Vector2((x / w - 0.5) * WORD.w, (0.5 - y / h) * WORD.h);
    const list = shapes.map((sh) => { const shape = new THREE.Shape(sh.outer.map(P)); shape.holes = sh.holes.map((hole) => new THREE.Path(hole.map(P))); return shape; });
    // Front and back caps sample the artwork in cover units; side walls get a flat uv (their material has no map).
    const uv: THREE.UVGenerator = {
      generateTopUV: (_g, v, a, b, c) => [a, b, c].map((i) => new THREE.Vector2(v[i * 3] / WORD.w + 0.5, v[i * 3 + 1] / WORD.h + 0.5)),
      generateSideWallUV: () => [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()],
    };
    const g = new THREE.ExtrudeGeometry(list, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.0025, bevelSegments: 3, UVGenerator: uv });
    g.translate(0, 0, -0.007); // slab centred on its pivot so it turns about its middle
    return g;
  }, []);
}

function HeroArt() {
  const [sceneTex, wordTex] = useTexture(["/media/ascend-scene.jpg", "/media/ascend-word.webp"], (loaded) => {
    for (const t of [loaded].flat()) t.colorSpace = THREE.SRGBColorSpace;
  });
  const geo = useWordGeometry();
  const group = useRef<THREE.Group>(null!), word = useRef<THREE.Mesh>(null!), mat = useRef<THREE.MeshBasicMaterial>(null!);
  const cap = useRef<THREE.MeshPhysicalMaterial>(null!), side = useRef<THREE.MeshPhysicalMaterial>(null!);
  const born = useRef(0), tilt = useRef(new THREE.Vector2());
  useEffect(() => {
    const on = () => { born.current = performance.now(); };
    if (!born.current && document.documentElement.classList.contains("entered")) born.current = performance.now() - INTRO * 1000; // returning visitor: no intro
    addEventListener("undertow:entered", on);
    return () => removeEventListener("undertow:entered", on);
  }, []);
  useFrame(({ camera, clock }, dt) => {
    const cam = camera as THREE.PerspectiveCamera, calm = still();
    const fov = (cam.fov * Math.PI) / 180, dist = camera.position.z + 16;
    const visH = 2 * dist * Math.tan(fov / 2), visW = visH * cam.aspect;
    const since = born.current ? (performance.now() - born.current) / 1000 : 0;
    const S = Math.min(visW, visH) * (1 + (calm ? 0 : 0.08 * (born.current ? Math.max(0, 1 - since / 0.9) : 1)));
    const g = group.current;
    g.scale.setScalar(S);
    g.position.x = calm ? 0 : g.position.x + (signal.mx * 0.35 - g.position.x) * Math.min(1, dt * 3);
    const fade = 1 - THREE.MathUtils.smoothstep(signal.progress, 0.22, 0.6);
    artState.t = fade;
    mat.current.opacity = fade; cap.current.opacity = fade; side.current.opacity = fade;

    // the word
    const intro = calm ? 1 : born.current ? expoOut(Math.min(1, since / INTRO)) : 0, n = 1 - intro, scroll = signal.progress;
    const t = tilt.current;
    if (calm) t.set(0, 0); else { const k = Math.min(1, EASE * dt * 60); t.x += (signal.mx - t.x) * k; t.y += (signal.my - t.y) * k; }
    const float = calm ? 0 : Math.sin(clock.elapsedTime * 0.8) * 0.006;
    const w = word.current;
    w.rotation.set(t.y * LEAN + n * FLIP + scroll * TURN, t.x * LEAN, 0);
    w.position.set(0, WORD.y - 0.12 * WORD.h * scroll + float, 0.03 - ((n * DEPTH + scroll * RECEDE) * dist) / S);
    cap.current.emissiveIntensity = 1 + signal.level * 0.25;
  });
  return (
    <group ref={group} position={[0, 0.45, -16]}>
      {/* drawn over the sea (no depth test) so the horizon never crops the stairs; it fades out before the descent */}
      <mesh renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial ref={mat} map={sceneTex} transparent depthWrite={false} depthTest={false} fog={false} toneMapped={false} />
      </mesh>
      <mesh ref={word} geometry={geo} renderOrder={2}>
        {/* front/back: the artwork's lettering glowing through mirror chrome; bevels and sides: dark gunmetal chrome, like the art's outline */}
        <meshPhysicalMaterial attach="material-0" ref={cap} color="#000000" emissive="#ffffff" emissiveMap={wordTex} emissiveIntensity={1} metalness={1} roughness={0.22} clearcoat={1} clearcoatRoughness={0.1} toneMapped={false} transparent fog={false} />
        <meshPhysicalMaterial attach="material-1" ref={side} color="#6b6c72" metalness={1} roughness={0.28} clearcoat={0.5} envMapIntensity={0.8} transparent fog={false} />
      </mesh>
    </group>
  );
}

// The moon's light path on the water: a baked falloff of broken horizontal glitter, additive, pulsing with the music.
// Seeded PRNG (mulberry32): the glitter pattern is the same on every render and every visit.
const seeded = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function MoonRoad() {
  const tex = useMemo(() => {
    const rnd = seeded(7), w = 64, h = 512, c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d")!, img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const v = y / (h - 1), row = rnd() > 0.45 ? 1 : 0.12; // v: 0 under the moon, 1 toward the viewer
      for (let x = 0; x < w; x++) {
        const u = (x / (w - 1)) * 2 - 1, spread = 0.2 + v * 0.8;
        const a = Math.min(1, Math.exp(-((u / spread) ** 2) * 5) * (1 - v) ** 1.6 * row * (0.7 + rnd() * 0.3) * 1.5);
        const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a * 255;
      }
    }
    g.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  }, []);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(({ clock }) => { mat.current.opacity = (0.6 + Math.sin(clock.elapsedTime * 2.3) * 0.12 + signal.level * 0.35) * (1 - artState.t); }); // hidden while the artwork is up
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.39, -7.6]}>
      <planeGeometry args={[2.6, 13]} />
      <meshBasicMaterial ref={mat} map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

// The surface seen from below; only drawn once the camera is under the water.
function Underside() {
  const m = useRef<THREE.Mesh>(null!);
  useFrame(({ camera }) => { m.current.visible = camera.position.y < -1.41; });
  return (
    <mesh ref={m} rotation-x={Math.PI / 2} position-y={-1.41}>
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial color="#3a3a3e" transparent opacity={0.1} />
    </mesh>
  );
}

// Narrow screens push the camera back, so the same bloom covers more of the frame: tone it down there.
function Effects() {
  const narrow = useThree((s) => s.size.width < 640);
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur radius={narrow ? 0.4 : 0.55} luminanceThreshold={0.9} intensity={narrow ? 0.35 : 0.7} />
      <Vignette darkness={0.6} offset={0.3} />
    </EffectComposer>
  );
}

// The moon and its dust stay hidden while the artwork is up; they surface as it dissolves.
function SeaDust() {
  const g = useRef<THREE.Group>(null!);
  useFrame(() => { g.current.visible = artState.t < 0.4; });
  return (
    <group ref={g}>
      <Sparkles count={50} scale={[8, 2.2, 1.5]} position={[0, 1.3, 0.4]} size={3} speed={0.35} color="#ffffff" />
      <Sparkles count={140} scale={[16, 5, 10]} position={[0, -4, 0]} size={2.2} speed={0.6} opacity={0.6} color="#cfcfcf" />
    </group>
  );
}

// The moon's disc on the horizon, dimmed to nothing while the artwork is on screen.
function MoonGlow() {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(() => { mat.current.opacity = 1 - artState.t; });
  return (
    <mesh position={[0, -0.95, -14]}>
      <circleGeometry args={[0.42, 64]} />
      <meshBasicMaterial ref={mat} color={[1.6, 1.6, 1.6]} toneMapped={false} fog={false} transparent />
    </mesh>
  );
}

function Rig() {
  useFrame(({ camera, scene }, dt) => {
    const p = signal.progress, under = THREE.MathUtils.smoothstep(p, 0.35, 0.65);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, signal.mx * 0.4, 2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, THREE.MathUtils.lerp(0.9, -3.4, p), 4, dt);
    const fit = Math.max(1, 1.9 / (camera as THREE.PerspectiveCamera).aspect); // keep the whole word in frame on narrow screens
    camera.position.z = THREE.MathUtils.lerp(10.5, 8.5, p) * fit;
    camera.lookAt(0, THREE.MathUtils.lerp(0.7, 0.5, p), 0);
    const bg = scene.background as THREE.Color, fog = scene.fog as THREE.FogExp2;
    bg.lerpColors(ABOVE, BELOW, under); fog.color.copy(bg); fog.density = (0.03 + under * 0.06) / fit; // farther camera on narrow screens must not fog out the scene
  });
  return null;
}

export default function Scene() {
  const ok = useSyncExternalStore(noop, webgl, () => null);
  useEffect(() => {
    const mv = (e: PointerEvent) => { signal.mx = (e.clientX / innerWidth) * 2 - 1; signal.my = (e.clientY / innerHeight) * 2 - 1; };
    addEventListener("pointermove", mv);
    return () => removeEventListener("pointermove", mv);
  }, []);
  if (ok === false)
    return <div aria-hidden className="fixed inset-0 -z-10 grid place-items-center bg-[radial-gradient(60%_50%_at_50%_45%,#1c1c1c,#000000)] text-[14vw]   font-bold tracking-tighter text-fg/80">ASCEND</div>;
  if (!ok) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ opacity: "var(--scene, 1)" }}>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.9, 10.5], fov: 35 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
        <color attach="background" args={["#000000"]} />
        <fogExp2 attach="fog" args={["#000000", 0.03]} />
        <Suspense fallback={null}>
          <HeroArt />
          <Environment resolution={256}>
            <Lightformer form="rect" intensity={4} color="#eef0ff" position={[0, 5, -6]} scale={[12, 2, 1]} />
            <Lightformer intensity={2.5} position={[-6, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 0.6, 1]} />
            <Lightformer intensity={1.5} color="#8e95c7" position={[6, -1, -1]} rotation-y={-Math.PI / 2} scale={[20, 0.6, 1]} />
            <Lightformer form="ring" intensity={3} position={[0, 1, 7]} scale={2.5} />
          </Environment>
        </Suspense>
        <mesh rotation-x={-Math.PI / 2} position-y={-1.4}>
          <planeGeometry args={[80, 80]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <MoonRoad />
        <Underside />
        <SeaDust />
        <MoonGlow />
        <Rig />
        <Effects />
      </Canvas>
    </div>
  );
}
