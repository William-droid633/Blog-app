"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Instances, Instance, MeshReflectorMaterial, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import type { Post } from "@/lib/types";
import Painting, { ART_Y, ART_WIDTH, ART_HEIGHT, type PaintingPlacement } from "./Painting";
import {
  travertineSurface,
  ashlarSurface,
  floorSurface,
  marbleSurface,
  fluteTexture,
  flameTexture,
  lightBeamTexture,
  softParticleTexture,
  inscriptionTexture,
  mosaicTexture,
  cofferTexture,
  frescoPanelTexture,
  starPositions,
  setRepeat,
  cloneSurface,
  type SurfaceMaps,
} from "./textures";

/* — Géométrie du couloir — */
export const HALL_WIDTH = 8;
export const HALL_HEIGHT = 6;
export const EYE_HEIGHT = 1.7;
/* On apparaît dans le vestibule décoré, tout près des premières œuvres. */
export const START_Z = 3;
const FIRST_ART_Z = -4.5;
const ART_STEP = 4.5;
const WALL_X = HALL_WIDTH / 2;
/* Seuil entre le vestibule d'entrée et la galerie proprement dite. */
const PORTAL_Z = FIRST_ART_Z + ART_STEP / 2;
/** Léger décollement du mur : l'œuvre est inclinée vers le visiteur. */
const ART_OFFSET = 0.42;
/** Angle d'orientation de la toile vers l'allée centrale (≈ 11°). */
const ART_TILT = 0.2;

/** Bornes de déplacement de la caméra selon le nombre d'œuvres. */
export function corridorBounds(count: number): { start: number; end: number } {
  const lastZ = FIRST_ART_Z - Math.max(count - 1, 0) * ART_STEP;
  return { start: START_Z, end: lastZ - 5 };
}

/**
 * Position de chaque œuvre : alternance mur gauche / mur droit. Le numéro
 * d'exposition est chronologique (la plus ancienne est la I) ; comme les
 * articles arrivent du plus récent au plus ancien, on inverse l'index.
 * Chaque toile est légèrement décollée du mur et pivotée pour que son bord
 * amont ressorte et tourne la peinture vers le visiteur qui s'avance.
 */
export function placePaintings(posts: Post[]): PaintingPlacement[] {
  const total = posts.length;
  return posts.map((post, index) => {
    const left = index % 2 === 0;
    return {
      post,
      index,
      number: total - index,
      position: new THREE.Vector3(
        left ? -WALL_X + ART_OFFSET : WALL_X - ART_OFFSET,
        ART_Y,
        FIRST_ART_Z - index * ART_STEP
      ),
      // Le visiteur progresse vers les z décroissants : on oriente la face
      // vers +z (vers lui) en réduisant l'angle plaqué au mur.
      rotationY: left ? Math.PI / 2 - ART_TILT : -Math.PI / 2 + ART_TILT,
      normal: new THREE.Vector3(left ? 1 : -1, 0, 0),
    };
  });
}

export interface FocusState {
  index: number;
  diving: boolean;
}

/** Pilotage de la caméra : marche, contemplation, traversée de l'œuvre. */
function CameraRig({
  travelZ,
  focus,
  placements,
}: {
  travelZ: React.MutableRefObject<number>;
  focus: FocusState | null;
  placements: PaintingPlacement[];
}) {
  const smoothedLook = useRef(new THREE.Vector3(0, EYE_HEIGHT, START_Z - 10));
  const targetPos = useRef(new THREE.Vector3(0, EYE_HEIGHT, START_Z));
  const targetLook = useRef(new THREE.Vector3(0, EYE_HEIGHT, START_Z - 10));

  useFrame((state, delta) => {
    const camera = state.camera;
    const focused = focus !== null ? placements[focus.index] : null;

    if (focused) {
      const anchor = focused.position;
      const n = focused.normal;
      if (focus?.diving) {
        targetPos.current.set(anchor.x - n.x * 0.5, anchor.y, anchor.z);
        targetLook.current.set(anchor.x - n.x * 3, anchor.y, anchor.z);
      } else {
        // Distance adaptée au champ de vision : le cadre ET le cartel
        // doivent tenir entièrement dans l'écran (mobile compris)
        const cam = camera as THREE.PerspectiveCamera;
        const halfV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
        const halfH = halfV * cam.aspect;
        const fitWidth = (ART_WIDTH + 1) / 2 / halfH;
        const fitHeight = (ART_HEIGHT + 2.6) / 2 / halfV;
        const distance = THREE.MathUtils.clamp(Math.max(fitWidth, fitHeight) * 1.08, 2.4, 6.8);
        targetPos.current.set(anchor.x + n.x * distance, anchor.y - 0.25, anchor.z);
        targetLook.current.set(anchor.x, anchor.y - 0.5, anchor.z);
      }
    } else {
      targetPos.current.set(0, EYE_HEIGHT, travelZ.current);
      targetLook.current.set(0, EYE_HEIGHT, travelZ.current - 10);
    }

    const posLambda = focus?.diving ? 3.2 : 2.4;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.current.x, posLambda, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.current.y, posLambda, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.current.z, posLambda, delta);

    smoothedLook.current.x = THREE.MathUtils.damp(smoothedLook.current.x, targetLook.current.x, 3, delta);
    smoothedLook.current.y = THREE.MathUtils.damp(smoothedLook.current.y, targetLook.current.y, 3, delta);
    smoothedLook.current.z = THREE.MathUtils.damp(smoothedLook.current.z, targetLook.current.z, 3, delta);
    camera.lookAt(smoothedLook.current);
  });

  return null;
}

/**
 * Lueur d'entrée : à l'apparition du couloir (juste après avoir franchi
 * les portes dans la lumière), un éclat chaud emplit le seuil puis décroît
 * en ~1,3 s. On émerge ainsi du blanc dans un hall lumineux qui se pose en
 * douceur — la transition reste fluide, sans aplat délavé sur le noir.
 */
function EntranceFlare() {
  const light = useRef<THREE.PointLight>(null);
  const start = useRef<number | null>(null);

  useFrame(({ clock, camera }) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const k = Math.max(0, 1 - (clock.elapsedTime - start.current) / 1.1);
    if (light.current) {
      light.current.position.set(0, EYE_HEIGHT + 0.6, camera.position.z - 1.8);
      light.current.intensity = k * k * 140;
    }
  });

  return <pointLight ref={light} color="#fff1d8" intensity={140} distance={26} decay={2} />;
}

/** Lumières chaudes qui accompagnent le visiteur. */
function FollowLights() {
  const ahead = useRef<THREE.PointLight>(null);
  const behind = useRef<THREE.PointLight>(null);

  useFrame(({ camera, clock }) => {
    const flicker = 1 + Math.sin(clock.elapsedTime * 7.3) * 0.05;
    if (ahead.current) {
      ahead.current.position.set(0, 4.4, camera.position.z - 7);
      ahead.current.intensity = 32 * flicker;
    }
    if (behind.current) {
      behind.current.position.set(0, 4.2, camera.position.z + 4);
      behind.current.intensity = 16;
    }
  });

  return (
    <>
      <pointLight ref={ahead} color="#e8cd9c" intensity={32} distance={24} decay={2} />
      <pointLight ref={behind} color="#d9b87a" intensity={16} distance={16} decay={2} />
    </>
  );
}

/** Projecteur d'ombres qui suit le visiteur (haute qualité uniquement). */
function ShadowSpot() {
  const lightRef = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ camera }) => {
    if (lightRef.current) {
      lightRef.current.position.set(1.4, HALL_HEIGHT - 0.3, camera.position.z + 2);
    }
    target.position.set(-0.5, 0, camera.position.z - 8);
    target.updateMatrixWorld();
  });

  return (
    <>
      <spotLight
        ref={lightRef}
        target={target}
        castShadow
        angle={0.9}
        penumbra={0.75}
        intensity={42}
        distance={36}
        decay={2}
        color="#e8cd9c"
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <primitive object={target} />
    </>
  );
}

/**
 * Poussière en suspension dans les rais de lumière : particules rondes à
 * halo (texture douce) et tailles variées, en lente dérive — bien plus
 * crédibles que les anciens points carrés.
 */
function DustMotes({ topZ, bottomZ, count }: { topZ: number; bottomZ: number; count: number }) {
  const points = useRef<THREE.Points>(null);
  const sprite = useMemo(() => softParticleTexture(), []);
  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * (HALL_WIDTH - 1);
      positions[i * 3 + 1] = 0.4 + Math.random() * (HALL_HEIGHT - 1);
      positions[i * 3 + 2] = bottomZ + Math.random() * (topZ - bottomZ);
      sizes[i] = 0.03 + Math.pow(Math.random(), 2) * 0.09;
    }
    return { positions, sizes };
  }, [count, topZ, bottomZ]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = clock.elapsedTime;
    points.current.position.y = Math.sin(t * 0.18) * 0.25;
    points.current.position.x = Math.sin(t * 0.11) * 0.15;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        map={sprite}
        color="#f0dcb0"
        transparent
        opacity={0.5}
        alphaTest={0.01}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Amphore en terre cuite ou bronze, sur profil tourné. */
function Amphora({ bronzeTone }: { bronzeTone: boolean }) {
  const geometry = useMemo(() => {
    const profile = [
      [0.001, 0], [0.16, 0], [0.2, 0.04], [0.13, 0.09], [0.14, 0.16],
      [0.3, 0.3], [0.37, 0.52], [0.33, 0.74], [0.22, 0.92], [0.15, 1.02],
      [0.14, 1.14], [0.21, 1.2], [0.24, 1.24],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(profile, 26);
  }, []);

  return (
    <mesh geometry={geometry} castShadow>
      {bronzeTone ? (
        <meshStandardMaterial color="#6d4f24" metalness={0.8} roughness={0.38} />
      ) : (
        <meshStandardMaterial color="#8a4a2e" roughness={0.72} />
      )}
    </mesh>
  );
}

/** Niche en plein cintre abritant une amphore, face à chaque œuvre. */
function Niche({
  z,
  side,
  marble,
  glow,
  bronzeTone,
}: {
  z: number;
  side: number;
  marble: SurfaceMaps;
  glow: THREE.Texture;
  bronzeTone: boolean;
}) {
  const rotationY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  return (
    <group position={[side * (WALL_X - 0.1), 0, z]} rotation={[0, rotationY, 0]}>
      {/* Renfoncement sombre */}
      <mesh position={[0, 1.78, -0.06]}>
        <planeGeometry args={[1.5, 2.4]} />
        <meshStandardMaterial color="#0e0b08" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.98, -0.06]}>
        <circleGeometry args={[0.75, 22, 0, Math.PI]} />
        <meshStandardMaterial color="#0e0b08" roughness={0.95} />
      </mesh>
      {/* Encadrement de marbre et arc */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.82, 1.78, 0.02]} castShadow>
          <boxGeometry args={[0.16, 2.44, 0.14]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.52, 0.02]} castShadow>
        <boxGeometry args={[1.8, 0.14, 0.14]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <mesh position={[0, 2.98, 0.02]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.82, 0.08, 10, 22, Math.PI]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      {/* Socle et amphore */}
      <mesh position={[0, 0.95, 0.1]} castShadow>
        <boxGeometry args={[0.74, 0.74, 0.6]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <group position={[0, 1.32, 0.1]} scale={1.05}>
        <Amphora bronzeTone={bronzeTone} />
      </group>
      {/* Lueur chaude diffuse au fond de la niche (halo rond, sans rectangle) */}
      <sprite position={[0, 1.55, -0.04]} scale={[1.5, 2.3, 1]}>
        <spriteMaterial map={glow} color="#e0b878" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <pointLight position={[0, 1.5, 0.5]} color="#ffb86a" intensity={3.2} distance={3.4} decay={2} />
    </group>
  );
}

/** Banc de marbre adossé au mur. */
function Bench({ z, side, marble }: { z: number; side: number; marble: SurfaceMaps }) {
  return (
    <group position={[side * (WALL_X - 1.05), 0, z]}>
      <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.12, 1.9]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      {[-0.7, 0.7].map((dz) => (
        <mesh key={dz} position={[0, 0.23, dz]} castShadow>
          <boxGeometry args={[0.5, 0.46, 0.22]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Puits de lumière lunaire traversant le plafond. */
function Skylight({ z, beam }: { z: number; beam: THREE.Texture }) {
  return (
    <group position={[0, 0, z]}>
      {/* Ouverture sur le ciel nocturne */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL_HEIGHT - 0.05, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshBasicMaterial color="#1b2438" />
      </mesh>
      {/* Rais de lune croisés */}
      {[0, Math.PI / 2].map((rotation) => (
        <mesh key={rotation} position={[0, HALL_HEIGHT / 2, 0]} rotation={[0, rotation, 0]}>
          <planeGeometry args={[2.3, HALL_HEIGHT]} />
          <meshBasicMaterial
            map={beam}
            color="#9fb6e8"
            transparent
            opacity={0.16}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Tache de lune au sol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.3, 24]} />
        <meshBasicMaterial color="#33405e" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Demi-colonne engagée : plinthe, base en tore, fût cannelé, échine et
 * abaque — scande les murs de la galerie en répondant aux œuvres.
 */
function EngagedColumn({
  z,
  side,
  marble,
  flutes,
  scale = 1,
}: {
  z: number;
  side: number;
  marble: SurfaceMaps;
  flutes: THREE.Texture;
  scale?: number;
}) {
  return (
    <group position={[side * (WALL_X + 0.08), 0, z]} scale={[scale, 1, scale]}>
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.28, 0.8]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <mesh position={[0, 0.37, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.4, 0.18, 20]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      {/* Fût cannelé légèrement galbé */}
      <mesh position={[0, 2.51, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.3, 4.1, 22]} />
        <meshStandardMaterial
          map={marble.map}
          roughnessMap={marble.roughnessMap}
          bumpMap={flutes}
          bumpScale={1.2}
        />
      </mesh>
      <mesh position={[0, 4.64, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.27, 0.16, 20]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <mesh position={[0, 4.8, 0]} castShadow>
        <boxGeometry args={[0.74, 0.16, 0.74]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
    </group>
  );
}

/** Applique murale : coupelle de bronze et flamme vive (sans coût lumineux). */
function WallFlame({ z, side, flame }: { z: number; side: number; flame: THREE.Texture }) {
  const flameRef = useRef<THREE.Mesh>(null);
  const halo = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 170, 70, 0.8)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const flamePlane = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.3, 0.56);
    g.translate(0, 0.28, 0);
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = 0.85 + Math.sin(t * 8.3 + z) * 0.1 + Math.sin(t * 19 + z * 2) * 0.05;
    if (flameRef.current) flameRef.current.scale.set(0.95, f, 1);
  });

  const rotationY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  return (
    <group position={[side * (WALL_X - 0.3), 3.9, z]} rotation={[0, rotationY, 0]}>
      {/* Potence et coupelle */}
      <mesh position={[0, -0.12, -0.12]} rotation={[0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.36, 8]} />
        <meshStandardMaterial color="#4a3a22" metalness={0.82} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.05, 0.12, 12]} />
        <meshStandardMaterial color="#54421f" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* Braise et flamme */}
      <mesh position={[0, 0.06, 0]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#2b1206" emissive="#ff5a1a" emissiveIntensity={2} roughness={0.9} toneMapped={false} />
      </mesh>
      <mesh ref={flameRef} geometry={flamePlane} position={[0, 0.08, 0]}>
        <meshBasicMaterial
          map={flame}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <sprite scale={[0.9, 0.9, 1]} position={[0, 0.2, 0]}>
        <spriteMaterial map={halo} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/** Panneau de fresque encadré du vestibule d'entrée. */
function FrescoPanel({
  z,
  side,
  texture,
  marble,
}: {
  z: number;
  side: number;
  texture: THREE.Texture;
  marble: SurfaceMaps;
}) {
  const rotationY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  return (
    <group position={[side * (WALL_X - 0.08), 2.55, z]} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[2.7, 3.1, 0.08]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[2.42, 2.82]} />
        <meshStandardMaterial map={texture} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** Colonne libre (focal de l'abside) : base, fût cannelé galbé, chapiteau. */
function FreeColumn({
  position,
  height,
  marble,
  flutes,
}: {
  position: [number, number, number];
  height: number;
  marble: SurfaceMaps;
  flutes: THREE.Texture;
}) {
  const shaft = height - 0.7;
  return (
    <group position={position}>
      <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.78, 0.26, 0.78]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.36, 0.18, 22]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <mesh position={[0, 0.45 + shaft / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.3, shaft, 24]} />
        <meshStandardMaterial map={marble.map} roughnessMap={marble.roughnessMap} bumpMap={flutes} bumpScale={1.2} />
      </mesh>
      <mesh position={[0, height - 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.24, 0.16, 22]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <mesh position={[0, height - 0.08, 0]} castShadow>
        <boxGeometry args={[0.72, 0.18, 0.72]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Trépied de bronze (focal de l'abside MEMORIA) : trois pieds galbés à
 * griffes réunis sous une vasque, feu sacré animé en langues croisées,
 * braises et halo. Le foyer perpétuel de la mémoire.
 */
function Tripod({ flame }: { flame: THREE.Texture }) {
  const flameA = useRef<THREE.Mesh>(null);
  const flameB = useRef<THREE.Mesh>(null);
  const ember = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);

  const bowl = useMemo(() => {
    const profile: Array<[number, number]> = [
      [0.12, 0], [0.2, 0.04], [0.34, 0.12], [0.5, 0.24], [0.62, 0.36],
      [0.64, 0.46], [0.58, 0.5], [0.5, 0.46],
    ];
    return new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 28);
  }, []);
  const flamePlane = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.95, 1.7);
    g.translate(0, 0.85, 0);
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = 0.84 + Math.sin(t * 8.2) * 0.1 + Math.sin(t * 18.5) * 0.06;
    if (flameA.current) flameA.current.scale.set(0.96, 0.72 + f * 0.5, 1);
    if (flameB.current) flameB.current.scale.set(0.88, 0.68 + f * 0.55, 1);
    if (ember.current) ember.current.emissiveIntensity = 1.8 + f * 1.8;
    if (light.current) light.current.intensity = 26 * f;
  });

  return (
    <group>
      {/* Trois pieds galbés réunis vers le centre */}
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh position={[0.46, 0.7, 0]} rotation={[0, 0, 0.16]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 1.5, 10]} />
            <meshStandardMaterial color="#54421f" metalness={0.82} roughness={0.4} />
          </mesh>
          {/* Griffe au sol */}
          <mesh position={[0.6, 0.06, 0]} castShadow>
            <sphereGeometry args={[0.11, 10, 8]} />
            <meshStandardMaterial color="#4a3a22" metalness={0.8} roughness={0.42} />
          </mesh>
          {/* Volute haute */}
          <mesh position={[0.4, 1.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.03, 8, 16]} />
            <meshStandardMaterial color="#8a6530" metalness={0.86} roughness={0.34} />
          </mesh>
        </group>
      ))}
      {/* Anneau de ceinture */}
      <mesh position={[0, 1.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.04, 10, 28]} />
        <meshStandardMaterial color="#8a6530" metalness={0.86} roughness={0.34} />
      </mesh>
      {/* Vasque */}
      <mesh geometry={bowl} position={[0, 1.42, 0]} castShadow>
        <meshStandardMaterial color="#5d4a24" metalness={0.82} roughness={0.38} />
      </mesh>
      {/* Braises */}
      <mesh position={[0, 1.86, 0]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[0.5, 16, 12]} />
        <meshStandardMaterial ref={ember} color="#2b1206" emissive="#ff5a1a" emissiveIntensity={2.4} roughness={0.9} toneMapped={false} />
      </mesh>
      {/* Feu sacré */}
      <mesh ref={flameA} geometry={flamePlane} position={[0, 1.9, 0]}>
        <meshBasicMaterial map={flame} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={flameB} geometry={flamePlane} position={[0, 1.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <meshBasicMaterial map={flame} transparent opacity={0.85} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 2.2, 0]} color="#ff9d45" intensity={26} distance={18} decay={2} />
    </group>
  );
}

/**
 * Le grand couloir d'exposition : dallage damier crème / vert antique
 * réfléchissant, tapis de mosaïque, murs en grand appareil scandés de
 * demi-colonnes, frise pompéienne, plafond à caissons peints (bleu nuit
 * étoilé d'or), vestibule d'entrée à fresques, appliques à flamme,
 * niches à amphores, bancs, abside MEMORIA.
 */
export default function CorridorScene({
  posts,
  travelZ,
  focus,
  onSelect,
  highQuality,
}: {
  posts: Post[];
  travelZ: React.MutableRefObject<number>;
  focus: FocusState | null;
  onSelect: (index: number) => void;
  highQuality: boolean;
}) {
  const { camera } = useThree();
  const placements = useMemo(() => placePaintings(posts), [posts]);
  const bounds = corridorBounds(posts.length);

  const topZ = START_Z + 3;
  const bottomZ = bounds.end - 6;
  const length = topZ - bottomZ;
  const centerZ = (topZ + bottomZ) / 2;

  const wall = useMemo(() => setRepeat(cloneSurface(ashlarSurface()), length / 6, 1), [length]);
  const entranceWall = useMemo(() => setRepeat(travertineSurface(), 2.2, 1.6), []);
  const floor = useMemo(() => setRepeat(floorSurface(), 2, length / 8), [length]);
  const marble = useMemo(() => marbleSurface(), []);
  const mosaic = useMemo(() => {
    const t = mosaicTexture();
    t.repeat.set(1, length / 2.6);
    return t;
  }, [length]);
  const coffer = useMemo(() => cofferTexture(), []);
  const fresco = useMemo(() => frescoPanelTexture(), []);
  const flutes = useMemo(() => {
    const t = fluteTexture();
    t.repeat.set(2, 1);
    return t;
  }, []);
  const flame = useMemo(() => flameTexture(), []);
  const beam = useMemo(() => lightBeamTexture(), []);
  const glow = useMemo(() => softParticleTexture(), []);
  const memoria = useMemo(() => inscriptionTexture("MEMORIA"), []);
  const skyStars = useMemo(() => starPositions(300, 60), []);
  const skyStarTex = useMemo(() => softParticleTexture(), []);

  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, travelZ.current);
    camera.lookAt(0, EYE_HEIGHT, travelZ.current - 10);
  }, [camera, travelZ]);

  const columnZs = useMemo(() => {
    const list: number[] = [];
    for (let z = PORTAL_Z - ART_STEP; z > bottomZ + 2; z -= ART_STEP) {
      list.push(z);
    }
    return list;
  }, [bottomZ]);

  const sconceZs = useMemo(() => columnZs.filter((_, i) => i % 2 === 0), [columnZs]);

  const cofferZs = useMemo(() => {
    const list: number[] = [];
    for (let z = topZ - 1.5; z > bottomZ; z -= 3) {
      list.push(z);
    }
    return list;
  }, [topZ, bottomZ]);

  /* Centres des caissons : un par travée entre deux poutres. */
  const bayZs = useMemo(() => cofferZs.slice(1).map((z) => z + 1.5), [cofferZs]);

  const skylightZs = useMemo(() => {
    const list: number[] = [];
    for (let z = FIRST_ART_Z - ART_STEP * 1.5; z > bottomZ + 4; z -= ART_STEP * 3) {
      list.push(z);
    }
    return list;
  }, [bottomZ]);

  const benchZs = useMemo(
    () => placements.filter((_, i) => i % 3 === 2).map((p) => p.position.z + ART_STEP / 2),
    [placements]
  );

  return (
    <>
      <color attach="background" args={["#0b0907"]} />
      <fog attach="fog" args={["#0b0907", 11, 46]} />

      {/* Réflexions d'environnement (procédural) */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.4} color="#e8cd9c" position={[0, 5.5, 0]} rotation-x={Math.PI / 2} scale={[6, 60, 1]} />
        <Lightformer intensity={0.6} color="#33405e" position={[0, 2, -20]} scale={[8, 4, 1]} />
        <Lightformer intensity={0.5} color="#d9b87a" position={[-5, 2, 0]} rotation-y={Math.PI / 2} scale={[40, 3, 1]} />
        <Lightformer intensity={0.5} color="#d9b87a" position={[5, 2, 0]} rotation-y={-Math.PI / 2} scale={[40, 3, 1]} />
      </Environment>

      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#e8cd9c", "#16110b", 0.3]} />
      <FollowLights />
      <EntranceFlare />
      {highQuality && <ShadowSpot />}

      <CameraRig travelZ={travelZ} focus={focus} placements={placements} />

      {/* Sol : dallage poli réfléchissant */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, centerZ]} receiveShadow>
        <planeGeometry args={[HALL_WIDTH, length]} />
        {highQuality ? (
          <MeshReflectorMaterial
            map={floor.map}
            roughnessMap={floor.roughnessMap}
            bumpMap={floor.bumpMap}
            bumpScale={0.4}
            resolution={640}
            blur={[260, 50]}
            mixBlur={0.8}
            mixStrength={0.8}
            mirror={0.5}
            roughness={0.9}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#9a917c"
          />
        ) : (
          <meshStandardMaterial {...floor} bumpScale={0.4} roughness={0.9} metalness={0.12} />
        )}
      </mesh>

      {/* Tapis de mosaïque au centre */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, centerZ]} receiveShadow>
        <planeGeometry args={[2.4, length]} />
        <meshStandardMaterial map={mosaic} roughness={0.62} />
      </mesh>

      {/* Murs en grand appareil */}
      <mesh position={[-WALL_X - 0.2, HALL_HEIGHT / 2, centerZ]} receiveShadow>
        <boxGeometry args={[0.4, HALL_HEIGHT, length]} />
        <meshStandardMaterial {...wall} bumpScale={0.9} />
      </mesh>
      <mesh position={[WALL_X + 0.2, HALL_HEIGHT / 2, centerZ]} receiveShadow>
        <boxGeometry args={[0.4, HALL_HEIGHT, length]} />
        <meshStandardMaterial {...wall} bumpScale={0.9} />
      </mesh>

      {/* Soubassement, cimaises dorées, frise pompéienne, corniche */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (WALL_X - 0.04), 0.5, centerZ]} receiveShadow>
            <boxGeometry args={[0.09, 1, length]} />
            <meshStandardMaterial {...marble} bumpScale={0.5} />
          </mesh>
          <mesh position={[side * (WALL_X - 0.07), 1.04, centerZ]}>
            <boxGeometry args={[0.12, 0.09, length]} />
            <meshStandardMaterial color="#8a6a3c" metalness={0.78} roughness={0.32} />
          </mesh>
          {/* Frise rouge de Pompéi entre deux filets dorés */}
          <mesh position={[side * (WALL_X - 0.05), 5.14, centerZ]}>
            <boxGeometry args={[0.07, 0.5, length]} />
            <meshStandardMaterial color="#71281f" roughness={0.8} />
          </mesh>
          <mesh position={[side * (WALL_X - 0.06), 4.86, centerZ]}>
            <boxGeometry args={[0.09, 0.06, length]} />
            <meshStandardMaterial color="#8a6a3c" metalness={0.78} roughness={0.32} />
          </mesh>
          <mesh position={[side * (WALL_X - 0.06), 5.42, centerZ]}>
            <boxGeometry args={[0.09, 0.06, length]} />
            <meshStandardMaterial color="#8a6a3c" metalness={0.78} roughness={0.32} />
          </mesh>
          <mesh position={[side * (WALL_X - 0.08), HALL_HEIGHT - 0.38, centerZ]} castShadow>
            <boxGeometry args={[0.16, 0.4, length]} />
            <meshStandardMaterial {...marble} bumpScale={0.5} />
          </mesh>
        </group>
      ))}

      {/* Demi-colonnes engagées scandant la galerie */}
      {columnZs.map((z) =>
        [-1, 1].map((side) => (
          <EngagedColumn key={`${z}-${side}`} z={z} side={side} marble={marble} flutes={flutes} />
        ))
      )}
      {/* Appliques à flamme sur une colonne sur deux */}
      {sconceZs.map((z) =>
        [-1, 1].map((side) => (
          <WallFlame key={`sconce-${z}-${side}`} z={z} side={side} flame={flame} />
        ))
      )}

      {/* ——— Vestibule d'entrée : fresques et portail d'honneur ——— */}
      <FrescoPanel z={4.1} side={-1} texture={fresco} marble={marble} />
      <FrescoPanel z={4.1} side={1} texture={fresco} marble={marble} />
      <FrescoPanel z={0.9} side={-1} texture={fresco} marble={marble} />
      <FrescoPanel z={0.9} side={1} texture={fresco} marble={marble} />
      {/* Portail marquant l'entrée de la galerie */}
      {[-1, 1].map((side) => (
        <EngagedColumn key={`portal-${side}`} z={PORTAL_Z} side={side} marble={marble} flutes={flutes} scale={1.35} />
      ))}
      <mesh position={[0, 5.18, PORTAL_Z]} castShadow receiveShadow>
        <boxGeometry args={[HALL_WIDTH + 0.2, 0.62, 1.15]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>
      <mesh position={[0, 4.83, PORTAL_Z]}>
        <boxGeometry args={[HALL_WIDTH + 0.1, 0.08, 1.2]} />
        <meshStandardMaterial color="#8a6a3c" metalness={0.78} roughness={0.32} />
      </mesh>

      {/* ——— Plafond à caissons peints ——— */}
      {/* Fond du comble au-dessus des caissons */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL_HEIGHT + 0.4, centerZ]}>
        <planeGeometry args={[HALL_WIDTH + 1, length]} />
        <meshStandardMaterial color="#14100b" roughness={0.95} />
      </mesh>
      {/* Panneaux peints en retrait : bleu nuit étoilé d'or */}
      <Instances limit={bayZs.length}>
        <planeGeometry args={[3.5, 2.42]} />
        <meshStandardMaterial map={coffer} roughness={0.85} />
        {bayZs.map((z) => (
          <Instance key={`cc-${z}`} position={[0, HALL_HEIGHT + 0.3, z]} rotation={[Math.PI / 2, 0, 0]} />
        ))}
      </Instances>
      <Instances limit={bayZs.length * 2}>
        <planeGeometry args={[1.7, 2.42]} />
        <meshStandardMaterial map={coffer} roughness={0.85} />
        {bayZs.map((z) =>
          [-3.05, 3.05].map((x) => (
            <Instance key={`cs-${z}-${x}`} position={[x, HALL_HEIGHT + 0.3, z]} rotation={[Math.PI / 2, 0, 0]} />
          ))
        )}
      </Instances>
      {/* Poutres transversales et longitudinales */}
      {cofferZs.map((z) => (
        <mesh key={z} position={[0, HALL_HEIGHT - 0.2, z]} castShadow>
          <boxGeometry args={[HALL_WIDTH + 0.6, 0.4, 0.52]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
      ))}
      {[-HALL_WIDTH / 4, HALL_WIDTH / 4].map((x) => (
        <group key={x}>
          <mesh position={[x, HALL_HEIGHT - 0.2, centerZ]}>
            <boxGeometry args={[0.42, 0.4, length]} />
            <meshStandardMaterial {...marble} bumpScale={0.5} />
          </mesh>
          {/* Filet doré soulignant la poutre */}
          <mesh position={[x, HALL_HEIGHT - 0.42, centerZ]}>
            <boxGeometry args={[0.46, 0.05, length]} />
            <meshStandardMaterial color="#8a6a3c" metalness={0.78} roughness={0.32} />
          </mesh>
        </group>
      ))}
      {/* Rosettes dorées au cœur des caissons */}
      <Instances limit={bayZs.length * 3}>
        <sphereGeometry args={[0.09, 12, 8]} />
        <meshStandardMaterial color="#c9a36a" metalness={0.85} roughness={0.3} />
        {bayZs.map((z) =>
          [-3.05, 0, 3.05].map((x) => (
            <Instance key={`r-${z}-${x}`} position={[x, HALL_HEIGHT + 0.18, z]} scale={[1, 0.5, 1]} />
          ))
        )}
      </Instances>
      <Instances limit={bayZs.length * 3}>
        <torusGeometry args={[0.17, 0.025, 8, 20]} />
        <meshStandardMaterial color="#a8854a" metalness={0.82} roughness={0.32} />
        {bayZs.map((z) =>
          [-3.05, 0, 3.05].map((x) => (
            <Instance key={`t-${z}-${x}`} position={[x, HALL_HEIGHT + 0.22, z]} rotation={[Math.PI / 2, 0, 0]} />
          ))
        )}
      </Instances>

      {/* Puits de lumière lunaire + étoiles visibles à travers */}
      {skylightZs.map((z) => (
        <Skylight key={z} z={z} beam={beam} />
      ))}
      <points position={[0, 30, centerZ]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[skyStars, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.4} map={skyStarTex} color="#e9e4d4" transparent opacity={0.7} alphaTest={0.01} sizeAttenuation depthWrite={false} />
      </points>

      {/* Poussière dans la lumière */}
      <DustMotes topZ={topZ} bottomZ={bottomZ} count={highQuality ? 700 : 300} />

      {/* ——— Mur d'entrée : la porte de bronze par laquelle on est venu ——— */}
      <mesh position={[0, HALL_HEIGHT / 2, topZ + 0.2]} receiveShadow>
        <boxGeometry args={[HALL_WIDTH + 1, HALL_HEIGHT, 0.4]} />
        <meshStandardMaterial {...entranceWall} bumpScale={0.9} />
      </mesh>
      <group position={[0, 0, topZ - 0.02]}>
        {/* Encadrement */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 2.5, 2.7, 0]} castShadow>
            <boxGeometry args={[0.5, 5.4, 0.3]} />
            <meshStandardMaterial {...marble} bumpScale={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 5.52, 0]} castShadow>
          <boxGeometry args={[5.8, 0.48, 0.32]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
        <mesh position={[0, 0.07, 0.1]}>
          <boxGeometry args={[5.2, 0.14, 0.5]} />
          <meshStandardMaterial {...marble} bumpScale={0.4} color="#cfc6b0" />
        </mesh>
        {/* Vantaux de bronze refermés derrière le visiteur */}
        {[-1, 1].map((s) => (
          <group key={`leaf-${s}`} position={[s * 1.08, 2.62, -0.06]}>
            <mesh>
              <boxGeometry args={[2.08, 5.1, 0.14]} />
              <meshStandardMaterial color="#4a3a22" metalness={0.78} roughness={0.42} />
            </mesh>
            {[1.65, 0, -1.65].map((py) => (
              <mesh key={py} position={[0, py, 0.08]}>
                <boxGeometry args={[1.46, 1.32, 0.05]} />
                <meshStandardMaterial color="#5d4322" metalness={0.8} roughness={0.38} />
              </mesh>
            ))}
            {[1.65, 0, -1.65].map((py) => (
              <mesh key={`boss-${py}`} position={[0, py, 0.13]}>
                <sphereGeometry args={[0.09, 10, 8]} />
                <meshStandardMaterial color="#8a6530" metalness={0.88} roughness={0.3} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 2.62, 0.04]}>
          <boxGeometry args={[0.12, 5.05, 0.1]} />
          <meshStandardMaterial color="#6e5026" metalness={0.82} roughness={0.34} />
        </mesh>
      </group>

      {/* ——— Abside MEMORIA : sanctuaire au bout du couloir ——— */}
      {/* Mur courbe en hémicycle */}
      <mesh position={[0, HALL_HEIGHT / 2, bottomZ]} receiveShadow>
        <cylinderGeometry args={[HALL_WIDTH / 2, HALL_WIDTH / 2, HALL_HEIGHT, 32, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial {...entranceWall} bumpScale={0.9} side={THREE.BackSide} />
      </mesh>
      {/* Demi-coupole à caissons coiffant l'abside */}
      <mesh position={[0, HALL_HEIGHT, bottomZ]}>
        <sphereGeometry args={[HALL_WIDTH / 2, 32, 14, Math.PI / 2, Math.PI, 0, Math.PI / 2]} />
        <meshStandardMaterial map={coffer} roughness={0.85} side={THREE.BackSide} />
      </mesh>
      {/* Corniche dorée à la naissance de la coupole */}
      <mesh position={[0, HALL_HEIGHT - 0.05, bottomZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[HALL_WIDTH / 2 - 0.06, 0.1, 12, 32, Math.PI]} />
        <meshStandardMaterial color="#8a6a3c" metalness={0.78} roughness={0.32} />
      </mesh>
      {/* Soubassement courbe de l'abside */}
      <mesh position={[0, 0.5, bottomZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[HALL_WIDTH / 2 - 0.05, 0.12, 10, 32, Math.PI]} />
        <meshStandardMaterial {...marble} bumpScale={0.5} />
      </mesh>

      {/* Inscription MEMORIA gravée sur le mur de l'abside (WebGL) */}
      <mesh position={[0, 4.5, bottomZ + 0.55]}>
        <planeGeometry args={[3.9, 0.49]} />
        <meshBasicMaterial map={memoria} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Colonnes encadrant le foyer */}
      <FreeColumn position={[-2.55, 0, bottomZ + 1]} height={4.5} marble={marble} flutes={flutes} />
      <FreeColumn position={[2.55, 0, bottomZ + 1]} height={4.5} marble={marble} flutes={flutes} />

      {/* Autel à degrés et trépied au feu sacré */}
      <group position={[0, 0, bottomZ + 1.7]}>
        <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.32, 2.5]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.5, 1.7]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
        <mesh position={[0, 0.84, 0]} castShadow receiveShadow>
          <boxGeometry args={[2, 0.12, 2]} />
          <meshStandardMaterial color="#8a6a3c" metalness={0.6} roughness={0.4} />
        </mesh>
        <group position={[0, 0.9, 0]} scale={1.15}>
          <Tripod flame={flame} />
        </group>
      </group>

      {/* Amphores votives de part et d'autre de l'autel */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 3.1, 0, bottomZ + 2.5]}>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.34, 0.4, 0.6, 18]} />
            <meshStandardMaterial {...marble} bumpScale={0.5} />
          </mesh>
          <group position={[0, 0.6, 0]} scale={0.95}>
            <Amphora bronzeTone={s === 1} />
          </group>
        </group>
      ))}

      {/* Lueur chaude baignant l'abside */}
      <sprite position={[0, 3.2, bottomZ + 0.4]} scale={[7, 7, 1]}>
        <spriteMaterial map={glow} color="#ffb86a" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>

      {/* Niches à amphores face aux œuvres, bancs de marbre */}
      {placements.map((placement) => (
        <Niche
          key={`niche-${placement.post.id}`}
          z={placement.position.z}
          side={placement.normal.x}
          marble={marble}
          glow={glow}
          bronzeTone={placement.index % 2 === 1}
        />
      ))}
      {benchZs.map((z, i) => (
        <Bench key={z} z={z} side={i % 2 === 0 ? 1 : -1} marble={marble} />
      ))}

      {/* Les œuvres */}
      {placements.map((placement) => (
        <Painting
          key={placement.post.id}
          placement={placement}
          focused={focus?.index === placement.index}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
