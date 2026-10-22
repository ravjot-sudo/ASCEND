"use client";
// Persistent WebGL layer (P2): sagging chrome wordmark (P30) over a reflective sea; scroll sinks the camera under (P3).
import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, Sparkles } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { signal } from "@/lib/signal";

const ABOVE = new THREE.Color("#000000"), BELOW = new THREE.Color("#030303");
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const webgl = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
const noop = () => () => {};

function Wordmark() {
  const font = useLoader(FontLoader, "/fonts/helvetiker_bold.typeface.json");
  const geo = useMemo(() => {
    const g = new TextGeometry("UNDERTOW", { font, size: 1, depth: 0.3, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 5 });
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
    mat.current.emissiveIntensity = signal.level * 0.45 * k;
  });
  return (
    <mesh ref={mesh} geometry={geo}>
      <meshPhysicalMaterial ref={mat} color="#ececec" metalness={1} roughness={0.12} clearcoat={1} clearcoatRoughness={0.08} emissive="#ffffff" emissiveIntensity={0} />
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
  const pts = useMemo(() => [[-3.3, 1], [-1.9, 1], [-0.5, 1], [1.1, 1], [2.4, 1], [3.4, 1], [-2.7, -1], [0.3, -1], [2.9, -1]]
    .map(([x, e], i) => { const r = 8 + 0.4 * e; return { x: r * Math.sin(x / 8), y: r * Math.cos(x / 8) - 8, ph: i * 1.9, s: 0.28 + (i % 3) * 0.08 }; }), []);
  const refs = useRef<THREE.Sprite[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((sp, i) => { const p = pts[i], k = Math.max(0, Math.sin(t * 1.1 + p.ph)); sp.scale.setScalar(p.s * (0.25 + k * k + signal.level * 0.5)); });
  });
  return pts.map((p, i) => (
    <sprite key={i} ref={(el) => { if (el) refs.current[i] = el; }} position={[p.x, p.y, 0.32]}>
      <spriteMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  ));
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
    return <div aria-hidden className="fixed inset-0 -z-10 grid place-items-center bg-[radial-gradient(60%_50%_at_50%_45%,#1c1c1c,#000000)] text-[14vw] font-bold tracking-tighter text-fg/80">UNDERTOW</div>;
  if (!ok) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.9, 10.5], fov: 35 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
        <color attach="background" args={["#000000"]} />
        <fogExp2 attach="fog" args={["#000000", 0.03]} />
        <Suspense fallback={null}>
          <Wordmark />
          <Environment resolution={256}>
            <Lightformer form="rect" intensity={4} position={[0, 5, -6]} scale={[12, 2, 1]} />
            <Lightformer intensity={2.5} position={[-6, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 0.6, 1]} />
            <Lightformer intensity={1.5} position={[6, -1, -1]} rotation-y={-Math.PI / 2} scale={[20, 0.6, 1]} />
            <Lightformer form="ring" intensity={3} position={[0, 1, 7]} scale={2.5} />
          </Environment>
        </Suspense>
        <mesh rotation-x={-Math.PI / 2} position-y={-1.4}>
          <planeGeometry args={[80, 80]} />
          <MeshReflectorMaterial blur={[300, 80]} resolution={512} mixBlur={1} mixStrength={14} mixContrast={1.3} roughness={1} depthScale={1.1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#000000" metalness={0.2} />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position-y={-1.41}>
          <planeGeometry args={[80, 80]} />
          <meshBasicMaterial color="#3a3a3e" transparent opacity={0.1} />
        </mesh>
        <Sparkles count={50} scale={[8, 2.2, 1.5]} position={[0, 1.3, 0.4]} size={3} speed={0.35} color="#ffffff" />
        <Sparkles count={140} scale={[16, 5, 10]} position={[0, -4, 0]} size={2.2} speed={0.6} opacity={0.6} color="#cfcfcf" />
        <mesh position={[0, -0.95, -14]}>
          <circleGeometry args={[0.42, 64]} />
          <meshBasicMaterial color={[1.6, 1.6, 1.6]} toneMapped={false} fog={false} />
        </mesh>
        <Rig />
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur radius={0.55} luminanceThreshold={0.9} intensity={0.7} />
          <Vignette darkness={0.6} offset={0.3} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
