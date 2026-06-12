"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Instances, Instance, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import {
  marbleSurface,
  travertineSurface,
  bronzeSurface,
  esplanadeSurface,
  fluteTexture,
  starPositions,
  skyGradientTexture,
  cloudTexture,
  shadowBlobTexture,
  setRepeat,
  type SurfaceMaps,
} from "./textures";

/* — Proportions monumentales (octastyle) — */
const COLUMN_COUNT = 8;
const COLUMN_HEIGHT = 9.4;
const COLUMN_RADIUS = 0.52;
const TEMPLE_WIDTH = 22;
const PODIUM_HEIGHT = 1.96;
const ENTABLATURE_HEIGHT = 1.7;
const PEDIMENT_HEIGHT = 3.4;
const PORCH_DEPTH = 5;

const ENTAB_Y = PODIUM_HEIGHT + 0.5 + COLUMN_HEIGHT + 0.42;

/* Battants de bronze : entrebâillés au repos, grands ouverts à l'entrée. */
const DOOR_AJAR = 0.12;
const DOOR_OPEN = 1.2;
/* Durée de l'approche (s) ; doit correspondre au minuteur de Museum3D. */
const ENTER_DURATION = 2.2;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function glowCanvas(color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return canvas;
}

/** Dôme céleste : dégradé atmosphérique du zénith à l'horizon. */
function SkyDome() {
  const texture = useMemo(() => skyGradientTexture(), []);
  return (
    <mesh renderOrder={-2}>
      <sphereGeometry args={[130, 24, 18]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

/** Voiles de nuages éclairés par la lune, en lente dérive. */
function Clouds() {
  const texture = useMemo(() => cloudTexture(), []);
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.children.forEach((child, i) => {
      child.position.x += 0.004 + i * 0.0015;
      if (child.position.x > 90) child.position.x = -90;
    });
  });

  const layers: Array<{ position: [number, number, number]; scale: [number, number, number]; opacity: number }> = [
    { position: [-30, 30, -78], scale: [85, 26, 1], opacity: 0.32 },
    { position: [25, 40, -92], scale: [95, 30, 1], opacity: 0.24 },
    { position: [-55, 22, -64], scale: [60, 18, 1], opacity: 0.28 },
    { position: [50, 26, -70], scale: [70, 20, 1], opacity: 0.22 },
    { position: [0, 48, -100], scale: [110, 34, 1], opacity: 0.18 },
  ];

  return (
    <group ref={group}>
      {layers.map((layer, i) => (
        <sprite key={i} position={layer.position} scale={layer.scale}>
          <spriteMaterial map={texture} transparent opacity={layer.opacity} depthWrite={false} fog={false} />
        </sprite>
      ))}
    </group>
  );
}

/** Ombre de contact douce posée au sol sous un objet. */
function Blob({
  x,
  z,
  y = 0.012,
  radius,
  opacity = 0.5,
  texture,
}: {
  x: number;
  z: number;
  y?: number;
  radius: number;
  opacity?: number;
  texture: THREE.Texture;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function Stars() {
  const positions = useMemo(() => starPositions(1800, 110), []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.2} color="#e9e4d4" transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Moon() {
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(glowCanvas("rgba(214, 226, 248, 0.9)"));
    return t;
  }, []);
  return (
    <group position={[-34, 40, -52]}>
      <mesh>
        <circleGeometry args={[3.2, 40]} />
        <meshBasicMaterial color="#e6edf8" fog={false} />
      </mesh>
      <sprite scale={[16, 16, 1]}>
        <spriteMaterial map={texture} transparent opacity={0.55} depthWrite={false} />
      </sprite>
    </group>
  );
}

function Column({
  x,
  z,
  marble,
  flutes,
}: {
  x: number;
  z: number;
  marble: SurfaceMaps;
  flutes: THREE.Texture;
}) {
  return (
    <group position={[x, PODIUM_HEIGHT, z]}>
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[COLUMN_RADIUS * 3, 0.28, COLUMN_RADIUS * 3]} />
        <meshStandardMaterial {...marble} bumpScale={0.6} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[COLUMN_RADIUS * 1.26, COLUMN_RADIUS * 1.44, 0.24, 28]} />
        <meshStandardMaterial {...marble} bumpScale={0.6} />
      </mesh>
      {/* Fût cannelé avec entasis */}
      <mesh position={[0, 0.52 + COLUMN_HEIGHT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[COLUMN_RADIUS * 0.84, COLUMN_RADIUS, COLUMN_HEIGHT, 40]} />
        <meshStandardMaterial
          map={marble.map}
          roughnessMap={marble.roughnessMap}
          bumpMap={flutes}
          bumpScale={1.6}
        />
      </mesh>
      <mesh position={[0, 0.52 + COLUMN_HEIGHT + 0.11, 0]} castShadow>
        <cylinderGeometry args={[COLUMN_RADIUS * 1.24, COLUMN_RADIUS * 0.86, 0.24, 28]} />
        <meshStandardMaterial {...marble} bumpScale={0.6} />
      </mesh>
      <mesh position={[0, 0.52 + COLUMN_HEIGHT + 0.31, 0]} castShadow>
        <boxGeometry args={[COLUMN_RADIUS * 2.8, 0.18, COLUMN_RADIUS * 2.8]} />
        <meshStandardMaterial {...marble} bumpScale={0.6} />
      </mesh>
    </group>
  );
}

function Pediment({ marble }: { marble: SurfaceMaps }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-TEMPLE_WIDTH / 2 - 0.6, 0);
    shape.lineTo(TEMPLE_WIDTH / 2 + 0.6, 0);
    shape.lineTo(0, PEDIMENT_HEIGHT);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
  }, []);

  const y = ENTAB_Y + ENTABLATURE_HEIGHT;
  const slopeAngle = Math.atan2(PEDIMENT_HEIGHT, TEMPLE_WIDTH / 2 + 0.6);
  const slopeLength = Math.hypot(PEDIMENT_HEIGHT, TEMPLE_WIDTH / 2 + 0.6) + 0.6;

  return (
    <group position={[0, y, -1]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial {...marble} bumpScale={0.6} />
      </mesh>
      {/* Corniches rampantes */}
      <mesh
        position={[-(TEMPLE_WIDTH / 4 + 0.15), PEDIMENT_HEIGHT / 2 + 0.18, 1.06]}
        rotation={[0, 0, slopeAngle]}
        castShadow
      >
        <boxGeometry args={[slopeLength, 0.34, 2.4]} />
        <meshStandardMaterial {...marble} bumpScale={0.6} />
      </mesh>
      <mesh
        position={[TEMPLE_WIDTH / 4 + 0.15, PEDIMENT_HEIGHT / 2 + 0.18, 1.06]}
        rotation={[0, 0, -slopeAngle]}
        castShadow
      >
        <boxGeometry args={[slopeLength, 0.34, 2.4]} />
        <meshStandardMaterial {...marble} bumpScale={0.6} />
      </mesh>
      {/* Relief du tympan : couronne de laurier en bronze */}
      <group position={[0, PEDIMENT_HEIGHT * 0.36, 2.04]}>
        <mesh>
          <torusGeometry args={[0.95, 0.13, 12, 40]} />
          <meshStandardMaterial color="#6d4f24" metalness={0.85} roughness={0.4} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.4, 24]} />
          <meshStandardMaterial color="#56401f" metalness={0.8} roughness={0.45} />
        </mesh>
      </group>
      {/* Acrotères */}
      {[[-TEMPLE_WIDTH / 2 - 0.4, 0.34], [0, PEDIMENT_HEIGHT + 0.32], [TEMPLE_WIDTH / 2 + 0.4, 0.34]].map(
        ([x, ay], i) => (
          <mesh key={i} position={[x, ay, 1]} castShadow>
            <sphereGeometry args={[0.34, 14, 10]} />
            <meshStandardMaterial {...marble} bumpScale={0.6} />
          </mesh>
        )
      )}
    </group>
  );
}

function Dentils({ width, y, z }: { width: number; y: number; z: number }) {
  const count = Math.floor(width / 0.52);
  const xs = useMemo(
    () => Array.from({ length: count }, (_, i) => -width / 2 + 0.26 + i * 0.52),
    [count, width]
  );
  return (
    <Instances limit={count} castShadow>
      <boxGeometry args={[0.28, 0.22, 0.34]} />
      <meshStandardMaterial color="#cfc7b2" roughness={0.62} />
      {xs.map((x) => (
        <Instance key={x} position={[x, y, z]} />
      ))}
    </Instances>
  );
}

function Torch({ x, z }: { x: number; z: number }) {
  const light = useRef<THREE.PointLight>(null);
  const flame = useRef<THREE.Mesh>(null);
  const halo = useMemo(() => new THREE.CanvasTexture(glowCanvas("rgba(255, 166, 64, 0.85)")), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = 0.8 + Math.sin(t * 9 + x) * 0.12 + Math.sin(t * 23 + x * 2) * 0.08;
    if (light.current) light.current.intensity = 22 * flicker;
    if (flame.current) flame.current.scale.set(0.9 + flicker * 0.15, 0.85 + flicker * 0.3, 0.9 + flicker * 0.15);
  });

  return (
    <group position={[x, PODIUM_HEIGHT + 2.8, z]}>
      <mesh position={[0, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.12, 0.34, 16]} />
        <meshStandardMaterial color="#3d2f1d" metalness={0.75} roughness={0.4} />
      </mesh>
      <mesh position={[0, -1.6, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 2.6, 10]} />
        <meshStandardMaterial color="#3d2f1d" metalness={0.75} roughness={0.4} />
      </mesh>
      <mesh ref={flame} position={[0, 0.16, 0]}>
        <coneGeometry args={[0.18, 0.6, 10]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <sprite scale={[1.6, 1.6, 1]} position={[0, 0.2, 0]}>
        <spriteMaterial map={halo} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <pointLight ref={light} color="#ff9d45" intensity={22} distance={18} decay={2} />
    </group>
  );
}

function Cypress({ x, z, height }: { x: number; z: number; height: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <coneGeometry args={[height * 0.14, height, 8]} />
        <meshStandardMaterial color="#0e1a10" roughness={0.95} />
      </mesh>
    </group>
  );
}

/**
 * Façade monumentale du temple, de nuit : huit colonnes cannelées sur
 * podium à grand escalier, entablement denticulé, fronton à acrotères,
 * portes de bronze patiné entrouvertes, torches, lune, cyprès et
 * vestiges épars. Ombres portées réelles par clair de lune.
 */
export default function FacadeScene({
  entering,
  highQuality,
}: {
  entering: boolean;
  highQuality: boolean;
}) {
  const { camera } = useThree();

  // Suivi de l'approche : instant de départ et position initiale figés au
  // premier frame d'entrée pour une interpolation parfaitement fluide.
  const enterStart = useRef<number | null>(null);
  const camStart = useRef(new THREE.Vector3());
  const leftDoor = useRef<THREE.Group>(null);
  const rightDoor = useRef<THREE.Group>(null);
  const interiorLight = useRef<THREE.PointLight>(null);
  const interiorGlow = useRef<THREE.MeshBasicMaterial>(null);

  const marble = useMemo(() => marbleSurface(), []);
  const marbleWall = useMemo(() => setRepeat(travertineSurface(), 4, 2.4), []);
  const bronze = useMemo(() => bronzeSurface(), []);
  const esplanade = useMemo(() => setRepeat(esplanadeSurface(), 9, 9), []);
  const flutes = useMemo(() => {
    const t = fluteTexture();
    t.repeat.set(4, 1);
    return t;
  }, []);
  const doorGlow = useMemo(() => new THREE.CanvasTexture(glowCanvas("rgba(255, 206, 138, 0.9)")), []);
  const blob = useMemo(() => shadowBlobTexture(), []);

  // Position d'arrivée (premier chargement ou retour depuis le couloir)
  useEffect(() => {
    camera.position.set(0, 2.1, 25);
    camera.lookAt(0, 10.4, 0);
  }, [camera]);

  useFrame(({ pointer, clock }, delta) => {
    if (entering) {
      // On fige le point de départ réel : l'approche part exactement d'où se
      // trouve le visiteur, sans aucun saut vers le haut.
      if (enterStart.current === null) {
        enterStart.current = clock.elapsedTime;
        camStart.current.copy(camera.position);
      }
      const t = THREE.MathUtils.clamp(
        (clock.elapsedTime - enterStart.current) / ENTER_DURATION,
        0,
        1
      );
      const e = easeInOutCubic(t);

      // Glissé fluide jusqu'au seuil, à hauteur d'œil, puis à travers la porte.
      const eyeY = PODIUM_HEIGHT + 1.7;
      const targetZ = -PORCH_DEPTH - 0.2;
      camera.position.x = THREE.MathUtils.lerp(camStart.current.x, 0, e);
      camera.position.y = THREE.MathUtils.lerp(camStart.current.y, eyeY, e);
      camera.position.z = THREE.MathUtils.lerp(camStart.current.z, targetZ, e);
      // Le regard descend en douceur du fronton vers le cœur lumineux du temple.
      camera.lookAt(0, THREE.MathUtils.lerp(10.4, eyeY, e), THREE.MathUtils.lerp(0, -14, e));

      // Les battants s'ouvrent en grand, un peu en avance sur la marche.
      const open = THREE.MathUtils.lerp(
        DOOR_AJAR,
        DOOR_OPEN,
        easeInOutCubic(Math.min(t * 1.3, 1))
      );
      if (leftDoor.current) leftDoor.current.rotation.y = open;
      if (rightDoor.current) rightDoor.current.rotation.y = -open;

      // La lumière du sanctuaire enfle jusqu'à emplir tout l'écran.
      if (interiorLight.current) interiorLight.current.intensity = 20 + e * 170;
      if (interiorGlow.current) interiorGlow.current.opacity = Math.min(1, e * 1.2);
    } else {
      enterStart.current = null;
      // Regard levé vers le fronton : sentiment de monumentalité
      const breathe = Math.sin(clock.elapsedTime * 0.4) * 0.1;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 1.8, 1.4, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 2 + breathe + pointer.y * 0.6, 1.4, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 25, 1.2, delta);
      camera.lookAt(0, 10.4 + pointer.y * 1.2, 0);

      // Les portes se referment doucement (retour du couloir au parvis).
      if (leftDoor.current)
        leftDoor.current.rotation.y = THREE.MathUtils.damp(leftDoor.current.rotation.y, DOOR_AJAR, 2.4, delta);
      if (rightDoor.current)
        rightDoor.current.rotation.y = THREE.MathUtils.damp(rightDoor.current.rotation.y, -DOOR_AJAR, 2.4, delta);
      if (interiorLight.current) interiorLight.current.intensity = 20;
      // Lueur résiduelle filtrant par l'entrebâillement au repos.
      if (interiorGlow.current)
        interiorGlow.current.opacity = THREE.MathUtils.damp(interiorGlow.current.opacity, 0.12, 3, delta);
    }
  });

  const columnXs = useMemo(() => {
    const span = TEMPLE_WIDTH - 3;
    return Array.from({ length: COLUMN_COUNT }, (_, i) => -span / 2 + (span / (COLUMN_COUNT - 1)) * i);
  }, []);

  const doorY = PODIUM_HEIGHT + 3.3;

  return (
    <>
      <color attach="background" args={["#0a0d16"]} />
      <fog attach="fog" args={["#141320", 30, 110]} />
      <SkyDome />
      <Clouds />

      {/* Réflexions d'environnement nocturne (procédural, sans réseau) */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.2} color="#26334d" position={[0, 14, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer intensity={1.6} color="#e8cd9c" position={[0, 4, 12]} scale={[14, 6, 1]} />
        <Lightformer intensity={0.7} color="#ff9d45" position={[-12, 2, 6]} scale={[5, 3, 1]} />
      </Environment>

      <ambientLight intensity={0.14} />
      {/* Clair de lune : la source d'ombres */}
      <directionalLight
        castShadow={highQuality}
        position={[-22, 34, 18]}
        color="#93a7cc"
        intensity={0.85}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-6}
        shadow-camera-near={6}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
      />
      <Stars />
      <Moon />

      {/* Esplanade dallée */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 8]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial {...esplanade} bumpScale={0.8} />
      </mesh>

      {/* Grand escalier sur toute la largeur */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, 0.14 + 0.28 * i, 5.4 - i * 0.62]} castShadow receiveShadow>
          <boxGeometry args={[TEMPLE_WIDTH + 4.5 - i * 0.3, 0.28, 9.4 + i * 1.24 - i * 2.48]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
      ))}
      {/* Stylobate */}
      <mesh position={[0, PODIUM_HEIGHT - 0.14, -1.8]} castShadow receiveShadow>
        <boxGeometry args={[TEMPLE_WIDTH + 2.6, 0.28, 9.8]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <mesh position={[0, (PODIUM_HEIGHT - 0.28) / 2, -2.6]} receiveShadow>
        <boxGeometry args={[TEMPLE_WIDTH + 2, PODIUM_HEIGHT - 0.28, 8.2]} />
        <meshStandardMaterial {...marbleWall} bumpScale={0.7} />
      </mesh>

      {/* Colonnade octostyle + colonnes d'angle du pronaos */}
      {columnXs.map((x) => (
        <Column key={x} x={x} z={0} marble={marble} flutes={flutes} />
      ))}
      {[columnXs[0], columnXs[COLUMN_COUNT - 1]].map((x, i) => (
        <Column key={i} x={x} z={-2.6} marble={marble} flutes={flutes} />
      ))}

      {/* Plafond du pronaos */}
      <mesh position={[0, ENTAB_Y + 0.1, -PORCH_DEPTH / 2]} receiveShadow>
        <boxGeometry args={[TEMPLE_WIDTH, 0.3, PORCH_DEPTH + 1]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>

      {/* Cella et murs latéraux (antae) */}
      <mesh position={[0, PODIUM_HEIGHT + (COLUMN_HEIGHT + 1) / 2, -PORCH_DEPTH - 0.4]} receiveShadow>
        <boxGeometry args={[TEMPLE_WIDTH - 1.4, COLUMN_HEIGHT + 1, 0.9]} />
        <meshStandardMaterial {...marbleWall} bumpScale={0.8} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (TEMPLE_WIDTH / 2 - 0.9), PODIUM_HEIGHT + (COLUMN_HEIGHT + 1) / 2, -PORCH_DEPTH / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.8, COLUMN_HEIGHT + 1, PORCH_DEPTH + 1.2]} />
          <meshStandardMaterial {...marbleWall} bumpScale={0.8} />
        </mesh>
      ))}

      {/* Encadrement de porte monumental */}
      <mesh position={[0, doorY, -PORCH_DEPTH + 0.12]} receiveShadow>
        <boxGeometry args={[5.4, 7.4, 0.3]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      {/* Cœur lumineux du sanctuaire, révélé par l'ouverture des portes */}
      <mesh position={[0, doorY - 0.2, -PORCH_DEPTH + 0.15]}>
        <planeGeometry args={[5.2, 7.2]} />
        <meshBasicMaterial
          ref={interiorGlow}
          color="#fff3da"
          transparent
          opacity={0}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Portes de bronze patiné, articulées sur leurs gonds extérieurs.
          Entrebâillées au repos, elles s'ouvrent en grand à l'entrée puis
          se referment au retour du couloir. */}
      <group
        ref={leftDoor}
        position={[-2.2, doorY - 0.2, -PORCH_DEPTH + 0.26]}
        rotation={[0, DOOR_AJAR, 0]}
      >
        <mesh position={[1.05, 0, 0]} castShadow>
          <boxGeometry args={[2.1, 6.6, 0.16]} />
          <meshStandardMaterial {...bronze} bumpScale={0.8} metalness={0.75} />
        </mesh>
        {[0, 1, 2, 3].map((row) => (
          <mesh key={row} position={[1.05, -2.2 + row * 1.5, 0.1]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color="#8a6530" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>
      <group
        ref={rightDoor}
        position={[2.2, doorY - 0.2, -PORCH_DEPTH + 0.26]}
        rotation={[0, -DOOR_AJAR, 0]}
      >
        <mesh position={[-1.05, 0, 0]} castShadow>
          <boxGeometry args={[2.1, 6.6, 0.16]} />
          <meshStandardMaterial {...bronze} bumpScale={0.8} metalness={0.75} />
        </mesh>
        {[0, 1, 2, 3].map((row) => (
          <mesh key={row} position={[-1.05, -2.2 + row * 1.5, 0.1]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color="#8a6530" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {/* Halo chaud émanant de l'entrebâillement */}
      <sprite scale={[5, 8, 1]} position={[0, doorY - 0.4, -PORCH_DEPTH + 0.7]}>
        <spriteMaterial map={doorGlow} transparent opacity={0.34} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <pointLight
        ref={interiorLight}
        position={[0, doorY - 0.4, -PORCH_DEPTH + 1.6]}
        color="#ffce8a"
        intensity={20}
        distance={18}
        decay={2}
      />

      {/* Entablement : architrave à fasces, frise gravée, denticules, corniche */}
      <mesh position={[0, ENTAB_Y + 0.3, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[TEMPLE_WIDTH, 0.6, 3]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <mesh position={[0, ENTAB_Y + 0.93, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[TEMPLE_WIDTH, 0.66, 2.9]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <Dentils width={TEMPLE_WIDTH} y={ENTAB_Y + 1.37} z={1.36} />
      <mesh position={[0, ENTAB_Y + ENTABLATURE_HEIGHT - 0.1, -0.2]} castShadow>
        <boxGeometry args={[TEMPLE_WIDTH + 1, 0.2, 3.6]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>

      {/* Inscription monumentale */}
      <Html
        transform
        position={[0, ENTAB_Y + 0.93, 1.28]}
        scale={0.6}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            letterSpacing: "0.52em",
            fontWeight: 700,
            fontSize: "30px",
            color: "#9a7a45",
            textShadow: "0 1px 0 rgba(255,240,200,0.3), 0 -2px 2px rgba(0,0,0,0.65)",
            whiteSpace: "nowrap",
          }}
        >
          HERKVL·MVSEVM
        </div>
      </Html>

      <Pediment marble={marble} />

      {/* Torches du parvis */}
      <Torch x={-TEMPLE_WIDTH / 2 - 2.2} z={6.2} />
      <Torch x={TEMPLE_WIDTH / 2 + 2.2} z={6.2} />

      {/* Cyprès et vestiges sur l'esplanade */}
      <Cypress x={-TEMPLE_WIDTH / 2 - 9} z={-4} height={11} />
      <Cypress x={-TEMPLE_WIDTH / 2 - 13} z={4} height={8.5} />
      <Cypress x={TEMPLE_WIDTH / 2 + 10} z={-2} height={12} />
      <Cypress x={TEMPLE_WIDTH / 2 + 14} z={6} height={9} />
      {/* Tambour de colonne effondré */}
      <mesh position={[12.5, 0.5, 12]} rotation={[0, 0.6, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.55, 1.9, 22]} />
        <meshStandardMaterial {...marble} bumpScale={0.7} />
      </mesh>
      <mesh position={[-11.5, 0.32, 13.5]} rotation={[0.1, 0.9, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.7, 1.1]} />
        <meshStandardMaterial {...marbleWall} bumpScale={0.8} />
      </mesh>

      {/* Ombres de contact au sol */}
      {columnXs.map((x) => (
        <Blob key={`blob-${x}`} x={x} z={0} y={PODIUM_HEIGHT + 0.01} radius={1.15} opacity={0.42} texture={blob} />
      ))}
      <Blob x={-TEMPLE_WIDTH / 2 - 2.2} z={6.2} radius={0.9} opacity={0.4} texture={blob} />
      <Blob x={TEMPLE_WIDTH / 2 + 2.2} z={6.2} radius={0.9} opacity={0.4} texture={blob} />
      <Blob x={12.5} z={12} radius={2} opacity={0.45} texture={blob} />
      <Blob x={-11.5} z={13.5} radius={1.5} opacity={0.45} texture={blob} />
      <Blob x={-TEMPLE_WIDTH / 2 - 9} z={-4} radius={2.2} opacity={0.5} texture={blob} />
      <Blob x={-TEMPLE_WIDTH / 2 - 13} z={4} radius={1.7} opacity={0.5} texture={blob} />
      <Blob x={TEMPLE_WIDTH / 2 + 10} z={-2} radius={2.4} opacity={0.5} texture={blob} />
      <Blob x={TEMPLE_WIDTH / 2 + 14} z={6} radius={1.8} opacity={0.5} texture={blob} />

      {/* Halo chaud montant du parvis */}
      <pointLight position={[0, 3.5, 12]} color="#e8cd9c" intensity={12} distance={30} decay={2} />
    </>
  );
}
