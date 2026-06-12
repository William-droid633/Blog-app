"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { gaussian, softParticleTexture } from "./textures";

/**
 * Galaxie spirale en vraies particules (~80 000 étoiles) suspendue dans
 * le ciel derrière le temple : cinq bras enroulés, bulbe central chaud,
 * dispersion gaussienne (dense au cœur, diffuse en lisière), nuances de
 * couleur du cœur doré aux bras bleutés piqués de nébuleuses roses.
 * Points ronds additifs à bord fondu — le bloom de la scène fait briller
 * le cœur naturellement. Très lente rotation autour de son axe.
 */

const RADIUS = 46;
const BRANCHES = 5;
const SPIN = 4.4; // enroulement total (radians) du centre au bord
const CORE = new THREE.Color("#ffd9a4");
const ARM = new THREE.Color("#5d7fce");
const NEBULA = new THREE.Color("#c87fb4");
const BULGE = new THREE.Color("#fff1d6");

function buildGalaxy(count: number): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const bulgeCount = Math.floor(count * 0.14);
  const tint = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    if (i < bulgeCount) {
      // Bulbe central : amas sphérique légèrement aplati
      const r = Math.abs(gaussian()) * RADIUS * 0.07;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.cos(phi) * 0.55;
      positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const brightness = 0.7 + Math.random() * 0.3;
      tint.copy(BULGE).lerp(CORE, Math.random() * 0.6).multiplyScalar(brightness);
    } else {
      // Disque spiral : densité décroissante vers le bord
      const rNorm = Math.pow(Math.random(), 1.55);
      const radius = rNorm * RADIUS;
      const branchAngle = ((i % BRANCHES) / BRANCHES) * Math.PI * 2;
      const spinAngle = rNorm * SPIN;

      // Dispersion qui s'évase vers l'extérieur ; disque fin en lisière
      const spread = (0.16 + rNorm * 0.5) * RADIUS * 0.075;
      const rx = gaussian() * spread;
      const ry = gaussian() * (1 - rNorm * 0.72) * RADIUS * 0.03;
      const rz = gaussian() * spread;

      positions[i3] = Math.cos(branchAngle + spinAngle) * radius + rx;
      positions[i3 + 1] = ry;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + rz;

      tint.copy(CORE).lerp(ARM, Math.min(1, rNorm * 1.15));
      // Quelques régions de formation d'étoiles rosées sur les bras
      if (rNorm > 0.25 && rNorm < 0.85 && Math.random() < 0.07) {
        tint.lerp(NEBULA, 0.55);
      }
      const brightness = 0.4 + Math.pow(Math.random(), 2) * 0.6;
      tint.multiplyScalar(brightness);
    }

    colors[i3] = tint.r;
    colors[i3 + 1] = tint.g;
    colors[i3 + 2] = tint.b;
  }

  return { positions, colors };
}

export default function Galaxy({ count = 80000 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const sprite = useMemo(() => softParticleTexture(), []);
  const { positions, colors } = useMemo(() => buildGalaxy(count), [count]);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.012;
  });

  return (
    // Inclinée en oblique dans le ciel : on voit la spirale en perspective
    <group position={[-26, 56, -118]} rotation={[1.02, 0.05, -0.42]}>
      <points ref={points} renderOrder={-1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.5}
          map={sprite}
          vertexColors
          transparent
          opacity={0.9}
          alphaTest={0.001}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </points>
    </group>
  );
}
