"use client";
// The hero's 3D ASCEND in miniature, printed on the CD (gate sleeve and player). It turns with the disc inside the
// GL view rather than with the CSS spin, so the studio light stays put and the chrome bevels catch it as the word
// comes round (like the sheen on the disc itself), and the whole label leans toward the pointer.
import * as THREE from "three";
import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { WordLight, WordMesh, useWebGL } from "./HeroWord";

const FOV = 20, CAM_Z = 1 / Math.tan(((FOV / 2) * Math.PI) / 180); // the disc fills the view: radius 1 at z = 0
// Word = 46% of the disc's width, lifted so the arch wraps round the spindle hole and stays on the black label
// (radius .48; outline fitted from ascend-shapes.json: furthest point .45, hole clear).
const SIZE = 0.46, LIFT = 0.09, LEAN = 0.35, EASE = 0.06;

function Label({ period, spinning }: { period: number; spinning: boolean }) {
  const lean = useRef<THREE.Group>(null!), spin = useRef<THREE.Group>(null!);
  const aim = useRef(new THREE.Vector2()), tilt = useRef(new THREE.Vector2()), angle = useRef(0);
  const el = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const move = (e: PointerEvent) => { // pointer offset from the disc's centre, in viewport halves
      const r = el.getBoundingClientRect();
      aim.current.set(THREE.MathUtils.clamp((e.clientX - r.left - r.width / 2) / innerWidth * 2, -1, 1), THREE.MathUtils.clamp((e.clientY - r.top - r.height / 2) / innerHeight * 2, -1, 1));
    };
    addEventListener("pointermove", move, { passive: true });
    return () => removeEventListener("pointermove", move);
  }, [el]);
  useFrame((_, dt) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (spinning) angle.current -= (dt * Math.PI * 2) / period; // clockwise, like the CSS spin it replaces
    spin.current.rotation.z = angle.current;
    const t = tilt.current, k = Math.min(1, EASE * dt * 60);
    t.x += (aim.current.x - t.x) * k; t.y += (aim.current.y - t.y) * k;
    lean.current.rotation.set(t.y * LEAN, t.x * LEAN, 0);
  });
  return (
    <group ref={lean}>
      <group ref={spin}>
        <group position-y={LIFT} scale={[SIZE, SIZE, SIZE * 1.6]}><WordMesh /></group>
      </group>
    </group>
  );
}

export function DiscWord({ period, spinning = true }: { period: number; spinning?: boolean }) {
  const ok = useWebGL();
  if (!ok) return null; // the plain text label underneath stays
  // offsetSize: measure layout size, not the on-screen box (the gate sleeve mounts scaled down for its pop-in)
  return (
    <Canvas className="disc-word !absolute inset-0" resize={{ offsetSize: true }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, CAM_Z], fov: FOV }}>
      <Suspense fallback={null}>
        <WordLight />
        <Label period={period} spinning={spinning} />
      </Suspense>
    </Canvas>
  );
}
