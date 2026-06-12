"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Instances, Instance, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import Galaxy from "./Galaxy";
import { fbm } from "./noise";
import {
  marbleSurface,
  travertineSurface,
  bronzeSurface,
  sandSurface,
  fluteTexture,
  flameTexture,
  softParticleTexture,
  starPositions,
  skyGradientTexture,
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
const ENTER_DURATION = 2.4;

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

/** Champ d'étoiles sur deux strates (proches plus vives, lointaines ténues). */
function Stars() {
  const near = useMemo(() => starPositions(1100, 96), []);
  const far = useMemo(() => starPositions(1700, 122), []);
  const sprite = useMemo(() => softParticleTexture(), []);
  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[near, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.42}
          map={sprite}
          color="#f4eede"
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
          fog={false}
        />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[far, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.24}
          map={sprite}
          color="#aab8d6"
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          fog={false}
        />
      </points>
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

/**
 * Torchère de bronze posée au sol : socle de pierre, fût bagué, vasque
 * tournée, braises incandescentes et flammes sur plans croisés animés
 * par flicker — halo additif et lumière vacillante.
 */
function Torch({
  x,
  z,
  scale = 1,
  flame,
  stone,
}: {
  x: number;
  z: number;
  scale?: number;
  flame: THREE.Texture;
  stone: SurfaceMaps;
}) {
  const light = useRef<THREE.PointLight>(null);
  const flameA = useRef<THREE.Mesh>(null);
  const flameB = useRef<THREE.Mesh>(null);
  const ember = useRef<THREE.MeshStandardMaterial>(null);
  const haloMat = useRef<THREE.SpriteMaterial>(null);
  const halo = useMemo(() => new THREE.CanvasTexture(glowCanvas("rgba(255, 166, 64, 0.85)")), []);

  // Vasque évasée (profil tourné)
  const bowl = useMemo(() => {
    const profile: Array<[number, number]> = [
      [0.06, 0],
      [0.11, 0.02],
      [0.13, 0.1],
      [0.21, 0.17],
      [0.34, 0.26],
      [0.43, 0.36],
      [0.45, 0.44],
      [0.4, 0.46],
      [0.33, 0.39],
      [0.29, 0.36],
    ];
    return new THREE.LatheGeometry(
      profile.map(([r, h]) => new THREE.Vector2(r, h)),
      20
    );
  }, []);

  // Plans de flamme ancrés à leur base (l'échelle grandit vers le haut)
  const flamePlane = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.66, 1.22);
    g.translate(0, 0.61, 0);
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f =
      0.82 +
      Math.sin(t * 9 + x) * 0.1 +
      Math.sin(t * 23 + x * 2.3) * 0.06 +
      Math.sin(t * 4.7 + x) * 0.05;
    if (light.current) light.current.intensity = 30 * f * scale;
    if (flameA.current) {
      flameA.current.scale.set(0.94 + (1 - f) * 0.25, 0.74 + f * 0.45, 1);
      flameA.current.rotation.z = Math.sin(t * 6.3 + x) * 0.05;
    }
    if (flameB.current) {
      flameB.current.scale.set(0.86 + f * 0.18, 0.68 + f * 0.5, 1);
      flameB.current.rotation.z = Math.sin(t * 7.1 + x + 2) * 0.06;
    }
    if (ember.current) ember.current.emissiveIntensity = 1.6 + f * 1.6;
    if (haloMat.current) haloMat.current.opacity = 0.3 + f * 0.2;
  });

  return (
    <group position={[x, 0, z]} scale={scale}>
      {/* Socle de pierre octogonal */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.46, 0.58, 0.36, 8]} />
        <meshStandardMaterial {...stone} bumpScale={0.7} />
      </mesh>
      {/* Fût de bronze légèrement tronconique */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.095, 2.3, 12]} />
        <meshStandardMaterial color="#4a3a22" metalness={0.82} roughness={0.42} />
      </mesh>
      {/* Bagues décoratives */}
      {[0.7, 1.55, 2.4].map((h) => (
        <mesh key={h} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.095, 0.022, 8, 18]} />
          <meshStandardMaterial color="#8a6530" metalness={0.88} roughness={0.32} />
        </mesh>
      ))}
      {/* Vasque */}
      <mesh geometry={bowl} position={[0, 2.62, 0]} castShadow>
        <meshStandardMaterial color="#54421f" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* Braises incandescentes */}
      <mesh position={[0, 3.04, 0]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[0.3, 14, 10]} />
        <meshStandardMaterial
          ref={ember}
          color="#2b1206"
          emissive="#ff5a1a"
          emissiveIntensity={2.2}
          roughness={0.9}
          toneMapped={false}
        />
      </mesh>
      {/* Flammes : deux plans croisés, texture en langue de feu */}
      <mesh ref={flameA} geometry={flamePlane} position={[0, 3.05, 0]}>
        <meshBasicMaterial
          map={flame}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={flameB} geometry={flamePlane} position={[0, 3.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <meshBasicMaterial
          map={flame}
          transparent
          opacity={0.85}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {/* Halo */}
      <sprite scale={[2.1, 2.1, 1]} position={[0, 3.3, 0]}>
        <spriteMaterial
          ref={haloMat}
          map={halo}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <pointLight ref={light} position={[0, 3.3, 0]} color="#ff9d45" intensity={30} distance={20} decay={2} />
    </group>
  );
}

/**
 * Cyprès d'Italie : profil fuselé en révolution dont la surface est
 * ébouriffée par un bruit fractal (silhouette irrégulière, masses de
 * feuillage) et teintée par sommet — vert profond dans les creux,
 * reflets glauques sur les masses exposées. Graine déterministe issue
 * de la position : chaque arbre est unique mais stable.
 */
function Cypress({ x, z, height }: { x: number; z: number; height: number }) {
  const { geometry, lean, spin } = useMemo(() => {
    let s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    const rnd = () => {
      s = Math.sin(s + 1) * 43758.5453;
      return s - Math.floor(s);
    };
    const seed = rnd() * 40;
    const maxR = height * 0.155 * (0.85 + rnd() * 0.3);
    const profile: Array<[number, number]> = [
      [0.05, 0],
      [0.55, 0.04],
      [0.85, 0.13],
      [1.0, 0.3],
      [0.94, 0.45],
      [0.8, 0.6],
      [0.58, 0.74],
      [0.36, 0.85],
      [0.18, 0.93],
      [0.06, 0.985],
      [0.012, 1.0],
    ];
    const points = profile.map(
      ([r, h]) => new THREE.Vector2(Math.max(r * maxR, 0.012), h * height)
    );
    const geo = new THREE.LatheGeometry(points, 22);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const dark = new THREE.Color("#11240f");
    const light = new THREE.Color("#33522a");
    const tint = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const a = Math.atan2(vz, vx);
      const hn = vy / height;
      // Déplacement radial : masses de feuillage irrégulières
      const n = fbm(Math.cos(a) * 1.8 + seed, Math.sin(a) * 1.8 + hn * 7, 3);
      const k = 0.74 + n * 0.56;
      pos.setX(i, vx * k);
      pos.setZ(i, vz * k);
      // Teinte : creux sombres, masses exposées plus claires
      const n2 = fbm(Math.cos(a) * 3 + seed + 5, hn * 11 + Math.sin(a) * 3, 3);
      tint.copy(dark).lerp(light, Math.max(0, n2 * 1.3 - 0.2) * (0.35 + hn * 0.65));
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }
    geo.computeVertexNormals();
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return {
      geometry: geo,
      lean: (rnd() - 0.5) * 0.06,
      spin: rnd() * Math.PI,
    };
  }, [x, z, height]);

  return (
    <group position={[x, 0, z]} rotation={[0, spin, lean]}>
      {/* Tronc apparent à la base */}
      <mesh position={[0, height * 0.04, 0]} castShadow>
        <cylinderGeometry args={[height * 0.012, height * 0.024, height * 0.1, 7]} />
        <meshStandardMaterial color="#3a2b1c" roughness={0.92} />
      </mesh>
      {/* Feuillage */}
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}

/* Bosquets de cyprès : abords immédiats, arrière du temple, lointains. */
const CYPRESSES: Array<[number, number, number]> = [
  // Flancs proches
  [-20, -4, 11],
  [-24, 4, 8.5],
  [-27.5, -10, 12.5],
  [-31, 0.5, 9.5],
  [-22.5, -16, 10],
  [21, -2, 12],
  [25, 6, 9],
  [28.5, -9, 13],
  [33, 1, 10],
  [24, -17, 10.5],
  // Derrière le temple
  [-14, -27, 12],
  [-7, -31, 9.5],
  [3, -29, 11],
  [11, -32, 10],
  [17, -26, 12.5],
  [-19, -34, 11],
  // Lointains
  [-38, -15, 13],
  [40, -13, 12.5],
  [-36, 9, 8],
  [37, 12, 8.5],
];

/** Pierres et éclats à demi enfouis dans le sable (graine déterministe). */
function ScatterStones() {
  const items = useMemo(() => {
    let s = 4.7;
    const rnd = () => {
      s = Math.sin(s * 91.17 + 13.7) * 43758.5453;
      return s - Math.floor(s);
    };
    const list: Array<{
      position: [number, number, number];
      scale: number;
      rotation: [number, number, number];
    }> = [];
    let guard = 0;
    while (list.length < 46 && guard++ < 400) {
      const x = (rnd() - 0.5) * 95;
      const z = (rnd() - 0.5) * 86 + 8;
      // Allée centrale et emprise du temple dégagées
      if (Math.abs(x) < 6 && z > -8) continue;
      if (Math.abs(x) < TEMPLE_WIDTH / 2 + 3 && z < 7 && z > -16) continue;
      const scale = 0.1 + rnd() * 0.32;
      list.push({
        position: [x, scale * 0.32, z],
        scale,
        rotation: [rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI],
      });
    }
    return list;
  }, []);

  return (
    <Instances limit={items.length} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8f8576" roughness={0.95} />
      {items.map((item, i) => (
        <Instance
          key={i}
          position={item.position}
          scale={item.scale}
          rotation={item.rotation}
        />
      ))}
    </Instances>
  );
}

/** Vestiges épars : tambours, chapiteau brisé, fragment d'architrave. */
function Ruins({
  marble,
  marbleWall,
  blob,
}: {
  marble: SurfaceMaps;
  marbleWall: SurfaceMaps;
  blob: THREE.Texture;
}) {
  return (
    <group>
      {/* Tambour effondré, à demi enfoui */}
      <mesh position={[12.5, 0.42, 12]} rotation={[0, 0.6, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.55, 1.9, 22]} />
        <meshStandardMaterial {...marble} bumpScale={0.7} />
      </mesh>
      {/* Bloc de travertin renversé */}
      <mesh position={[-11.5, 0.26, 13.5]} rotation={[0.1, 0.9, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.7, 1.1]} />
        <meshStandardMaterial {...marbleWall} bumpScale={0.8} />
      </mesh>

      {/* Pile de tambours d'une colonne disparue, le dernier basculé */}
      <group position={[17.5, 0, 2]}>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.63, 0.85, 22]} />
          <meshStandardMaterial {...marble} bumpScale={0.7} />
        </mesh>
        <mesh position={[0.07, 1.2, -0.04]} rotation={[0.07, 0.5, 0.05]} castShadow receiveShadow>
          <cylinderGeometry args={[0.58, 0.6, 0.78, 22]} />
          <meshStandardMaterial {...marble} bumpScale={0.7} />
        </mesh>
        <mesh position={[1.7, 0.46, 1.5]} rotation={[Math.PI / 2 - 0.1, 0, 0.8]} castShadow receiveShadow>
          <cylinderGeometry args={[0.56, 0.56, 0.8, 22]} />
          <meshStandardMaterial {...marbleWall} bumpScale={0.8} />
        </mesh>
      </group>

      {/* Chapiteau ionique brisé, couché dans le sable */}
      <group position={[-16, 0.32, 8]} rotation={[0.4, 0.7, 0.18]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.26, 1.3]} />
          <meshStandardMaterial {...marble} bumpScale={0.7} />
        </mesh>
        <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.58, 0.36, 20]} />
          <meshStandardMaterial {...marble} bumpScale={0.7} />
        </mesh>
        {[-0.55, 0.55].map((vx) => (
          <mesh key={vx} position={[vx, -0.12, 0.62]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.17, 0.07, 9, 18]} />
            <meshStandardMaterial {...marble} bumpScale={0.7} />
          </mesh>
        ))}
      </group>

      {/* Fragment d'architrave à fasces, fiché de biais */}
      <group position={[-9.5, 0.34, 18.5]} rotation={[0.06, -0.55, 0.12]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.62, 0.8]} />
          <meshStandardMaterial {...marbleWall} bumpScale={0.8} />
        </mesh>
        <mesh position={[0, 0.18, 0.42]} castShadow>
          <boxGeometry args={[2.6, 0.18, 0.05]} />
          <meshStandardMaterial {...marble} bumpScale={0.6} />
        </mesh>
        <mesh position={[0, -0.08, 0.42]} castShadow>
          <boxGeometry args={[2.6, 0.14, 0.04]} />
          <meshStandardMaterial {...marble} bumpScale={0.6} />
        </mesh>
      </group>

      {/* Ombres de contact des vestiges */}
      <Blob x={12.5} z={12} radius={2} opacity={0.45} texture={blob} />
      <Blob x={-11.5} z={13.5} radius={1.5} opacity={0.45} texture={blob} />
      <Blob x={17.5} z={2} radius={1.6} opacity={0.45} texture={blob} />
      <Blob x={19.2} z={3.5} radius={1.2} opacity={0.4} texture={blob} />
      <Blob x={-16} z={8} radius={1.6} opacity={0.45} texture={blob} />
      <Blob x={-9.5} z={18.5} radius={2} opacity={0.45} texture={blob} />
    </group>
  );
}

/** Éclairage rasant montant du sol le long de la colonnade. */
function Uplight({ x }: { x: number }) {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(x * 0.92, ENTAB_Y - 1.4, -0.4);
    return o;
  }, [x]);
  return (
    <>
      <spotLight
        position={[x, 0.3, 4.8]}
        target={target}
        color="#e0b372"
        intensity={300}
        angle={0.36}
        penumbra={0.85}
        distance={36}
        decay={2}
      />
      <primitive object={target} />
    </>
  );
}

/**
 * Battant de bronze ouvragé : double panneau en relief, anneau de tirage
 * et astragale au bord de jonction. `side` = +1 (battant gauche) ou -1
 * (battant droit), les coordonnées étant exprimées dans le repère du
 * groupe articulé sur le gond.
 */
function DoorLeaf({ side, bronze }: { side: 1 | -1; bronze: SurfaceMaps }) {
  const cx = side * 1.05;
  const innerX = cx + side * 0.86;
  return (
    <>
      <mesh position={[cx, 0, 0]} castShadow>
        <boxGeometry args={[2.1, 6.6, 0.16]} />
        <meshStandardMaterial {...bronze} bumpScale={0.8} metalness={0.75} />
      </mesh>
      {/* Deux panneaux à cadre saillant et fond recreusé */}
      {[1.5, -1.5].map((py) => (
        <group key={py} position={[cx, py, 0]}>
          <mesh position={[0, 0, 0.05]} castShadow>
            <boxGeometry args={[1.52, 2.3, 0.06]} />
            <meshStandardMaterial color="#7a5829" metalness={0.8} roughness={0.34} />
          </mesh>
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[1.16, 1.94, 0.04]} />
            <meshStandardMaterial {...bronze} bumpScale={0.6} metalness={0.7} />
          </mesh>
          {/* Bossette centrale */}
          <mesh position={[0, 0, 0.12]}>
            <sphereGeometry args={[0.12, 12, 8]} />
            <meshStandardMaterial color="#9a7338" metalness={0.88} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Astragale au bord de jonction */}
      <mesh position={[innerX, 0, 0.07]} castShadow>
        <boxGeometry args={[0.12, 6.5, 0.1]} />
        <meshStandardMaterial color="#7a5829" metalness={0.82} roughness={0.32} />
      </mesh>
      {/* Anneau de tirage */}
      <group position={[innerX - side * 0.28, 0.5, 0.12]}>
        <mesh>
          <torusGeometry args={[0.22, 0.05, 10, 24]} />
          <meshStandardMaterial color="#9a7338" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.1, 12, 8]} />
          <meshStandardMaterial color="#9a7338" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>
    </>
  );
}

/**
 * Façade monumentale du temple, de nuit : huit colonnes cannelées sur
 * podium à grand escalier, entablement denticulé, fronton à acrotères,
 * grandes portes de bronze ouvragées, torchères, galaxie de particules,
 * bosquets de cyprès et vestiges sur la terre sableuse de l'esplanade.
 */
export default function FacadeScene({
  entering,
  highQuality,
}: {
  entering: boolean;
  highQuality: boolean;
}) {
  const { camera } = useThree();

  // Suivi de l'approche : instant de départ, position ET regard figés au
  // premier frame d'entrée pour une interpolation parfaitement fluide
  // (aucun accoup même si la souris a décentré le regard).
  const enterStart = useRef<number | null>(null);
  const camStart = useRef(new THREE.Vector3());
  const lookStart = useRef(new THREE.Vector3());
  const lookCurrent = useRef(new THREE.Vector3(0, 10.4, 0));
  const leftDoor = useRef<THREE.Group>(null);
  const rightDoor = useRef<THREE.Group>(null);
  const interiorLight = useRef<THREE.PointLight>(null);
  const interiorGlow = useRef<THREE.MeshBasicMaterial>(null);

  const marble = useMemo(() => marbleSurface(), []);
  const marbleWall = useMemo(() => setRepeat(travertineSurface(), 4, 2.4), []);
  const bronze = useMemo(() => bronzeSurface(), []);
  const sand = useMemo(() => setRepeat(sandSurface(), 13, 13), []);
  const flutes = useMemo(() => {
    const t = fluteTexture();
    t.repeat.set(4, 1);
    return t;
  }, []);
  const flame = useMemo(() => flameTexture(), []);
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
      // trouve le visiteur (position et regard), sans aucun saut.
      if (enterStart.current === null) {
        enterStart.current = clock.elapsedTime;
        camStart.current.copy(camera.position);
        lookStart.current.copy(lookCurrent.current);
      }
      const t = THREE.MathUtils.clamp(
        (clock.elapsedTime - enterStart.current) / ENTER_DURATION,
        0,
        1
      );
      const e = easeInOutCubic(t);

      // Glissé fluide depuis la position de départ jusqu'au seuil même des
      // portes, à hauteur d'œil — sans franchir la cella (évite tout
      // passage à travers les murs).
      const eyeY = PODIUM_HEIGHT + 1.9;
      const targetZ = -PORCH_DEPTH + 0.26;
      camera.position.x = THREE.MathUtils.lerp(camStart.current.x, 0, e);
      camera.position.y = THREE.MathUtils.lerp(camStart.current.y, eyeY, e);
      camera.position.z = THREE.MathUtils.lerp(camStart.current.z, targetZ, e);
      // Le regard descend en douceur du fronton vers la baie lumineuse.
      lookCurrent.current.set(
        THREE.MathUtils.lerp(lookStart.current.x, 0, e),
        THREE.MathUtils.lerp(lookStart.current.y, PODIUM_HEIGHT + 2.8, e),
        THREE.MathUtils.lerp(lookStart.current.z, -14, e)
      );
      camera.lookAt(lookCurrent.current);

      // Les battants s'ouvrent en grand, un peu en avance sur la marche.
      const open = THREE.MathUtils.lerp(
        DOOR_AJAR,
        DOOR_OPEN,
        easeInOutCubic(Math.min(t * 1.3, 1))
      );
      if (leftDoor.current) leftDoor.current.rotation.y = open;
      if (rightDoor.current) rightDoor.current.rotation.y = -open;

      // La lumière du sanctuaire n'enfle que sur la fin de l'approche : on
      // voit d'abord nettement les portes s'ouvrir, puis le blanc nous gagne
      // une fois le seuil franchi.
      const glow = THREE.MathUtils.clamp((e - 0.45) / 0.5, 0, 1);
      if (interiorLight.current) interiorLight.current.intensity = 20 + glow * 180;
      if (interiorGlow.current) interiorGlow.current.opacity = glow;
    } else {
      enterStart.current = null;
      // Regard levé vers le fronton ; position ET cible du regard amorties
      // pour un suivi de souris soyeux, sans à-coups.
      const breathe = Math.sin(clock.elapsedTime * 0.4) * 0.1;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 1.8, 1.6, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 2 + breathe + pointer.y * 0.6, 1.6, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 25, 1.2, delta);
      lookCurrent.current.x = THREE.MathUtils.damp(lookCurrent.current.x, pointer.x * 1.4, 1.6, delta);
      lookCurrent.current.y = THREE.MathUtils.damp(lookCurrent.current.y, 10.4 + pointer.y * 1.2, 1.6, delta);
      lookCurrent.current.z = THREE.MathUtils.damp(lookCurrent.current.z, 0, 1.6, delta);
      camera.lookAt(lookCurrent.current);

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
      <color attach="background" args={["#05070f"]} />
      <fog attach="fog" args={["#0c0b16", 32, 115]} />
      <SkyDome />
      <Galaxy count={highQuality ? 80000 : 24000} />

      {/* Réflexions d'environnement nocturne (procédural, sans réseau) */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.2} color="#26334d" position={[0, 14, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer intensity={1.6} color="#e8cd9c" position={[0, 4, 12]} scale={[14, 6, 1]} />
        <Lightformer intensity={0.7} color="#ff9d45" position={[-12, 2, 6]} scale={[5, 3, 1]} />
      </Environment>

      <ambientLight intensity={0.14} />
      <hemisphereLight args={["#2c3a58", "#3a2f1e", 0.22]} />
      {/* Lumière sidérale : la source d'ombres */}
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

      {/* Terre sableuse de l'esplanade */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 8]} receiveShadow>
        <planeGeometry args={[170, 170]} />
        <meshStandardMaterial {...sand} bumpScale={1.3} />
      </mesh>
      <ScatterStones />

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
        <DoorLeaf side={1} bronze={bronze} />
      </group>
      <group
        ref={rightDoor}
        position={[2.2, doorY - 0.2, -PORCH_DEPTH + 0.26]}
        rotation={[0, -DOOR_AJAR, 0]}
      >
        <DoorLeaf side={-1} bronze={bronze} />
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

      {/* Éclairage rasant de la colonnade */}
      <Uplight x={-7.4} />
      <Uplight x={7.4} />

      {/* Torchères : paire au pied de l'escalier, paire le long de l'allée */}
      <Torch x={-TEMPLE_WIDTH / 2 - 3.4} z={7} flame={flame} stone={marbleWall} />
      <Torch x={TEMPLE_WIDTH / 2 + 3.4} z={7} flame={flame} stone={marbleWall} />
      <Torch x={-6.2} z={17.5} scale={0.85} flame={flame} stone={marbleWall} />
      <Torch x={6.2} z={17.5} scale={0.85} flame={flame} stone={marbleWall} />

      {/* Bosquets de cyprès */}
      {CYPRESSES.map(([x, z, height]) => (
        <Cypress key={`${x}-${z}`} x={x} z={z} height={height} />
      ))}

      {/* Vestiges épars */}
      <Ruins marble={marble} marbleWall={marbleWall} blob={blob} />

      {/* Ombres de contact au sol */}
      {columnXs.map((x) => (
        <Blob key={`blob-${x}`} x={x} z={0} y={PODIUM_HEIGHT + 0.01} radius={1.15} opacity={0.42} texture={blob} />
      ))}
      <Blob x={-TEMPLE_WIDTH / 2 - 3.4} z={7} radius={1} opacity={0.42} texture={blob} />
      <Blob x={TEMPLE_WIDTH / 2 + 3.4} z={7} radius={1} opacity={0.42} texture={blob} />
      <Blob x={-6.2} z={17.5} radius={0.85} opacity={0.4} texture={blob} />
      <Blob x={6.2} z={17.5} radius={0.85} opacity={0.4} texture={blob} />
      {CYPRESSES.map(([x, z, height]) => (
        <Blob
          key={`cblob-${x}-${z}`}
          x={x}
          z={z}
          radius={height * 0.18}
          opacity={0.5}
          texture={blob}
        />
      ))}

      {/* Halo chaud montant du parvis */}
      <pointLight position={[0, 3.5, 12]} color="#e8cd9c" intensity={9} distance={28} decay={2} />
    </>
  );
}
