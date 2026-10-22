"use client";
// Persistent WebGL layer (P2): sagging chrome wordmark (P30) over a reflective sea; scroll sinks the camera under (P3).
import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { signal } from "@/lib/signal";

const ABOVE = new THREE.Color("#000000"), BELOW = new THREE.Color("#030303");
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let gl: boolean | undefined; // probe once: useSyncExternalStore calls getSnapshot on every render
const webgl = () => (gl ??= (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } })());
const noop = () => () => {};

// 1 = the hero artwork is fully shown, 0 = scrolled away / under the sea. Written by HeroArt,
// read by the sea elements so they stay hidden while the artwork is on screen.
const artState = { t: 1 };

// The cover artwork lives inside the scene, behind the chrome word: the click that enters sets a
// born-time (the picture settles from a slight over-scale — the pop) and scrolling dissolves it
// into the sea the word floats over. Contain-fit against the frustum; the artwork's own black
// surround blends into the page, so its edges never show.
function HeroArt() {
  const tex = useTexture("/media/ascend-cover.jpeg");
  const mesh = useRef<THREE.Mesh>(null!), mat = useRef<THREE.MeshBasicMaterial>(null!);
  const born = useRef(0);
  useEffect(() => {
    const on = () => { born.current = performance.now(); };
    if (!born.current && document.documentElement.classList.contains("entered")) born.current = performance.now() - 900; // returning visitor: no pop
    addEventListener("undertow:entered", on);
    return () => removeEventListener("undertow:entered", on);
  }, []);
  useFrame(({ camera }, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const fov = (cam.fov * Math.PI) / 180, dist = camera.position.z + 16;
    const visH = 2 * dist * Math.tan(fov / 2), visW = visH * cam.aspect;
    mesh.current.scale.setScalar(Math.min(visW, visH) * (1 + (still() ? 0 : 0.08 * (born.current ? Math.max(0, 1 - (performance.now() - born.current) / 900) : 1))));
    mesh.current.position.x = still() ? 0 : mesh.current.position.x + (signal.mx * 0.35 - mesh.current.position.x) * Math.min(1, dt * 3);
    const fade = 1 - THREE.MathUtils.smoothstep(signal.progress, 0.22, 0.6);
    artState.t = fade;
    mat.current.opacity = fade;
  });
  return (
    <mesh ref={mesh} position={[0, 0.45, -16]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={mat} map={tex} map-colorSpace="srgb" transparent depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  );
}

function Wordmark() {
  const font = useLoader(FontLoader, "/fonts/helvetiker_bold.typeface.json");
  const geo = useMemo(() => {
    const g = new TextGeometry("ASCEND", { font, size: 1, depth: 0.3, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 5 });
    g.center();
    const p = g.attributes.position, R = 8; // positive radius: the word arches over the moon
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), th = x / R; p.setXY(i, (R + y) * Math.sin(th), (R + y) * Math.cos(th) - R); }
    g.computeVertexNormals();
    return g;
  }, [font]);
  const mesh = useRef<THREE.Mesh>(null!), mat = useRef<THREE.MeshPhysicalMaterial>(null!);
  const k = useMemo(() => (still() ? 0.2 : 1), []);
  useFrame(({ clock }, dt) => {
    const m = mesh.current, t = clock.elapsedTime;
    m.position.y = 1.5 + Math.sin(t * 0.6) * 0.08 * k;
    m.rotation.y = THREE.MathUtils.damp(m.rotation.y, signal.mx * 0.14 * k, 3, dt);
    m.rotation.x = THREE.MathUtils.damp(m.rotation.x, signal.my * 0.06 * k, 3, dt);
    m.scale.setScalar(1 + signal.bass * 0.05 * k);
    mat.current.emissiveIntensity = 0.12 + signal.level * 0.45 * k;
  });
  return (
    <mesh ref={mesh} geometry={geo}>
      <meshPhysicalMaterial ref={mat} color="#e2e5ff" metalness={1} roughness={0.12} clearcoat={1} clearcoatRoughness={0.08} emissive="#c9cdff" emissiveIntensity={0} />
      <Glints />
    </mesh>
  );
}

// Four-point star glints riding the top and bottom edges of the arched word; they twinkle and swell with the music.
function Glints() {
  const tex = useMemo(() => {
    const s = 128, h = s / 2, c = document.createElement("canvas"); c.width = c.height = s;
    const g = c.getContext("2d")!, rg = g.createRadialGradient(h, h, 0, h, h, h);
    rg.addColorStop(0, "#fff"); rg.addColorStop(0.2, "rgba(255,255,255,.5)"); rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.beginPath(); g.moveTo(h, 0);
    g.quadraticCurveTo(h, h, s, h); g.quadraticCurveTo(h, h, h, s); g.quadraticCurveTo(h, h, 0, h); g.quadraticCurveTo(h, h, h, 0); g.fill();
    return new THREE.CanvasTexture(c);
  }, []);
  const pts = useMemo(() => [[-2.5, 1], [-1.4, 1], [-0.4, 1], [0.8, 1], [1.8, 1], [2.6, 1], [-2, -1], [0.2, -1], [2.2, -1]]
    .map(([x, e], i) => { const r = 8 + 0.4 * e; return { x: r * Math.sin(x / 8), y: r * Math.cos(x / 8) - 8, ph: i * 1.9, s: 0.28 + (i % 3) * 0.08 }; }), []);
  // Long thin diagonal flare through each glint (soft-ended line, rotated ~40°).
  const streak = useMemo(() => {
    const w = 256, h = 8, c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d")!, lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, "rgba(255,255,255,0.9)"); lg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = lg; g.fillRect(0, h / 2 - 1, w, 2);
    return new THREE.CanvasTexture(c);
  }, []);
  const refs = useRef<THREE.Sprite[]>([]), rays = useRef<THREE.Sprite[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((sp, i) => {
      const p = pts[i], k = Math.max(0, Math.sin(t * 1.1 + p.ph)), s = p.s * (0.25 + k * k + signal.level * 0.5);
      sp.scale.setScalar(s);
      rays.current[i]?.scale.set(s * 7, s * 0.22, 1);
    });
  });
  return pts.map((p, i) => (
    <group key={i} position={[p.x, p.y, 0.32]}>
      <sprite ref={(el) => { if (el) refs.current[i] = el; }}>
        <spriteMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite ref={(el) => { if (el) rays.current[i] = el; }}>
        <spriteMaterial map={streak} rotation={0.7} opacity={0.7} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  ));
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
          <Wordmark />
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
