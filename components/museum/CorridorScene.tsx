"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import type { Post } from "@/lib/types";
import Painting, { ART_Y, type PaintingPlacement } from "./Painting";
import {
  travertineTexture,
  floorTexture,
  marbleTexture,
  fluteTexture,
  lightBeamTexture,
} from "./textures";

/* — Géométrie du couloir — */
export const HALL_WIDTH = 8;
export const HALL_HEIGHT = 6;
export const EYE_HEIGHT = 1.7;
export const START_Z = 5;
const FIRST_ART_Z = -6;
const ART_STEP = 4.5;
const WALL_X = HALL_WIDTH / 2;

/** Bornes de déplacement de la caméra selon le nombre d'œuvres. */
export function corridorBounds(count: number): { start: number; end: number } {
  const lastZ = FIRST_ART_Z - Math.max(count - 1, 0) * ART_STEP;
  return { start: START_Z, end: lastZ - 5 };
}

/** Position de chaque œuvre : alternance mur gauche / mur droit. */
export function placePaintings(posts: Post[]): PaintingPlacement[] {
  return posts.map((post, index) => {
    const left = index % 2 === 0;
    return {
      post,
      index,
      position: new THREE.Vector3(
        left ? -WALL_X + 0.12 : WALL_X - 0.12,
        ART_Y,
        FIRST_ART_Z - index * ART_STEP
      ),
      rotationY: left ? Math.PI / 2 : -Math.PI / 2,
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

  useFrame(({ camera }, delta) => {
    const focused = focus !== null ? placements[focus.index] : null;

    if (focused) {
      const anchor = focused.position;
      const n = focused.normal;
      if (focus?.diving) {
        // On traverse la toile
        targetPos.current.set(anchor.x - n.x * 0.5, anchor.y, anchor.z);
        targetLook.current.set(anchor.x - n.x * 3, anchor.y, anchor.z);
      } else {
        // Face à l'œuvre, à distance de contemplation
        targetPos.current.set(anchor.x + n.x * 2.5, anchor.y - 0.15, anchor.z);
        targetLook.current.copy(anchor);
      }
    } else {
      // Marche dans l'axe du couloir, regard droit devant
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

/** Lumières chaudes qui accompagnent le visiteur. */
function FollowLights() {
  const ahead = useRef<THREE.PointLight>(null);
  const behind = useRef<THREE.PointLight>(null);

  useFrame(({ camera, clock }) => {
    const flicker = 1 + Math.sin(clock.elapsedTime * 7.3) * 0.05;
    if (ahead.current) {
      ahead.current.position.set(0, 4.4, camera.position.z - 7);
      ahead.current.intensity = 26 * flicker;
    }
    if (behind.current) {
      behind.current.position.set(0, 4.2, camera.position.z + 4);
      behind.current.intensity = 14;
    }
  });

  return (
    <>
      <pointLight ref={ahead} color="#e8cd9c" intensity={26} distance={22} decay={2} />
      <pointLight ref={behind} color="#d9b87a" intensity={14} distance={16} decay={2} />
    </>
  );
}

/**
 * Le grand couloir d'exposition : dallage réfléchissant, murs de
 * travertin, pilastres cannelés, plafond à caissons, œuvres accrochées
 * des deux côtés, autel de la Mémoire au fond.
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

  const wallTexture = useMemo(() => {
    const t = travertineTexture();
    t.repeat.set(length / 5, 1.6);
    return t;
  }, [length]);
  const floorTex = useMemo(() => {
    const t = floorTexture();
    t.repeat.set(2, length / 8);
    return t;
  }, [length]);
  const marble = useMemo(() => marbleTexture(), []);
  const flutes = useMemo(() => {
    const t = fluteTexture();
    t.repeat.set(2, 1);
    return t;
  }, []);
  const beam = useMemo(() => lightBeamTexture(), []);

  // Position de départ à l'entrée du couloir
  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, travelZ.current);
    camera.lookAt(0, EYE_HEIGHT, travelZ.current - 10);
  }, [camera, travelZ]);

  const pilasterZs = useMemo(() => {
    const list: number[] = [];
    for (let z = FIRST_ART_Z + ART_STEP / 2; z > bottomZ + 2; z -= ART_STEP) {
      list.push(z);
    }
    return list;
  }, [bottomZ]);

  const cofferZs = useMemo(() => {
    const list: number[] = [];
    for (let z = topZ - 1.5; z > bottomZ; z -= 3) {
      list.push(z);
    }
    return list;
  }, [topZ, bottomZ]);

  return (
    <>
      <color attach="background" args={["#0b0907"]} />
      <fog attach="fog" args={["#0b0907", 10, 42]} />

      <ambientLight intensity={0.34} />
      <hemisphereLight args={["#e8cd9c", "#1a140d", 0.32]} />
      <FollowLights />

      <CameraRig travelZ={travelZ} focus={focus} placements={placements} />

      {/* Sol : dallage de marbre poli, réfléchissant sur grand écran */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, centerZ]}>
        <planeGeometry args={[HALL_WIDTH, length]} />
        {highQuality ? (
          <MeshReflectorMaterial
            map={floorTex}
            resolution={512}
            blur={[280, 60]}
            mixBlur={0.85}
            mixStrength={0.65}
            mirror={0.45}
            roughness={0.55}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#8d8470"
          />
        ) : (
          <meshStandardMaterial map={floorTex} roughness={0.3} metalness={0.15} />
        )}
      </mesh>

      {/* Murs de travertin */}
      <mesh position={[-WALL_X - 0.2, HALL_HEIGHT / 2, centerZ]}>
        <boxGeometry args={[0.4, HALL_HEIGHT, length]} />
        <meshStandardMaterial map={wallTexture} roughness={0.8} />
      </mesh>
      <mesh position={[WALL_X + 0.2, HALL_HEIGHT / 2, centerZ]}>
        <boxGeometry args={[0.4, HALL_HEIGHT, length]} />
        <meshStandardMaterial map={wallTexture} roughness={0.8} />
      </mesh>

      {/* Plinthe et corniche dorées le long des murs */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (WALL_X - 0.03), 0.45, centerZ]}>
            <boxGeometry args={[0.07, 0.9, length]} />
            <meshStandardMaterial map={marble} roughness={0.5} />
          </mesh>
          <mesh position={[side * (WALL_X - 0.05), 0.93, centerZ]}>
            <boxGeometry args={[0.1, 0.08, length]} />
            <meshStandardMaterial color="#8a6a3c" metalness={0.75} roughness={0.35} />
          </mesh>
          <mesh position={[side * (WALL_X - 0.05), HALL_HEIGHT - 0.5, centerZ]}>
            <boxGeometry args={[0.1, 0.3, length]} />
            <meshStandardMaterial map={marble} roughness={0.55} />
          </mesh>
        </group>
      ))}

      {/* Pilastres cannelés entre les œuvres */}
      {pilasterZs.map((z) =>
        [-1, 1].map((side) => (
          <group key={`${z}-${side}`} position={[side * (WALL_X - 0.22), 0, z]}>
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[0.5, 0.5, 0.9]} />
              <meshStandardMaterial map={marble} roughness={0.6} />
            </mesh>
            <mesh position={[0, HALL_HEIGHT / 2, 0]}>
              <boxGeometry args={[0.36, HALL_HEIGHT - 1.3, 0.7]} />
              <meshStandardMaterial map={marble} bumpMap={flutes} bumpScale={0.015} roughness={0.6} />
            </mesh>
            <mesh position={[0, HALL_HEIGHT - 0.78, 0]}>
              <boxGeometry args={[0.52, 0.26, 0.92]} />
              <meshStandardMaterial map={marble} roughness={0.6} />
            </mesh>
          </group>
        ))
      )}

      {/* Plafond à caissons */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL_HEIGHT, centerZ]}>
        <planeGeometry args={[HALL_WIDTH + 1, length]} />
        <meshStandardMaterial color="#241c12" roughness={0.9} />
      </mesh>
      {cofferZs.map((z) => (
        <mesh key={z} position={[0, HALL_HEIGHT - 0.18, z]}>
          <boxGeometry args={[HALL_WIDTH + 0.6, 0.36, 0.5]} />
          <meshStandardMaterial map={marble} roughness={0.65} />
        </mesh>
      ))}
      {[-HALL_WIDTH / 4, HALL_WIDTH / 4].map((x) => (
        <mesh key={x} position={[x, HALL_HEIGHT - 0.18, centerZ]}>
          <boxGeometry args={[0.4, 0.36, length]} />
          <meshStandardMaterial map={marble} roughness={0.65} />
        </mesh>
      ))}

      {/* Mur d'entrée derrière le visiteur */}
      <mesh position={[0, HALL_HEIGHT / 2, topZ + 0.2]}>
        <boxGeometry args={[HALL_WIDTH + 1, HALL_HEIGHT, 0.4]} />
        <meshStandardMaterial map={wallTexture} roughness={0.8} />
      </mesh>

      {/* Fond du couloir : autel de la Mémoire */}
      <mesh position={[0, HALL_HEIGHT / 2, bottomZ - 0.2]}>
        <boxGeometry args={[HALL_WIDTH + 1, HALL_HEIGHT, 0.4]} />
        <meshStandardMaterial map={wallTexture} roughness={0.8} />
      </mesh>
      <group position={[0, 0, bottomZ + 2]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[1.6, 1.4, 1.6]} />
          <meshStandardMaterial map={marble} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.5, 0.65, 0.3, 20]} />
          <meshStandardMaterial color="#3d2f1d" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.85, 0]}>
          <coneGeometry args={[0.3, 0.8, 12]} />
          <meshBasicMaterial color="#ffb347" transparent opacity={0.9} />
        </mesh>
        <pointLight position={[0, 2.4, 0.6]} color="#ff9d45" intensity={16} distance={14} decay={2} />
        <Html
          transform
          position={[0, 3.6, 0]}
          scale={0.5}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              letterSpacing: "0.45em",
              fontWeight: 700,
              fontSize: "26px",
              color: "#c9a36a",
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              whiteSpace: "nowrap",
            }}
          >
            MEMORIA
          </div>
        </Html>
      </group>

      {/* Les œuvres */}
      {placements.map((placement) => (
        <Painting
          key={placement.post.id}
          placement={placement}
          focused={focus?.index === placement.index}
          onSelect={onSelect}
          beam={beam}
        />
      ))}
    </>
  );
}
