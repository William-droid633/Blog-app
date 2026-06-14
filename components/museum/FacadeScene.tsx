"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Instances, Instance, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { fbm } from "./noise";
import {
  marbleSurface,
  travertineSurface,
  bronzeSurface,
  fluteTexture,
  flameTexture,
  softParticleTexture,
  inscriptionTexture,
  starPositions,
  nebulaSkyTexture,
  starGlintTexture,
  shadowBlobTexture,
  setRepeat,
  cloneSurface,
  type SurfaceMaps,
} from "./textures";
import { GROUND_FILES, WALL_FILES, STAIR_FILES, ROCK_FILES, usePbrSurface } from "./pbr";

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
const CELLA_WALL_WIDTH = TEMPLE_WIDTH - 1.4;
const CELLA_WALL_HEIGHT = COLUMN_HEIGHT + 1;
const CELLA_Z = -PORCH_DEPTH - 0.4;

/* — La grande porte : baie réelle percée dans la cella, toujours ouverte — */
const BAY_WIDTH = 4.4;
const BAY_HEIGHT = 6.9;
const LEAF_WIDTH = 2.1;
const LEAF_HEIGHT = 6.6;
/* Battants rabattus contre les murs du vestibule (~83°). */
const DOOR_OPEN_ANGLE = 1.45;
const VESTIBULE_DEPTH = 4.2;
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

/** Dôme céleste : nébuleuse colorée (gaz chaud, cœur bleu, poussières)
 *  enveloppant toute la scène — cf. nebulaSkyTexture. */
function SkyDome() {
  const texture = useMemo(() => nebulaSkyTexture(), []);
  return (
    <mesh renderOrder={-2}>
      <sphereGeometry args={[130, 48, 32]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        toneMapped={false}
      />
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

/** Couleurs stellaires réalistes : surtout des étoiles blanches et chaudes,
 *  quelques bleu-blanc (chaudes) et de rares ambres (froides), avec une
 *  luminosité en loi de puissance — une foule de faibles, de rares vives. */
function starColors(count: number, brightness: number): Float32Array {
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let cr: number;
    let cg: number;
    let cb: number;
    if (r < 0.18) {
      cr = 0.72; cg = 0.8; cb = 1.0; // bleu-blanc
    } else if (r < 0.48) {
      cr = 1.0; cg = 0.98; cb = 0.95; // blanc
    } else if (r < 0.72) {
      cr = 1.0; cg = 0.93; cb = 0.82; // blanc chaud
    } else if (r < 0.9) {
      cr = 1.0; cg = 0.86; cb = 0.66; // jaune pâle
    } else {
      cr = 1.0; cg = 0.74; cb = 0.5; // ambre
    }
    const b = brightness * (0.35 + 0.65 * Math.pow(Math.random(), 2));
    colors[i * 3] = cr * b;
    colors[i * 3 + 1] = cg * b;
    colors[i * 3 + 2] = cb * b;
  }
  return colors;
}

/** Champ d'étoiles dense et omnidirectionnel sur cinq strates de profondeur :
 *  semis fin et coloré devant la nébuleuse (du carpet de faibles aux vives à
 *  aigrettes de diffraction), pour la densité d'une astrophotographie. */
function Stars({ highQuality }: { highQuality: boolean }) {
  const soft = useMemo(() => softParticleTexture(), []);
  const glint = useMemo(() => starGlintTexture(), []);
  const layers = useMemo(() => {
    const q = highQuality ? 1 : 0.55;
    const defs = [
      { count: Math.round(90 * (highQuality ? 1 : 0.7)), radius: 100, size: 1.3, brightness: 1.0, glint: true },
      { count: Math.round(700 * q), radius: 104, size: 0.6, brightness: 0.95, glint: false },
      { count: Math.round(4200 * q), radius: 112, size: 0.38, brightness: 0.8, glint: false },
      { count: Math.round(9000 * q), radius: 120, size: 0.22, brightness: 0.62, glint: false },
      { count: Math.round(14000 * q), radius: 126, size: 0.15, brightness: 0.5, glint: false },
    ];
    return defs.map((d) => ({
      ...d,
      positions: starPositions(d.count, d.radius),
      colors: starColors(d.count, d.brightness),
    }));
  }, [highQuality]);

  return (
    <group>
      {layers.map((layer, i) => (
        <points key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[layer.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[layer.colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={layer.size}
            map={layer.glint ? glint : soft}
            vertexColors
            transparent
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            fog={false}
          />
        </points>
      ))}
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

/* ——— Statuaire du fronton ——— */

type StatuePose = "hercules" | "toga" | "seated" | "reclining";

/**
 * Statue de marbre simplifiée mais bien proportionnée — vue à plus de
 * vingt mètres, dans l'ombre du fronton rasée par la lumière : la
 * silhouette fait tout. Quatre poses canoniques de fronton : figure
 * centrale debout (Hercule à la massue et à la peau de lion), figures
 * drapées en pied, assises, puis couchées vers les angles.
 */
function Statue({
  x,
  h,
  pose,
  mirror = false,
  marble,
}: {
  x: number;
  h: number;
  pose: StatuePose;
  mirror?: boolean;
  marble: SurfaceMaps;
}) {
  const m = mirror ? -1 : 1;
  const material = <meshStandardMaterial {...marble} bumpScale={0.62} color="#ece4d0" />;

  const robe = useMemo(() => {
    if (pose !== "toga") return null;
    const profile: Array<[number, number]> = [
      [0.06, 0],
      [0.16, 0.02],
      [0.13, 0.18],
      [0.12, 0.38],
      [0.14, 0.52],
      [0.105, 0.68],
      [0.085, 0.78],
    ];
    return new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r * h, y * h)),
      20
    );
  }, [pose, h]);

  return (
    <group position={[x, 0, 0]}>
      {pose === "hercules" && (
        <>
          {/* Jambes en appui décalé */}
          <mesh position={[-0.07 * h, 0.24 * h, 0]} castShadow>
            <cylinderGeometry args={[0.05 * h, 0.066 * h, 0.48 * h, 10]} />
            {material}
          </mesh>
          <mesh position={[0.09 * h, 0.23 * h, 0.04 * h]} rotation={[0.14, 0, -0.07]} castShadow>
            <cylinderGeometry args={[0.05 * h, 0.066 * h, 0.46 * h, 10]} />
            {material}
          </mesh>
          {/* Torse en V */}
          <mesh position={[0, 0.62 * h, 0]} castShadow>
            <cylinderGeometry args={[0.135 * h, 0.095 * h, 0.34 * h, 12]} />
            {material}
          </mesh>
          <mesh position={[0, 0.79 * h, 0]} scale={[1.45, 0.55, 0.95]} castShadow>
            <sphereGeometry args={[0.115 * h, 12, 10]} />
            {material}
          </mesh>
          {/* Tête */}
          <mesh position={[0, 0.9 * h, 0.01 * h]} castShadow>
            <sphereGeometry args={[0.078 * h, 12, 10]} />
            {material}
          </mesh>
          {/* Bras droit descendant vers la massue */}
          <mesh position={[0.17 * h * m, 0.6 * h, 0.02 * h]} rotation={[0, 0, -0.5 * m]} castShadow>
            <cylinderGeometry args={[0.032 * h, 0.04 * h, 0.36 * h, 8]} />
            {material}
          </mesh>
          {/* Massue posée au sol */}
          <mesh position={[0.28 * h * m, 0.26 * h, 0.06 * h]} rotation={[0.1, 0, 0.18 * m]} castShadow>
            <cylinderGeometry args={[0.055 * h, 0.02 * h, 0.5 * h, 9]} />
            {material}
          </mesh>
          {/* Bras gauche replié, peau du lion de Némée sur l'avant-bras */}
          <mesh position={[-0.16 * h * m, 0.68 * h, 0.05 * h]} rotation={[0.4, 0, 0.9 * m]} castShadow>
            <cylinderGeometry args={[0.03 * h, 0.038 * h, 0.3 * h, 8]} />
            {material}
          </mesh>
          <mesh position={[-0.25 * h * m, 0.5 * h, 0.05 * h]} rotation={[0.15, 0, 0.12 * m]} castShadow>
            <coneGeometry args={[0.09 * h, 0.36 * h, 8]} />
            {material}
          </mesh>
        </>
      )}

      {pose === "toga" && robe && (
        <>
          {/* Drapé tombant jusqu'aux pieds */}
          <mesh geometry={robe} castShadow>
            {material}
          </mesh>
          <mesh position={[0, 0.8 * h, 0]} scale={[1.35, 0.5, 0.85]} castShadow>
            <sphereGeometry args={[0.1 * h, 12, 10]} />
            {material}
          </mesh>
          <mesh position={[0, 0.895 * h, 0.005 * h]} castShadow>
            <sphereGeometry args={[0.07 * h, 12, 10]} />
            {material}
          </mesh>
          {/* Bras levé tenant la lance / le sceptre */}
          <mesh position={[0.15 * h * m, 0.68 * h, 0.02 * h]} rotation={[0, 0, -0.85 * m]} castShadow>
            <cylinderGeometry args={[0.028 * h, 0.035 * h, 0.3 * h, 8]} />
            {material}
          </mesh>
          <mesh position={[0.235 * h * m, 0.5 * h, 0.03 * h]} castShadow>
            <cylinderGeometry args={[0.012 * h, 0.012 * h, 0.95 * h, 6]} />
            {material}
          </mesh>
        </>
      )}

      {pose === "seated" && (
        <>
          {/* Siège */}
          <mesh position={[0, 0.17 * h, -0.06 * h]} castShadow>
            <boxGeometry args={[0.3 * h, 0.34 * h, 0.26 * h]} />
            {material}
          </mesh>
          {/* Cuisses, jambes */}
          <mesh position={[0, 0.39 * h, 0.08 * h]} castShadow>
            <boxGeometry args={[0.24 * h, 0.11 * h, 0.32 * h]} />
            {material}
          </mesh>
          {[-0.07, 0.07].map((dx) => (
            <mesh key={dx} position={[dx * h, 0.17 * h, 0.21 * h]} castShadow>
              <cylinderGeometry args={[0.038 * h, 0.045 * h, 0.34 * h, 8]} />
              {material}
            </mesh>
          ))}
          {/* Buste, épaules, tête */}
          <mesh position={[0, 0.61 * h, -0.02 * h]} castShadow>
            <cylinderGeometry args={[0.11 * h, 0.085 * h, 0.34 * h, 10]} />
            {material}
          </mesh>
          <mesh position={[0, 0.79 * h, -0.02 * h]} scale={[1.35, 0.5, 0.85]} castShadow>
            <sphereGeometry args={[0.095 * h, 12, 10]} />
            {material}
          </mesh>
          <mesh position={[0, 0.88 * h, -0.01 * h]} castShadow>
            <sphereGeometry args={[0.068 * h, 12, 10]} />
            {material}
          </mesh>
          {/* Bras posé sur la cuisse */}
          <mesh position={[0.12 * h * m, 0.52 * h, 0.06 * h]} rotation={[0.9, 0, -0.2 * m]} castShadow>
            <cylinderGeometry args={[0.026 * h, 0.034 * h, 0.3 * h, 8]} />
            {material}
          </mesh>
        </>
      )}

      {pose === "reclining" && (
        <>
          {/* Corps allongé, tête tournée vers le centre */}
          <mesh position={[0.18 * h * m, 0.24 * h, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.14 * h, 0.17 * h, 1.05 * h, 10]} />
            {material}
          </mesh>
          {/* Buste relevé sur le coude */}
          <mesh position={[-0.42 * h * m, 0.42 * h, 0]} rotation={[0, 0, 0.85 * m]} castShadow>
            <cylinderGeometry args={[0.1 * h, 0.12 * h, 0.45 * h, 10]} />
            {material}
          </mesh>
          <mesh position={[-0.56 * h * m, 0.6 * h, 0]} castShadow>
            <sphereGeometry args={[0.085 * h, 12, 10]} />
            {material}
          </mesh>
          {/* Coude d'appui */}
          <mesh position={[-0.52 * h * m, 0.22 * h, 0.02 * h]} castShadow>
            <cylinderGeometry args={[0.035 * h, 0.045 * h, 0.4 * h, 8]} />
            {material}
          </mesh>
        </>
      )}
    </group>
  );
}

/** Acrotère en palmette : éventail de feuilles sur bulbe. */
function Palmette({
  x,
  y,
  scale,
  marble,
}: {
  x: number;
  y: number;
  scale: number;
  marble: SurfaceMaps;
}) {
  const material = <meshStandardMaterial {...marble} bumpScale={0.5} />;
  return (
    <group position={[x, y, 1]} scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.16, 0.36]} />
        {material}
      </mesh>
      <mesh position={[0, 0.18, 0]} scale={[1, 0.65, 0.7]} castShadow>
        <sphereGeometry args={[0.17, 10, 8]} />
        {material}
      </mesh>
      {[-0.62, -0.31, 0, 0.31, 0.62].map((a) => (
        <mesh
          key={a}
          position={[Math.sin(a) * 0.26, 0.34 + Math.cos(a) * 0.16, 0]}
          rotation={[0, 0, -a]}
          castShadow
        >
          <coneGeometry args={[0.075, 0.6, 8]} />
          {material}
        </mesh>
      ))}
    </group>
  );
}

/**
 * Fronton sculpté : « Hercule reçu dans l'Olympe ». Composition canonique
 * d'un fronton romain — héros debout au centre, divinités drapées en pied,
 * figures assises, puis couchées en s'approchant des angles, posées sur la
 * plinthe du tympan. Acrotères en palmette aux trois pointes.
 */
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
      {/* Tympan en retrait, légèrement assombri pour détacher les figures */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial {...marble} bumpScale={0.6} color="#b1a78c" />
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

      {/* Plinthe sur laquelle se dressent les figures */}
      <mesh position={[0, 0.12, 1.25]} castShadow receiveShadow>
        <boxGeometry args={[TEMPLE_WIDTH + 0.8, 0.24, 0.95]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>

      {/* La scène : Hercule au centre, l'Olympe autour */}
      <group position={[0, 0.24, 2.18]}>
        <Statue x={0} h={2.5} pose="hercules" marble={marble} />
        <Statue x={-2.3} h={2.1} pose="toga" mirror marble={marble} />
        <Statue x={2.3} h={2.1} pose="toga" marble={marble} />
        <Statue x={-4.5} h={1.5} pose="seated" mirror marble={marble} />
        <Statue x={4.5} h={1.5} pose="seated" marble={marble} />
        <Statue x={-6.9} h={0.85} pose="reclining" mirror marble={marble} />
        <Statue x={6.9} h={0.85} pose="reclining" marble={marble} />
      </group>

      {/* Acrotères en palmette */}
      <Palmette x={-TEMPLE_WIDTH / 2 - 0.4} y={0.28} scale={1} marble={marble} />
      <Palmette x={TEMPLE_WIDTH / 2 + 0.4} y={0.28} scale={1} marble={marble} />
      <Palmette x={0} y={PEDIMENT_HEIGHT + 0.26} scale={1.3} marble={marble} />
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
 * Torchère de bronze : socle de pierre, fût bagué, vasque tournée,
 * braises incandescentes et flammes sur plans croisés animés par
 * flicker — halo additif et lumière vacillante. `y` permet de la
 * poser sur une maçonnerie (murs d'échiffre de l'escalier).
 */
function Torch({
  x,
  y = 0,
  z,
  scale = 1,
  flame,
  stone,
}: {
  x: number;
  y?: number;
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
    <group position={[x, y, z]} scale={scale}>
      {/* Socle de pierre octogonal */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.46, 0.58, 0.36, 8]} />
        <meshStandardMaterial {...stone} bumpScale={0.7} />
      </mesh>
      {/* Fût de bronze légèrement tronconique */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.095, 2.3, 12]} />
        <meshStandardMaterial color="#5e4a26" metalness={0.9} roughness={0.38} />
      </mesh>
      {/* Bagues décoratives */}
      {[0.7, 1.55, 2.4].map((h) => (
        <mesh key={h} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.095, 0.022, 8, 18]} />
          <meshStandardMaterial color="#a87f3e" metalness={0.92} roughness={0.26} />
        </mesh>
      ))}
      {/* Vasque */}
      <mesh geometry={bowl} position={[0, 2.62, 0]} castShadow>
        <meshStandardMaterial color="#6b5328" metalness={0.88} roughness={0.36} />
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
    const geo = new THREE.LatheGeometry(points, 28);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    // Trois verts : creux très sombre → masse moyenne → pointes ensoleillées
    const shadow = new THREE.Color("#0f2412");
    const mid = new THREE.Color("#274a20");
    const sun = new THREE.Color("#5c7f3b");
    const tint = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const a = Math.atan2(vz, vx);
      const hn = vy / height;
      // Déplacement radial : masses de feuillage irrégulières
      const n = fbm(Math.cos(a) * 1.8 + seed, Math.sin(a) * 1.8 + hn * 7, 3);
      const k = 0.72 + n * 0.6;
      pos.setX(i, vx * k);
      pos.setZ(i, vz * k);
      // Exposition : creux sombres, masses saillantes et hautes plus claires
      const n2 = fbm(Math.cos(a) * 3 + seed + 5, hn * 11 + Math.sin(a) * 3, 3);
      const exposure = Math.min(1, Math.max(0, n2 * 1.35 - 0.18) * (0.32 + hn * 0.68));
      if (exposure < 0.5) tint.copy(shadow).lerp(mid, exposure * 2);
      else tint.copy(mid).lerp(sun, (exposure - 0.5) * 2);
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

  const rock = usePbrSurface(ROCK_FILES, 1, 1);

  return (
    <Instances limit={items.length} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial {...rock} />
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

/** Vestiges épars : tambours, chapiteau brisé, fragment d'architrave —
 *  même pierre que les petits débris (marble_rock_02), à fort relief. */
function Ruins({ blob }: { blob: THREE.Texture }) {
  const rockBase = usePbrSurface(ROCK_FILES, 1, 1);
  const rock = useMemo(() => setRepeat(cloneSurface(rockBase), 1.6, 1.6), [rockBase]);
  // Relief marqué : la carte de normales est poussée pour des débris rugueux.
  const relief = useMemo(() => new THREE.Vector2(1.7, 1.7), []);

  return (
    <group>
      {/* Tambour effondré, à demi enfoui */}
      <mesh position={[12.5, 0.42, 12]} rotation={[0, 0.6, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.55, 1.9, 22]} />
        <meshStandardMaterial {...rock} normalScale={relief} />
      </mesh>
      {/* Bloc renversé */}
      <mesh position={[-11.5, 0.26, 13.5]} rotation={[0.1, 0.9, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.7, 1.1]} />
        <meshStandardMaterial {...rock} normalScale={relief} />
      </mesh>

      {/* Pile de tambours d'une colonne disparue, le dernier basculé */}
      <group position={[17.5, 0, 2]}>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.63, 0.85, 22]} />
          <meshStandardMaterial {...rock} normalScale={relief} />
        </mesh>
        <mesh position={[0.07, 1.2, -0.04]} rotation={[0.07, 0.5, 0.05]} castShadow receiveShadow>
          <cylinderGeometry args={[0.58, 0.6, 0.78, 22]} />
          <meshStandardMaterial {...rock} normalScale={relief} />
        </mesh>
        <mesh position={[1.7, 0.46, 1.5]} rotation={[Math.PI / 2 - 0.1, 0, 0.8]} castShadow receiveShadow>
          <cylinderGeometry args={[0.56, 0.56, 0.8, 22]} />
          <meshStandardMaterial {...rock} normalScale={relief} />
        </mesh>
      </group>

      {/* Chapiteau ionique brisé, couché dans le sable */}
      <group position={[-16, 0.32, 8]} rotation={[0.4, 0.7, 0.18]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.26, 1.3]} />
          <meshStandardMaterial {...rock} normalScale={relief} />
        </mesh>
        <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.58, 0.36, 20]} />
          <meshStandardMaterial {...rock} normalScale={relief} />
        </mesh>
        {[-0.55, 0.55].map((vx) => (
          <mesh key={vx} position={[vx, -0.12, 0.62]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.17, 0.07, 9, 18]} />
            <meshStandardMaterial {...rock} normalScale={relief} />
          </mesh>
        ))}
      </group>

      {/* Fragment d'architrave à fasces, fiché de biais */}
      <group position={[-9.5, 0.34, 18.5]} rotation={[0.06, -0.55, 0.12]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.62, 0.8]} />
          <meshStandardMaterial {...rock} normalScale={relief} />
        </mesh>
        <mesh position={[0, 0.18, 0.42]} castShadow>
          <boxGeometry args={[2.6, 0.18, 0.05]} />
          <meshStandardMaterial {...rock} normalScale={relief} />
        </mesh>
        <mesh position={[0, -0.08, 0.42]} castShadow>
          <boxGeometry args={[2.6, 0.14, 0.04]} />
          <meshStandardMaterial {...rock} normalScale={relief} />
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

/** Projecteur discret levé vers le fronton sculpté. */
function PedimentLight() {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, ENTAB_Y + ENTABLATURE_HEIGHT + 1.4, 0.6);
    return o;
  }, []);
  return (
    <>
      <spotLight
        position={[0, ENTAB_Y - 1.2, 9]}
        target={target}
        color="#e0c089"
        intensity={330}
        angle={0.5}
        penumbra={0.7}
        distance={30}
        decay={2}
      />
      <primitive object={target} />
    </>
  );
}

/**
 * Battant de bronze monumental : bâti épais, trois caissons moulurés à
 * bossette, rangées de clous sur les montants, heurtoir à mufle de lion,
 * pentures horizontales. `side` = +1 (battant gauche) ou -1 (battant
 * droit), coordonnées dans le repère du gond.
 */
function DoorLeaf({ side, bronze }: { side: 1 | -1; bronze: SurfaceMaps }) {
  const cx = side * (LEAF_WIDTH / 2);
  const innerX = cx + side * (LEAF_WIDTH / 2 - 0.18);
  const studYs = [-2.7, -1.8, -0.9, 0, 0.9, 1.8, 2.7];

  return (
    <>
      {/* Vantail massif */}
      <mesh position={[cx, 0, 0]} castShadow>
        <boxGeometry args={[LEAF_WIDTH, LEAF_HEIGHT, 0.22]} />
        <meshStandardMaterial {...bronze} bumpScale={0.8} metalness={0.75} />
      </mesh>
      {/* Trois caissons : cadre saillant, fond recreusé, bossette */}
      {[2.25, 0, -2.25].map((py) => (
        <group key={py} position={[cx, py, 0]}>
          <mesh position={[0, 0, 0.09]} castShadow>
            <boxGeometry args={[1.5, 1.86, 0.07]} />
            <meshStandardMaterial color="#7a5829" metalness={0.8} roughness={0.34} />
          </mesh>
          <mesh position={[0, 0, 0.12]}>
            <boxGeometry args={[1.16, 1.5, 0.05]} />
            <meshStandardMaterial {...bronze} bumpScale={0.6} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.17]}>
            <sphereGeometry args={[0.13, 12, 8]} />
            <meshStandardMaterial color="#9a7338" metalness={0.88} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Pentures horizontales */}
      {[2.95, -2.95].map((py) => (
        <mesh key={py} position={[cx, py, 0.12]} castShadow>
          <boxGeometry args={[LEAF_WIDTH - 0.08, 0.18, 0.05]} />
          <meshStandardMaterial color="#6e5026" metalness={0.85} roughness={0.36} />
        </mesh>
      ))}
      {/* Clous de bronze le long des montants */}
      {studYs.map((py) => (
        <group key={py}>
          <mesh position={[cx - side * (LEAF_WIDTH / 2 - 0.16), py, 0.13]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color="#9a7338" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[cx + side * (LEAF_WIDTH / 2 - 0.16), py, 0.13]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color="#9a7338" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Astragale couvrant la jonction des vantaux */}
      <mesh position={[innerX, 0, 0.1]} castShadow>
        <boxGeometry args={[0.14, LEAF_HEIGHT - 0.1, 0.12]} />
        <meshStandardMaterial color="#7a5829" metalness={0.82} roughness={0.32} />
      </mesh>
      {/* Heurtoir : mufle de lion et anneau */}
      <group position={[innerX - side * 0.34, 0.55, 0.16]}>
        <mesh>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial color="#8a6530" metalness={0.85} roughness={0.32} />
        </mesh>
        <mesh position={[0, -0.16, 0.05]} rotation={[0.25, 0, 0]}>
          <torusGeometry args={[0.15, 0.035, 10, 22]} />
          <meshStandardMaterial color="#9a7338" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>
    </>
  );
}

/**
 * Façade monumentale du temple, de nuit : huit colonnes cannelées sur
 * podium à grand escalier encadré de murs d'échiffre, entablement
 * denticulé, fronton sculpté (Hercule reçu dans l'Olympe), grande baie
 * aux portes de bronze grandes ouvertes sur un vestibule baigné de
 * lumière, torchères, galaxie de particules, cyprès et vestiges sur la
 * terre sableuse de l'esplanade.
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
  const interiorLight = useRef<THREE.PointLight>(null);
  const interiorGlow = useRef<THREE.MeshBasicMaterial>(null);

  const marble = useMemo(() => marbleSurface(), []);
  const marbleWall = useMemo(() => setRepeat(travertineSurface(), 4, 2.4), []);
  const ashlar = usePbrSurface(WALL_FILES, 1, 1);
  // Répétitions accordées par pan de mur : blocs de taille constante
  const cellaSide = useMemo(() => setRepeat(cloneSurface(ashlar), 1.35, 1.75), [ashlar]);
  const cellaTop = useMemo(() => setRepeat(cloneSurface(ashlar), 0.74, 0.6), [ashlar]);
  const antaeWall = useMemo(() => setRepeat(cloneSurface(ashlar), 1.05, 1.75), [ashlar]);
  const bronze = useMemo(() => bronzeSurface(), []);
  const sand = usePbrSurface(GROUND_FILES, 32, 32);
  const stairs = usePbrSurface(STAIR_FILES, 8, 2);
  const flutes = useMemo(() => {
    const t = fluteTexture();
    t.repeat.set(4, 1);
    return t;
  }, []);
  const flame = useMemo(() => flameTexture(), []);
  const inscription = useMemo(() => inscriptionTexture("HERKVL·MVSEVM"), []);
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

      // Glissé fluide depuis la position de départ jusque DANS le vestibule :
      // les portes sont grandes ouvertes, on franchit réellement le seuil
      // entre les deux vantaux, sans rien traverser.
      const eyeY = PODIUM_HEIGHT + 1.9;
      const targetZ = -PORCH_DEPTH - 1.7;
      camera.position.x = THREE.MathUtils.lerp(camStart.current.x, 0, e);
      camera.position.y = THREE.MathUtils.lerp(camStart.current.y, eyeY, e);
      camera.position.z = THREE.MathUtils.lerp(camStart.current.z, targetZ, e);
      // Le regard descend en douceur du fronton vers le cœur lumineux.
      lookCurrent.current.set(
        THREE.MathUtils.lerp(lookStart.current.x, 0, e),
        THREE.MathUtils.lerp(lookStart.current.y, PODIUM_HEIGHT + 2.6, e),
        THREE.MathUtils.lerp(lookStart.current.z, -16, e)
      );
      camera.lookAt(lookCurrent.current);

      // La lumière du sanctuaire enfle sur la fin de l'approche : le blanc
      // nous gagne une fois le seuil franchi.
      const glow = THREE.MathUtils.clamp((e - 0.45) / 0.5, 0, 1);
      if (interiorLight.current) interiorLight.current.intensity = 30 + glow * 190;
      if (interiorGlow.current)
        interiorGlow.current.opacity = 0.32 + glow * 0.68;
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

      if (interiorLight.current) interiorLight.current.intensity = 30;
      // Lueur chaude permanente : les portes restent grandes ouvertes.
      if (interiorGlow.current)
        interiorGlow.current.opacity = THREE.MathUtils.damp(interiorGlow.current.opacity, 0.32, 3, delta);
    }
  });

  const columnXs = useMemo(() => {
    const span = TEMPLE_WIDTH - 3;
    return Array.from({ length: COLUMN_COUNT }, (_, i) => -span / 2 + (span / (COLUMN_COUNT - 1)) * i);
  }, []);

  const doorSillY = PODIUM_HEIGHT;
  const stairWidth = TEMPLE_WIDTH + 1;

  return (
    <>
      <color attach="background" args={["#05060d"]} />
      <fog attach="fog" args={["#0c0b16", 32, 115]} />
      <SkyDome />

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
      <Stars highQuality={highQuality} />

      {/* Terre sableuse de l'esplanade */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 8]} receiveShadow>
        <planeGeometry args={[170, 170]} />
        <meshStandardMaterial {...sand} bumpScale={1.3} />
      </mesh>
      <ScatterStones />

      {/* Grand escalier : marches à nez mouluré… */}
      {Array.from({ length: 7 }, (_, i) => {
        const depth = 9.4 + i * 1.24 - i * 2.48;
        return (
          <group key={i} position={[0, 0.14 + 0.28 * i, 5.4 - i * 0.62]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[stairWidth, 0.28, depth]} />
              <meshStandardMaterial {...stairs} bumpScale={0.5} />
            </mesh>
            {/* Nez de marche saillant qui accroche la lumière */}
            <mesh position={[0, 0.125, depth / 2 - 0.04]} castShadow>
              <boxGeometry args={[stairWidth, 0.07, 0.14]} />
              <meshStandardMaterial {...marble} bumpScale={0.4} color="#e6dfcc" />
            </mesh>
          </group>
        );
      })}
      {/* …encadré de murs d'échiffre massifs portant les torchères */}
      {[-1, 1].map((side) => {
        const x = side * (stairWidth / 2 + 0.85);
        return (
          <group key={side} position={[x, 0, 1.6]}>
            {/* Corps du mur */}
            <mesh position={[0, (PODIUM_HEIGHT + 0.26) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.7, PODIUM_HEIGHT + 0.26, 9.6]} />
              <meshStandardMaterial {...antaeWall} bumpScale={0.8} />
            </mesh>
            {/* Plinthe et couronnement mouluré */}
            <mesh position={[0, 0.14, 0]} receiveShadow>
              <boxGeometry args={[1.94, 0.28, 9.9]} />
              <meshStandardMaterial {...marble} bumpScale={0.5} />
            </mesh>
            <mesh position={[0, PODIUM_HEIGHT + 0.34, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.96, 0.2, 9.92]} />
              <meshStandardMaterial {...marble} bumpScale={0.5} />
            </mesh>
          </group>
        );
      })}

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

      {/* ——— Mur de cella en grand appareil, percé de la baie ——— */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            side * (BAY_WIDTH / 2 + (CELLA_WALL_WIDTH - BAY_WIDTH) / 4),
            PODIUM_HEIGHT + CELLA_WALL_HEIGHT / 2,
            CELLA_Z,
          ]}
          receiveShadow
        >
          <boxGeometry args={[(CELLA_WALL_WIDTH - BAY_WIDTH) / 2, CELLA_WALL_HEIGHT, 0.9]} />
          <meshStandardMaterial {...cellaSide} bumpScale={0.8} />
        </mesh>
      ))}
      <mesh
        position={[0, PODIUM_HEIGHT + BAY_HEIGHT + (CELLA_WALL_HEIGHT - BAY_HEIGHT) / 2, CELLA_Z]}
        receiveShadow
      >
        <boxGeometry args={[BAY_WIDTH, CELLA_WALL_HEIGHT - BAY_HEIGHT, 0.9]} />
        <meshStandardMaterial {...cellaTop} bumpScale={0.8} />
      </mesh>
      {/* Orthostates (soubassement en grands blocs) et bandeau sommital */}
      <mesh position={[0, PODIUM_HEIGHT + 0.85, CELLA_Z + 0.51]} receiveShadow>
        <boxGeometry args={[CELLA_WALL_WIDTH, 1.7, 0.12]} />
        <meshStandardMaterial {...marbleWall} bumpScale={0.7} />
      </mesh>
      <mesh position={[0, PODIUM_HEIGHT + CELLA_WALL_HEIGHT - 0.3, CELLA_Z + 0.52]} castShadow receiveShadow>
        <boxGeometry args={[CELLA_WALL_WIDTH, 0.5, 0.16]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      {/* Pilastres répondant aux colonnes */}
      {columnXs
        .filter((x) => Math.abs(x) > 3.4)
        .map((x) => (
          <group key={`pilaster-${x}`} position={[x, 0, CELLA_Z + 0.55]}>
            <mesh position={[0, PODIUM_HEIGHT + 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.72, 0.6, 0.22]} />
              <meshStandardMaterial {...marble} bumpScale={0.5} />
            </mesh>
            <mesh position={[0, PODIUM_HEIGHT + 5.9, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.56, 7.2, 0.18]} />
              <meshStandardMaterial {...marble} bumpScale={0.5} />
            </mesh>
            <mesh position={[0, PODIUM_HEIGHT + 9.7, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.74, 0.4, 0.24]} />
              <meshStandardMaterial {...marble} bumpScale={0.5} />
            </mesh>
          </group>
        ))}
      {/* Plaques dédicatoires encastrées de part et d'autre de la porte */}
      {[-1, 1].map((side) => (
        <group key={`plaque-${side}`} position={[side * 4.7, PODIUM_HEIGHT + 3.6, CELLA_Z + 0.5]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.7, 2.3, 0.1]} />
            <meshStandardMaterial {...marble} bumpScale={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[1.36, 1.96]} />
            <meshStandardMaterial color="#39301f" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Antes (murs latéraux du pronaos) */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (TEMPLE_WIDTH / 2 - 0.9), PODIUM_HEIGHT + CELLA_WALL_HEIGHT / 2, -PORCH_DEPTH / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.8, CELLA_WALL_HEIGHT, PORCH_DEPTH + 1.2]} />
          <meshStandardMaterial {...antaeWall} bumpScale={0.8} />
        </mesh>
      ))}

      {/* ——— Encadrement monumental de la baie ——— */}
      {/* Jambages moulurés (deux fasces) */}
      {[-1, 1].map((side) => (
        <group key={`jamb-${side}`}>
          <mesh position={[side * (BAY_WIDTH / 2 + 0.3), doorSillY + 3.55, CELLA_Z + 0.5]} castShadow receiveShadow>
            <boxGeometry args={[0.6, 7.3, 0.34]} />
            <meshStandardMaterial {...marble} bumpScale={0.5} />
          </mesh>
          <mesh position={[side * (BAY_WIDTH / 2 + 0.08), doorSillY + 3.5, CELLA_Z + 0.58]} castShadow receiveShadow>
            <boxGeometry args={[0.26, 7.2, 0.22]} />
            <meshStandardMaterial {...marble} bumpScale={0.5} color="#e2dbc8" />
          </mesh>
        </group>
      ))}
      {/* Linteau, crossettes et corniche sur consoles */}
      <mesh position={[0, doorSillY + 7.2, CELLA_Z + 0.5]} castShadow receiveShadow>
        <boxGeometry args={[BAY_WIDTH + 1.6, 0.6, 0.36]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`crossette-${side}`} position={[side * (BAY_WIDTH / 2 + 0.45), doorSillY + 7.2, CELLA_Z + 0.56]} castShadow>
          <boxGeometry args={[0.9, 0.6, 0.3]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} color="#e2dbc8" />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`console-${side}`} position={[side * (BAY_WIDTH / 2 + 0.2), doorSillY + 7.66, CELLA_Z + 0.62]} castShadow>
          <boxGeometry args={[0.34, 0.44, 0.5]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
      ))}
      <mesh position={[0, doorSillY + 7.98, CELLA_Z + 0.55]} castShadow receiveShadow>
        <boxGeometry args={[BAY_WIDTH + 2.3, 0.32, 0.75]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      {/* Seuil de marbre usé, affleurant le sol du porche (pas de ressaut) */}
      <mesh position={[0, doorSillY - 0.05, CELLA_Z + 0.3]} receiveShadow>
        <boxGeometry args={[BAY_WIDTH + 0.6, 0.12, 1.4]} />
        <meshStandardMaterial {...marble} bumpScale={0.4} color="#cfc6b0" />
      </mesh>

      {/* ——— Vestibule derrière la baie ——— */}
      <group position={[0, doorSillY, CELLA_Z - VESTIBULE_DEPTH / 2 - 0.45]}>
        {/* Sol */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
          <planeGeometry args={[5.4, VESTIBULE_DEPTH + 1]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} color="#c9bfa6" />
        </mesh>
        {/* Murs latéraux et plafond, dans la pénombre chaude */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 2.75, 3.6, 0]}>
            <boxGeometry args={[0.3, 7.3, VESTIBULE_DEPTH + 1]} />
            <meshStandardMaterial color="#241a10" roughness={0.92} />
          </mesh>
        ))}
        <mesh position={[0, 7.25, 0]}>
          <boxGeometry args={[5.8, 0.3, VESTIBULE_DEPTH + 1]} />
          <meshStandardMaterial color="#1c1409" roughness={0.94} />
        </mesh>
        {/* Fond opaque… */}
        <mesh position={[0, 3.6, -VESTIBULE_DEPTH / 2 - 0.4]}>
          <boxGeometry args={[5.8, 7.4, 0.3]} />
          <meshStandardMaterial color="#150e07" roughness={0.95} />
        </mesh>
        {/* …et cœur lumineux du sanctuaire, qui embrase tout à l'entrée */}
        <mesh position={[0, 3.45, -VESTIBULE_DEPTH / 2 - 0.22]}>
          <planeGeometry args={[5.2, 6.7]} />
          <meshBasicMaterial
            ref={interiorGlow}
            color="#fff3da"
            transparent
            opacity={0.32}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Portes de bronze grandes ouvertes, rabattues vers l'intérieur */}
      <group
        position={[-BAY_WIDTH / 2, doorSillY + LEAF_HEIGHT / 2 + 0.12, CELLA_Z + 0.1]}
        rotation={[0, DOOR_OPEN_ANGLE, 0]}
      >
        <DoorLeaf side={1} bronze={bronze} />
      </group>
      <group
        position={[BAY_WIDTH / 2, doorSillY + LEAF_HEIGHT / 2 + 0.12, CELLA_Z + 0.1]}
        rotation={[0, -DOOR_OPEN_ANGLE, 0]}
      >
        <DoorLeaf side={-1} bronze={bronze} />
      </group>
      {/* Halo chaud débordant de la baie ouverte */}
      <sprite scale={[5.4, 8.2, 1]} position={[0, doorSillY + 3.2, CELLA_Z + 1]}>
        <spriteMaterial map={doorGlow} transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <pointLight
        ref={interiorLight}
        position={[0, doorSillY + 3, CELLA_Z - 1.6]}
        color="#ffce8a"
        intensity={30}
        distance={20}
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

      {/* Inscription gravée dans la frise — dans la scène WebGL : elle vit
          et meurt avec le temple, plus d'apparition fantôme dans le blanc */}
      <mesh position={[0, ENTAB_Y + 0.93, 1.28]}>
        <planeGeometry args={[9.8, 1.225]} />
        <meshBasicMaterial map={inscription} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      <Pediment marble={marble} />
      <PedimentLight />

      {/* Éclairage rasant de la colonnade */}
      <Uplight x={-7.4} />
      <Uplight x={7.4} />

      {/* Torchères : sur les murs d'échiffre, et le long de l'allée */}
      <Torch
        x={-(stairWidth / 2 + 0.85)}
        y={PODIUM_HEIGHT + 0.44}
        z={5.6}
        scale={0.92}
        flame={flame}
        stone={marbleWall}
      />
      <Torch
        x={stairWidth / 2 + 0.85}
        y={PODIUM_HEIGHT + 0.44}
        z={5.6}
        scale={0.92}
        flame={flame}
        stone={marbleWall}
      />
      <Torch x={-6.2} z={17.5} scale={0.85} flame={flame} stone={marbleWall} />
      <Torch x={6.2} z={17.5} scale={0.85} flame={flame} stone={marbleWall} />

      {/* Bosquets de cyprès */}
      {CYPRESSES.map(([x, z, height]) => (
        <Cypress key={`${x}-${z}`} x={x} z={z} height={height} />
      ))}

      {/* Vestiges épars */}
      <Ruins blob={blob} />

      {/* Ombres de contact au sol */}
      {columnXs.map((x) => (
        <Blob key={`blob-${x}`} x={x} z={0} y={PODIUM_HEIGHT + 0.01} radius={1.15} opacity={0.42} texture={blob} />
      ))}
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
