"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  marbleTexture,
  fluteTexture,
  floorTexture,
  starPositions,
} from "./textures";

/* — Proportions du temple (hexastyle) — */
const COLUMN_HEIGHT = 7;
const COLUMN_RADIUS = 0.45;
const COLUMN_COUNT = 6;
const TEMPLE_WIDTH = 15;
const PODIUM_HEIGHT = 1.6;
const ENTABLATURE_HEIGHT = 1.3;
const PEDIMENT_HEIGHT = 2.6;

function Stars() {
  const positions = useMemo(() => starPositions(1400, 90), []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.16} color="#e9e4d4" transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Column({ x, marble, flutes }: { x: number; marble: THREE.Texture; flutes: THREE.Texture }) {
  const y = PODIUM_HEIGHT;
  return (
    <group position={[x, y, 0]}>
      {/* Plinthe et base */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[COLUMN_RADIUS * 3, 0.24, COLUMN_RADIUS * 3]} />
        <meshStandardMaterial map={marble} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[COLUMN_RADIUS * 1.25, COLUMN_RADIUS * 1.42, 0.22, 28]} />
        <meshStandardMaterial map={marble} roughness={0.55} />
      </mesh>
      {/* Fût cannelé, légèrement galbé (entasis) */}
      <mesh position={[0, 0.45 + COLUMN_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[COLUMN_RADIUS * 0.86, COLUMN_RADIUS, COLUMN_HEIGHT, 36]} />
        <meshStandardMaterial
          map={marble}
          bumpMap={flutes}
          bumpScale={0.022}
          roughness={0.58}
        />
      </mesh>
      {/* Chapiteau toscan */}
      <mesh position={[0, 0.45 + COLUMN_HEIGHT + 0.1, 0]}>
        <cylinderGeometry args={[COLUMN_RADIUS * 1.22, COLUMN_RADIUS * 0.88, 0.22, 28]} />
        <meshStandardMaterial map={marble} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.45 + COLUMN_HEIGHT + 0.28, 0]}>
        <boxGeometry args={[COLUMN_RADIUS * 2.7, 0.16, COLUMN_RADIUS * 2.7]} />
        <meshStandardMaterial map={marble} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Pediment({ marble }: { marble: THREE.Texture }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-TEMPLE_WIDTH / 2 - 0.4, 0);
    shape.lineTo(TEMPLE_WIDTH / 2 + 0.4, 0);
    shape.lineTo(0, PEDIMENT_HEIGHT);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: false });
  }, []);

  const y = PODIUM_HEIGHT + 0.45 + COLUMN_HEIGHT + 0.36 + ENTABLATURE_HEIGHT;

  return (
    <mesh geometry={geometry} position={[0, y, -0.8]}>
      <meshStandardMaterial map={marble} roughness={0.62} />
    </mesh>
  );
}

function Torch({ x, z }: { x: number; z: number }) {
  const light = useRef<THREE.PointLight>(null);
  const flame = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = 0.82 + Math.sin(t * 9 + x) * 0.1 + Math.sin(t * 23 + x * 2) * 0.08;
    if (light.current) light.current.intensity = 14 * flicker;
    if (flame.current) flame.current.scale.setScalar(0.9 + flicker * 0.15);
  });

  return (
    <group position={[x, PODIUM_HEIGHT + 2.4, z]}>
      {/* Vasque */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.22, 0.1, 0.3, 16]} />
        <meshStandardMaterial color="#3d2f1d" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Pied */}
      <mesh position={[0, -1.3, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 2, 10]} />
        <meshStandardMaterial color="#3d2f1d" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Flamme */}
      <mesh ref={flame} position={[0, 0.12, 0]}>
        <coneGeometry args={[0.16, 0.5, 10]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.9} />
      </mesh>
      <pointLight ref={light} color="#ff9d45" intensity={14} distance={14} decay={2} />
    </group>
  );
}

/**
 * Façade du temple, de nuit : podium, six colonnes cannelées,
 * architrave gravée HERKVL, fronton, grandes portes de bronze
 * d'où filtre une lumière chaude, torches vivantes, ciel étoilé.
 */
export default function FacadeScene({ entering }: { entering: boolean }) {
  const { camera } = useThree();
  const marble = useMemo(() => marbleTexture(), []);
  const marbleWall = useMemo(() => {
    const t = marbleTexture("#cfc7b2", "#8f8469");
    t.repeat.set(3, 2);
    return t;
  }, []);
  const flutes = useMemo(() => {
    const t = fluteTexture();
    t.repeat.set(3, 1);
    return t;
  }, []);
  const ground = useMemo(() => {
    const t = floorTexture();
    t.repeat.set(10, 10);
    return t;
  }, []);

  useFrame(({ pointer }, delta) => {
    if (entering) {
      // Traversée de la porte
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 2.2, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, PODIUM_HEIGHT + 1.9, 2.2, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 0.4, 1.6, delta);
      camera.lookAt(0, PODIUM_HEIGHT + 1.9, -4);
    } else {
      // Contemplation avec légère parallaxe
      camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 1.4, 1.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 4.4 + pointer.y * 0.7, 1.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 17, 1.5, delta);
      camera.lookAt(0, 4.6, 0);
    }
  });

  const entablatureY = PODIUM_HEIGHT + 0.45 + COLUMN_HEIGHT + 0.36;
  const columnXs = Array.from({ length: COLUMN_COUNT }, (_, i) => {
    const span = TEMPLE_WIDTH - 2.4;
    return -span / 2 + (span / (COLUMN_COUNT - 1)) * i;
  });

  return (
    <>
      <color attach="background" args={["#070605"]} />
      <fog attach="fog" args={["#070605", 22, 70]} />

      {/* Nuit : lune froide + ambiance */}
      <ambientLight intensity={0.16} />
      <directionalLight position={[-14, 22, 10]} color="#8fa3c8" intensity={0.5} />
      <Stars />

      {/* Sol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial map={ground} roughness={0.85} />
      </mesh>

      {/* Podium et emmarchement */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.27 * (i + 0.5), 2.2 - i * 0.55]}>
          <boxGeometry args={[TEMPLE_WIDTH + 3 - i * 0.8, 0.27, 7 + i * 1.1]} />
          <meshStandardMaterial map={marble} roughness={0.65} />
        </mesh>
      ))}
      <mesh position={[0, PODIUM_HEIGHT / 2 + 0.4, -1.4]}>
        <boxGeometry args={[TEMPLE_WIDTH + 1.6, PODIUM_HEIGHT - 0.8 + 0.81, 6.6]} />
        <meshStandardMaterial map={marble} roughness={0.65} />
      </mesh>

      {/* Colonnade */}
      {columnXs.map((x) => (
        <Column key={x} x={x} marble={marble} flutes={flutes} />
      ))}

      {/* Mur de la cella, en retrait */}
      <mesh position={[0, PODIUM_HEIGHT + (COLUMN_HEIGHT + 0.8) / 2, -2.6]}>
        <boxGeometry args={[TEMPLE_WIDTH - 1.2, COLUMN_HEIGHT + 0.8, 0.7]} />
        <meshStandardMaterial map={marbleWall} roughness={0.7} />
      </mesh>

      {/* Encadrement de porte */}
      <mesh position={[0, PODIUM_HEIGHT + 2.6, -2.2]}>
        <boxGeometry args={[3.6, 5.2, 0.25]} />
        <meshStandardMaterial map={marble} roughness={0.5} />
      </mesh>
      {/* Portes de bronze entrouvertes */}
      <mesh position={[-0.78, PODIUM_HEIGHT + 2.4, -2.12]} rotation={[0, 0.12, 0]}>
        <boxGeometry args={[1.42, 4.6, 0.14]} />
        <meshStandardMaterial color="#4a3417" metalness={0.85} roughness={0.42} />
      </mesh>
      <mesh position={[0.78, PODIUM_HEIGHT + 2.4, -2.12]} rotation={[0, -0.12, 0]}>
        <boxGeometry args={[1.42, 4.6, 0.14]} />
        <meshStandardMaterial color="#4a3417" metalness={0.85} roughness={0.42} />
      </mesh>
      {/* Lumière dorée filtrant par l'entrebâillement */}
      <mesh position={[0, PODIUM_HEIGHT + 2.3, -2.16]}>
        <planeGeometry args={[0.24, 4.4]} />
        <meshBasicMaterial color="#ffd9a0" transparent opacity={0.95} />
      </mesh>
      <pointLight position={[0, PODIUM_HEIGHT + 2.3, -1.6]} color="#ffce8a" intensity={9} distance={9} decay={2} />

      {/* Entablement : architrave, frise gravée, corniche */}
      <mesh position={[0, entablatureY + 0.25, -0.4]}>
        <boxGeometry args={[TEMPLE_WIDTH, 0.5, 2.6]} />
        <meshStandardMaterial map={marble} roughness={0.6} />
      </mesh>
      <mesh position={[0, entablatureY + 0.78, -0.4]}>
        <boxGeometry args={[TEMPLE_WIDTH, 0.56, 2.5]} />
        <meshStandardMaterial map={marble} roughness={0.6} />
      </mesh>
      <mesh position={[0, entablatureY + ENTABLATURE_HEIGHT - 0.09, -0.4]}>
        <boxGeometry args={[TEMPLE_WIDTH + 0.8, 0.18, 3]} />
        <meshStandardMaterial map={marble} roughness={0.6} />
      </mesh>

      {/* Inscription monumentale sur la frise */}
      <Html
        transform
        position={[0, entablatureY + 0.78, 0.88]}
        scale={0.42}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            letterSpacing: "0.5em",
            fontWeight: 700,
            fontSize: "28px",
            color: "#8a6a3c",
            textShadow: "0 1px 0 rgba(255,240,200,0.35), 0 -1px 1px rgba(0,0,0,0.6)",
            whiteSpace: "nowrap",
          }}
        >
          HERKVL·MVSEVM
        </div>
      </Html>

      <Pediment marble={marble} />

      {/* Torches de part et d'autre de l'escalier */}
      <Torch x={-TEMPLE_WIDTH / 2 - 1.6} z={4.4} />
      <Torch x={TEMPLE_WIDTH / 2 + 1.6} z={4.4} />

      {/* Lumière chaude générale montant du parvis */}
      <pointLight position={[0, 2.5, 9]} color="#e8cd9c" intensity={10} distance={26} decay={2} />
    </>
  );
}
