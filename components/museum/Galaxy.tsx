"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { gaussian, softParticleTexture } from "./textures";

/**
 * Voie lactée enveloppante : on n'observe plus une petite spirale lointaine,
 * on se tient À L'INTÉRIEUR du disque galactique. La structure est un grand
 * disque spiral (cinq bras, bulbe chaud) déployé très haut et tout autour du
 * temple, dont la bande lumineuse balaie le ciel d'un horizon à l'autre. Avec
 * ~30 000 étoiles concentrées dans une bande fine (et un champ d'étoiles
 * d'appoint omnidirectionnel côté FacadeScene), le ciel reste dense partout.
 * Points ronds additifs : le bloom de la scène fait briller le cœur.
 */

const RADIUS = 120;
const BRANCHES = 5;
const SPIN = 3.2; // enroulement total (radians) du centre au bord
const CORE = new THREE.Color("#ffd9a4");
const ARM = new THREE.Color("#5d7fce");
const NEBULA = new THREE.Color("#c87fb4");
const BULGE = new THREE.Color("#fff1d6");

function buildGalaxy(count: number): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const bulgeCount = Math.floor(count * 0.13);
  const tint = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    if (i < bulgeCount) {
      // Bulbe central : amas sphérique légèrement aplati, dense et brillant
      const r = Math.abs(gaussian()) * RADIUS * 0.06;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.cos(phi) * 0.5;
      positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const brightness = 0.75 + Math.random() * 0.25;
      tint.copy(BULGE).lerp(CORE, Math.random() * 0.6).multiplyScalar(brightness);
    } else {
      // Disque spiral : densité décroissante vers le bord (biais central)
      const rNorm = Math.pow(Math.random(), 1.5);
      const radius = rNorm * RADIUS;
      const branchAngle = ((i % BRANCHES) / BRANCHES) * Math.PI * 2;
      const spinAngle = rNorm * SPIN;

      // Dispersion latérale qui s'évase vers l'extérieur ; disque TRÈS fin
      // sur l'axe vertical → bande nette plutôt qu'une bouillie diffuse.
      const spread = (0.16 + rNorm * 0.42) * RADIUS * 0.06;
      const rx = gaussian() * spread;
      const ry = gaussian() * (1 - rNorm * 0.7) * RADIUS * 0.018;
      const rz = gaussian() * spread;

      positions[i3] = Math.cos(branchAngle + spinAngle) * radius + rx;
      positions[i3 + 1] = ry;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + rz;

      tint.copy(CORE).lerp(ARM, Math.min(1, rNorm * 1.15));
      // Régions de formation d'étoiles rosées sur les bras
      if (rNorm > 0.22 && rNorm < 0.85 && Math.random() < 0.08) {
        tint.lerp(NEBULA, 0.55);
      }
      const brightness = 0.45 + Math.pow(Math.random(), 2) * 0.55;
      tint.multiplyScalar(brightness);
    }

    colors[i3] = tint.r;
    colors[i3 + 1] = tint.g;
    colors[i3 + 2] = tint.b;
  }

  return { positions, colors };
}

export default function Galaxy({ count = 30000 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const sprite = useMemo(() => softParticleTexture(), []);
  const { positions, colors } = useMemo(() => buildGalaxy(count), [count]);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.008;
  });

  return (
    // Disque vu presque par la tranche, centré derrière et au-dessus du temple :
    // on est dans son plan, la grande bande d'étoiles arque tout en travers du
    // ciel (du bas vers le haut), le cœur doré brillant en plein champ. Sa
    // moitié basse plonge sous l'horizon (masquée par le sol) → effet « Voie
    // lactée qui se lève », bien plus immersif qu'une spirale lointaine.
    <group position={[0, 30, -26]} rotation={[1.02, 0.12, -0.52]}>
      <points ref={points} renderOrder={-1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.5}
          map={sprite}
          vertexColors
          transparent
          opacity={0.95}
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
