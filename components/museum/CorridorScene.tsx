"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Instances, Instance, MeshReflectorMaterial, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import type { Post } from "@/lib/types";
import Painting, { ART_Y, ART_WIDTH, ART_HEIGHT, type PaintingPlacement } from "./Painting";
import {
  travertineSurface,
  floorSurface,
  marbleSurface,
  fluteTexture,
  lightBeamTexture,
  mosaicTexture,
  starPositions,
  setRepeat,
  type SurfaceMaps,
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

/** Lumières chaudes qui accompagnent le visiteur. */
function FollowLights() {
  const ahead = useRef<THREE.PointLight>(null);
  const behind = useRef<THREE.PointLight>(null);

  useFrame(({ camera, clock }) => {
    const flicker = 1 + Math.sin(clock.elapsedTime * 7.3) * 0.05;
    if (ahead.current) {
      ahead.current.position.set(0, 4.4, camera.position.z - 7);
      ahead.current.intensity = 30 * flicker;
    }
    if (behind.current) {
      behind.current.position.set(0, 4.2, camera.position.z + 4);
      behind.current.intensity = 15;
    }
  });

  return (
    <>
      <pointLight ref={ahead} color="#e8cd9c" intensity={30} distance={24} decay={2} />
      <pointLight ref={behind} color="#d9b87a" intensity={15} distance={16} decay={2} />
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

/** Poussière en suspension dans les rais de lumière. */
function DustMotes({ topZ, bottomZ, count }: { topZ: number; bottomZ: number; count: number }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * (HALL_WIDTH - 1);
      arr[i * 3 + 1] = 0.4 + Math.random() * (HALL_HEIGHT - 1);
      arr[i * 3 + 2] = bottomZ + Math.random() * (topZ - bottomZ);
    }
    return arr;
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
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#e8cd9c"
        transparent
        opacity={0.45}
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
  beam,
  bronzeTone,
}: {
  z: number;
  side: number;
  marble: SurfaceMaps;
  beam: THREE.Texture;
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
      {/* Lueur montante */}
      <mesh position={[0, 1.9, 0.3]} rotation={[0, 0, Math.PI]}>
        <planeGeometry args={[1.3, 2.2]} />
        <meshBasicMaterial map={beam} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
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
 * Le grand couloir d'exposition : dallage damier crème / vert antique
 * réfléchissant, tapis de mosaïque, murs de travertin à cimaises dorées,
 * pilastres cannelés, plafond à caissons et rosettes, puits de lumière
 * lunaire, niches à amphores, bancs de marbre, abside MEMORIA.
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

  const wall = useMemo(() => setRepeat(travertineSurface(), length / 5, 1.8), [length]);
  const floor = useMemo(() => setRepeat(floorSurface(), 2, length / 8), [length]);
  const marble = useMemo(() => marbleSurface(), []);
  const mosaic = useMemo(() => {
    const t = mosaicTexture();
    t.repeat.set(1, length / 2.6);
    return t;
  }, [length]);
  const flutes = useMemo(() => {
    const t = fluteTexture();
    t.repeat.set(2, 1);
    return t;
  }, []);
  const beam = useMemo(() => lightBeamTexture(), []);
  const skyStars = useMemo(() => starPositions(300, 60), []);

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

  const rosettes = useMemo(() => {
    const list: Array<[number, number]> = [];
    cofferZs.forEach((z, i) => {
      if (i === 0) return;
      const bayZ = z + 1.5;
      [-3, 0, 3].forEach((x) => list.push([x, bayZ]));
    });
    return list;
  }, [cofferZs]);

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

      {/* Murs de travertin */}
      <mesh position={[-WALL_X - 0.2, HALL_HEIGHT / 2, centerZ]} receiveShadow>
        <boxGeometry args={[0.4, HALL_HEIGHT, length]} />
        <meshStandardMaterial {...wall} bumpScale={0.9} />
      </mesh>
      <mesh position={[WALL_X + 0.2, HALL_HEIGHT / 2, centerZ]} receiveShadow>
        <boxGeometry args={[0.4, HALL_HEIGHT, length]} />
        <meshStandardMaterial {...wall} bumpScale={0.9} />
      </mesh>

      {/* Soubassement, cimaises dorées, corniche */}
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
          <mesh position={[side * (WALL_X - 0.07), HALL_HEIGHT - 0.62, centerZ]}>
            <boxGeometry args={[0.12, 0.08, length]} />
            <meshStandardMaterial color="#8a6a3c" metalness={0.78} roughness={0.32} />
          </mesh>
          <mesh position={[side * (WALL_X - 0.08), HALL_HEIGHT - 0.38, centerZ]} castShadow>
            <boxGeometry args={[0.16, 0.4, length]} />
            <meshStandardMaterial {...marble} bumpScale={0.5} />
          </mesh>
        </group>
      ))}

      {/* Pilastres cannelés */}
      {pilasterZs.map((z) =>
        [-1, 1].map((side) => (
          <group key={`${z}-${side}`} position={[side * (WALL_X - 0.24), 0, z]}>
            <mesh position={[0, 0.27, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.54, 0.54, 0.96]} />
              <meshStandardMaterial {...marble} bumpScale={0.5} />
            </mesh>
            <mesh position={[0, HALL_HEIGHT / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.38, HALL_HEIGHT - 1.4, 0.74]} />
              <meshStandardMaterial
                map={marble.map}
                roughnessMap={marble.roughnessMap}
                bumpMap={flutes}
                bumpScale={1.2}
              />
            </mesh>
            <mesh position={[0, HALL_HEIGHT - 0.82, 0]} castShadow>
              <boxGeometry args={[0.56, 0.28, 0.98]} />
              <meshStandardMaterial {...marble} bumpScale={0.5} />
            </mesh>
          </group>
        ))
      )}

      {/* Plafond à caissons et rosettes dorées */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL_HEIGHT, centerZ]}>
        <planeGeometry args={[HALL_WIDTH + 1, length]} />
        <meshStandardMaterial color="#221a11" roughness={0.92} />
      </mesh>
      {cofferZs.map((z) => (
        <mesh key={z} position={[0, HALL_HEIGHT - 0.2, z]} castShadow>
          <boxGeometry args={[HALL_WIDTH + 0.6, 0.4, 0.52]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
      ))}
      {[-HALL_WIDTH / 4, HALL_WIDTH / 4].map((x) => (
        <mesh key={x} position={[x, HALL_HEIGHT - 0.2, centerZ]}>
          <boxGeometry args={[0.42, 0.4, length]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
      ))}
      <Instances limit={rosettes.length}>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshStandardMaterial color="#a8854a" metalness={0.82} roughness={0.32} />
        {rosettes.map(([x, z], i) => (
          <Instance key={i} position={[x, HALL_HEIGHT - 0.07, z]} scale={[1, 0.45, 1]} />
        ))}
      </Instances>

      {/* Puits de lumière lunaire + étoiles visibles à travers */}
      {skylightZs.map((z) => (
        <Skylight key={z} z={z} beam={beam} />
      ))}
      <points position={[0, 30, centerZ]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[skyStars, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.3} color="#e9e4d4" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
      </points>

      {/* Poussière dans la lumière */}
      <DustMotes topZ={topZ} bottomZ={bottomZ} count={highQuality ? 700 : 300} />

      {/* Mur d'entrée derrière le visiteur */}
      <mesh position={[0, HALL_HEIGHT / 2, topZ + 0.2]} receiveShadow>
        <boxGeometry args={[HALL_WIDTH + 1, HALL_HEIGHT, 0.4]} />
        <meshStandardMaterial {...wall} bumpScale={0.9} />
      </mesh>

      {/* Abside MEMORIA au bout du couloir */}
      <mesh position={[0, HALL_HEIGHT / 2, bottomZ]} receiveShadow>
        <cylinderGeometry args={[HALL_WIDTH / 2, HALL_WIDTH / 2, HALL_HEIGHT, 28, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial {...wall} bumpScale={0.9} side={THREE.BackSide} />
      </mesh>
      <group position={[0, 0, bottomZ + 1.6]}>
        <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 1.7, 1.9]} />
          <meshStandardMaterial {...marble} bumpScale={0.5} />
        </mesh>
        <group position={[0, 1.7, 0]} scale={1.7}>
          <Amphora bronzeTone />
        </group>
        <mesh position={[0, 4, 0]}>
          <coneGeometry args={[0.26, 0.7, 12]} />
          <meshBasicMaterial color="#ffb347" transparent opacity={0.9} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 3.4, 1]} color="#ff9d45" intensity={20} distance={16} decay={2} />
        <Html transform position={[0, 4.9, 0]} scale={0.55} style={{ pointerEvents: "none", userSelect: "none" }}>
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

      {/* Niches à amphores face aux œuvres, bancs de marbre */}
      {placements.map((placement) => (
        <Niche
          key={`niche-${placement.post.id}`}
          z={placement.position.z}
          side={placement.normal.x}
          marble={marble}
          beam={beam}
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
          beam={beam}
        />
      ))}
    </>
  );
}
