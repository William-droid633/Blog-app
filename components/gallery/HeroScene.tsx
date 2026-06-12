"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Poussière dorée en suspension dans la lumière de la galerie. */
function GoldenDust({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, [count]);

  useFrame(({ clock, pointer }) => {
    if (!points.current) return;
    const t = clock.elapsedTime;
    points.current.rotation.y = t * 0.018 + pointer.x * 0.12;
    points.current.rotation.x = Math.sin(t * 0.05) * 0.04 + pointer.y * 0.06;
    points.current.position.y = Math.sin(t * 0.12) * 0.25;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#e8cd9c"
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Cadre de tableau flottant dans la pénombre. */
function FloatingFrame({
  position,
  rotation,
  size,
  speed,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  speed: number;
}) {
  const group = useRef<THREE.Group>(null);
  const [w, h] = size;

  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    const t = clock.elapsedTime * speed;
    group.current.position.y = position[1] + Math.sin(t) * 0.35;
    group.current.rotation.y = rotation[1] + Math.sin(t * 0.6) * 0.12 + pointer.x * 0.08;
    group.current.rotation.x = rotation[0] + Math.cos(t * 0.5) * 0.06 + pointer.y * 0.05;
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* Moulure dorée */}
      <mesh>
        <boxGeometry args={[w, h, 0.08]} />
        <meshStandardMaterial color="#8a6a3c" metalness={0.85} roughness={0.35} />
      </mesh>
      {/* Marie-louise */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[w * 0.86, h * 0.86]} />
        <meshStandardMaterial color="#2a221a" metalness={0.1} roughness={0.9} />
      </mesh>
      {/* Toile sombre, en attente d'une œuvre */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[w * 0.7, h * 0.7]} />
        <meshStandardMaterial color="#100d0a" metalness={0.05} roughness={1} />
      </mesh>
    </group>
  );
}

/** Projecteurs chauds qui balayent lentement la salle. */
function MovingLights() {
  const warm = useRef<THREE.PointLight>(null);
  const cool = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (warm.current) {
      warm.current.position.x = Math.sin(t * 0.22) * 7;
      warm.current.position.y = 2.5 + Math.cos(t * 0.18) * 1.5;
      warm.current.intensity = 38 + Math.sin(t * 0.7) * 6;
    }
    if (cool.current) {
      cool.current.position.x = Math.cos(t * 0.16) * -6;
      cool.current.position.y = -1 + Math.sin(t * 0.21) * 2;
    }
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight ref={warm} position={[4, 3, 4]} color="#e8cd9c" intensity={40} distance={26} decay={2} />
      <pointLight ref={cool} position={[-5, -1, 5]} color="#9c7b4f" intensity={18} distance={22} decay={2} />
    </>
  );
}

/**
 * Scène 3D du hero : salle de galerie plongée dans la pénombre,
 * cadres flottants, poussière dorée, lumières mouvantes.
 * Rendue uniquement côté client, désactivée si l'utilisateur
 * préfère réduire les animations.
 */
export default function HeroScene() {
  const [enabled, setEnabled] = useState(false);
  const [particleCount, setParticleCount] = useState(900);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(!reduceMotion);
    setParticleCount(window.innerWidth < 768 ? 420 : 900);
  }, []);

  if (!enabled) {
    return (
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 500px at 70% 20%, rgba(201,163,106,0.14), transparent 70%), radial-gradient(700px 500px at 20% 80%, rgba(201,163,106,0.08), transparent 70%)",
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 55 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={["#0c0a08", 9, 22]} />
        <MovingLights />
        <GoldenDust count={particleCount} />
        <FloatingFrame position={[-4.6, 0.6, -2]} rotation={[0.05, 0.5, 0]} size={[2.4, 3.2]} speed={0.55} />
        <FloatingFrame position={[4.8, -0.4, -3]} rotation={[-0.04, -0.55, 0]} size={[3, 2.2]} speed={0.4} />
        <FloatingFrame position={[0.5, 2.6, -5]} rotation={[0.1, 0.15, 0.03]} size={[2, 2.6]} speed={0.32} />
        <FloatingFrame position={[-1.8, -2.7, -4]} rotation={[-0.08, 0.3, -0.02]} size={[2.6, 1.9]} speed={0.47} />
      </Canvas>
    </div>
  );
}
