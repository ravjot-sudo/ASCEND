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

const ABOVE = new THREE.Color("#071113"), BELOW = new THREE.Color("#04292d");
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const webgl = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
const noop = () => () => {};

function Wordmark() {
  const font = useLoader(FontLoader, "/fonts/helvetiker_bold.typeface.json");
  const geo = useMemo(() => {
    const g = new TextGeometry("UNDERTOW", { font, size: 1, depth: 0.3, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 5 });
    g.center();
    const p = g.attributes.position, R = -8; // negative radius: the word sags like a wave trough
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), th = x / R; p.setXY(i, (R + y) * Math.sin(th), (R + y) * Math.cos(th) - R); }
    g.computeVertexNormals();
    return g;
  }, [font]);
  const mesh = useRef<THREE.Mesh>(null!), mat = useRef<THREE.MeshPhysicalMaterial>(null!);
  const k = useMemo(() => (still() ? 0.2 : 1), []);
  useFrame(({ clock }, dt) => {
    const m = mesh.current, t = clock.elapsedTime;
    m.position.y = 1.1 + Math.sin(t * 0.6) * 0.08 * k;
    m.rotation.y = THREE.MathUtils.damp(m.rotation.y, signal.mx * 0.14 * k, 3, dt);
    m.rotation.x = THREE.MathUtils.damp(m.rotation.x, signal.my * 0.06 * k, 3, dt);
    m.scale.setScalar(1 + signal.bass * 0.05 * k);
    mat.current.emissiveIntensity = signal.level * 0.8 * k;
  });
  return (
    <mesh ref={mesh} geometry={geo}>
      <meshPhysicalMaterial ref={mat} color="#d9eeee" metalness={1} roughness={0.14} clearcoat={1} clearcoatRoughness={0.1} emissive="#5fe6f5" emissiveIntensity={0} />
    </mesh>
  );
}

function Rig() {
  useFrame(({ camera, scene }, dt) => {
    const p = signal.progress, under = THREE.MathUtils.smoothstep(p, 0.35, 0.65);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, signal.mx * 0.4, 2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, THREE.MathUtils.lerp(0.9, -3.4, p), 4, dt);
    camera.position.z = THREE.MathUtils.lerp(8.5, 6.8, p);
    camera.lookAt(0, THREE.MathUtils.lerp(0.7, 0.5, p), 0);
    const bg = scene.background as THREE.Color, fog = scene.fog as THREE.FogExp2;
    bg.lerpColors(ABOVE, BELOW, under); fog.color.copy(bg); fog.density = 0.03 + under * 0.06;
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
    return <div aria-hidden className="fixed inset-0 -z-10 grid place-items-center bg-[radial-gradient(60%_50%_at_50%_45%,#123236,#071113)] text-[14vw] font-bold tracking-tighter text-fg/80">UNDERTOW</div>;
  if (!ok) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.9, 8.5], fov: 35 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
        <color attach="background" args={["#071113"]} />
        <fogExp2 attach="fog" args={["#071113", 0.03]} />
        <Suspense fallback={null}>
          <Wordmark />
          <Environment resolution={256}>
            <Lightformer form="rect" intensity={4} position={[0, 5, -6]} scale={[12, 2, 1]} />
            <Lightformer intensity={2.5} color="#9ff3ff" position={[-6, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 0.6, 1]} />
            <Lightformer intensity={1.5} position={[6, -1, -1]} rotation-y={-Math.PI / 2} scale={[20, 0.6, 1]} />
            <Lightformer form="ring" intensity={3} position={[0, 1, 7]} scale={2.5} />
          </Environment>
        </Suspense>
        <mesh rotation-x={-Math.PI / 2} position-y={-1.4}>
          <planeGeometry args={[80, 80]} />
          <MeshReflectorMaterial blur={[300, 80]} resolution={512} mixBlur={1} mixStrength={30} roughness={0.85} depthScale={1.1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#061416" metalness={0.5} />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position-y={-1.41}>
          <planeGeometry args={[80, 80]} />
          <meshBasicMaterial color="#1b6a70" transparent opacity={0.35} />
        </mesh>
        <Sparkles count={50} scale={[8, 2.2, 1.5]} position={[0, 1.3, 0.4]} size={3} speed={0.35} color="#d8fbff" />
        <Sparkles count={140} scale={[16, 5, 10]} position={[0, -4, 0]} size={2.2} speed={0.6} opacity={0.6} color="#7fe9f2" />
        <Rig />
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.8} intensity={0.8} />
          <Vignette darkness={0.6} offset={0.3} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
