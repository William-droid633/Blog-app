"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Poussière dorée en suspension dans la lumière des torches. */
function GoldenDust({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 13;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, [count]);

  useFrame(({ clock, pointer }) => {
    if (!points.current) return;
    const t = clock.elapsedTime;
    points.current.rotation.y = t * 0.016 + pointer.x * 0.12;
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
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Colonne romaine de marbre dérivant dans la pénombre du temple. */
function FloatingColumn({
  position,
  rotation = [0, 0, 0],
  height = 3.2,
  radius = 0.34,
  speed = 0.4,
  broken = false,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  height?: number;
  radius?: number;
  speed?: number;
  broken?: boolean;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    const t = clock.elapsedTime * speed;
    group.current.position.y = position[1] + Math.sin(t) * 0.3;
    group.current.rotation.y = rotation[1] + Math.sin(t * 0.5) * 0.1 + pointer.x * 0.06;
    group.current.rotation.z = rotation[2] + Math.cos(t * 0.4) * 0.03 + pointer.y * 0.03;
  });

  const marble = (
    <meshStandardMaterial color="#d8d2c2" metalness={0.05} roughness={0.55} />
  );
  const half = height / 2;

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* Fût légèrement galbé */}
      <mesh>
        <cylinderGeometry args={[radius * 0.92, radius, height, 28]} />
        {marble}
      </mesh>
      {broken ? (
        /* Sommet brisé, en ruine */
        <mesh position={[0, half + 0.04, 0]} rotation={[0.3, 0.4, 0.18]}>
          <cylinderGeometry args={[radius * 0.55, radius * 0.9, 0.22, 9]} />
          {marble}
        </mesh>
      ) : (
        <>
          {/* Chapiteau */}
          <mesh position={[0, half + 0.1, 0]}>
            <cylinderGeometry args={[radius * 1.35, radius * 0.95, 0.2, 28]} />
            {marble}
          </mesh>
          {/* Abaque */}
          <mesh position={[0, half + 0.28, 0]}>
            <boxGeometry args={[radius * 3.1, 0.14, radius * 3.1]} />
            {marble}
          </mesh>
        </>
      )}
      {/* Base */}
      <mesh position={[0, -half - 0.1, 0]}>
        <cylinderGeometry args={[radius * 1.3, radius * 1.5, 0.2, 28]} />
        {marble}
      </mesh>
      {/* Plinthe */}
      <mesh position={[0, -half - 0.28, 0]}>
        <boxGeometry args={[radius * 3.4, 0.16, radius * 3.4]} />
        {marble}
      </mesh>
    </group>
  );
}

/** Torches chaudes qui balayent lentement le temple. */
function MovingLights() {
  const warm = useRef<THREE.PointLight>(null);
  const ember = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (warm.current) {
      warm.current.position.x = Math.sin(t * 0.2) * 7;
      warm.current.position.y = 2.5 + Math.cos(t * 0.17) * 1.5;
      warm.current.intensity = 42 + Math.sin(t * 2.3) * 5 + Math.sin(t * 0.7) * 5;
    }
    if (ember.current) {
      ember.current.position.x = Math.cos(t * 0.15) * -6;
      ember.current.position.y = -1.5 + Math.sin(t * 0.2) * 2;
      ember.current.intensity = 16 + Math.sin(t * 1.7) * 3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.22} />
      <pointLight ref={warm} position={[4, 3, 4]} color="#e8cd9c" intensity={44} distance={28} decay={2} />
      <pointLight ref={ember} position={[-5, -1, 5]} color="#c96a3a" intensity={17} distance={22} decay={2} />
    </>
  );
}

/**
 * Scène 3D du hero : ruines d'un temple romain dans la pénombre —
 * colonnes de marbre flottantes, poussière dorée, lumière de torches.
 * Rendue uniquement côté client, remplacée par un halo statique si
 * l'utilisateur préfère réduire les animations.
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
        <fog attach="fog" args={["#0c0a08", 9, 24]} />
        <MovingLights />
        <GoldenDust count={particleCount} />
        <FloatingColumn position={[-5.2, 0.3, -2.5]} rotation={[0.02, 0.4, 0.04]} height={3.6} speed={0.45} />
        <FloatingColumn position={[5.4, -0.5, -3]} rotation={[-0.03, -0.5, -0.05]} height={3} speed={0.36} broken />
        <FloatingColumn position={[2.8, 2.4, -6]} rotation={[0.05, 0.2, 0.06]} height={2.6} radius={0.28} speed={0.3} />
        <FloatingColumn position={[-2.6, -2.6, -5]} rotation={[-0.04, 0.6, -0.08]} height={2.2} radius={0.26} speed={0.5} broken />
        <FloatingColumn position={[-0.4, 3.1, -8]} rotation={[0.03, 0.1, 0.02]} height={2.4} radius={0.24} speed={0.26} />
      </Canvas>
    </div>
  );
}
