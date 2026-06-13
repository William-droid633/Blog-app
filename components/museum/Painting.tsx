"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { formatDate } from "@/lib/format-date";
import { toRoman } from "@/lib/roman";
import type { Post } from "@/lib/types";
import { placeholderArtTexture, cartelTexture, softParticleTexture } from "./textures";

/* — Dimensions des œuvres — */
export const ART_WIDTH = 2.6;
export const ART_HEIGHT = 2.0;
export const ART_Y = 2.05;

/** Ajuste la texture pour remplir le cadre sans déformation (cover). */
function fitCover(texture: THREE.Texture) {
  const image = texture.image as { width?: number; height?: number } | undefined;
  if (!image?.width || !image?.height) return;
  const imageAspect = image.width / image.height;
  const frameAspect = (ART_WIDTH - 0.16) / (ART_HEIGHT - 0.16);
  if (imageAspect > frameAspect) {
    texture.repeat.set(frameAspect / imageAspect, 1);
    texture.offset.set((1 - texture.repeat.x) / 2, 0);
  } else {
    texture.repeat.set(1, imageAspect / frameAspect);
    texture.offset.set(0, (1 - texture.repeat.y) / 2);
  }
}

function LoadedArt({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    fitCover(texture);
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh position={[0, 0, 0.11]}>
      <planeGeometry args={[ART_WIDTH - 0.16, ART_HEIGHT - 0.16]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function PlaceholderArt({ title }: { title: string }) {
  const texture = useMemo(() => placeholderArtTexture(title), [title]);
  return (
    <mesh position={[0, 0, 0.11]}>
      <planeGeometry args={[ART_WIDTH - 0.16, ART_HEIGHT - 0.16]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function ArtFallback() {
  return (
    <mesh position={[0, 0, 0.11]}>
      <planeGeometry args={[ART_WIDTH - 0.16, ART_HEIGHT - 0.16]} />
      <meshBasicMaterial color="#1a1510" />
    </mesh>
  );
}

/**
 * Lampe de tableau en bronze : potence coudée discrète et capot
 * cylindrique incliné vers la toile — à la place de l'ancien « tube noir »
 * qui pointait comme une antenne.
 */
function PictureLight() {
  const brass = <meshStandardMaterial color="#7a5e30" metalness={0.85} roughness={0.34} />;
  const armY = ART_HEIGHT / 2 + 0.12;
  return (
    <group>
      {/* Platine fixée au cadre */}
      <mesh position={[0, armY - 0.05, 0.07]}>
        <boxGeometry args={[0.3, 0.12, 0.06]} />
        {brass}
      </mesh>
      {/* Potence coudée */}
      <mesh position={[0, armY + 0.12, 0.16]} rotation={[0.62, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.4, 10]} />
        {brass}
      </mesh>
      {/* Capot cylindrique horizontal incliné vers la toile */}
      <mesh position={[0, armY + 0.28, 0.34]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, ART_WIDTH * 0.62, 16, 1, false, 0, Math.PI * 1.35]} />
        {brass}
      </mesh>
      {/* Embouts du capot */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * ART_WIDTH * 0.31, armY + 0.28, 0.34]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.072, 0.072, 0.02, 16]} />
          {brass}
        </mesh>
      ))}
    </group>
  );
}

export interface PaintingPlacement {
  post: Post;
  index: number;
  /** Numéro d'exposition chronologique : la plus ancienne œuvre est la I. */
  number: number;
  position: THREE.Vector3;
  rotationY: number;
  /** Normale du mur : direction vers le centre du couloir. */
  normal: THREE.Vector3;
}

/**
 * Une œuvre accrochée au mur du couloir : cadre doré sculpté à gorge et
 * perles, marie-louise en pente, toile (image de couverture), lampe de
 * tableau en bronze, halo lumineux doux (sans rectangle visible) et cartel
 * gravé dans la scène WebGL.
 */
export default function Painting({
  placement,
  focused,
  onSelect,
}: {
  placement: PaintingPlacement;
  focused: boolean;
  onSelect: (index: number) => void;
}) {
  const { post, index, number, position, rotationY } = placement;
  const [hovered, setHovered] = useState(false);

  const glow = useMemo(() => softParticleTexture(), []);
  const cartel = useMemo(
    () => cartelTexture(toRoman(number), post.title, formatDate(post.created_at)),
    [number, post.title, post.created_at]
  );

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  const active = hovered || focused;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Halo lumineux doux et rond projeté sur le mur derrière le cadre :
          remplace l'ancien plan rectangulaire qui se voyait en transparence */}
      <sprite position={[0, 0.1, -0.04]} scale={[ART_WIDTH + 2, ART_HEIGHT + 2, 1]}>
        <spriteMaterial
          map={glow}
          color="#e8cd9c"
          transparent
          opacity={active ? 0.32 : 0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* Caisse du cadre : gorge profonde bronze (en retrait derrière l'or) */}
      <mesh position={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[ART_WIDTH + 0.56, ART_HEIGHT + 0.56, 0.12]} />
        <meshStandardMaterial color="#4a3318" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* Plate-bande godronnée dorée : la moulure visible, cliquable.
          C'est ICI que joue le reflet du bronze — plus sur la toile. */}
      <mesh
        position={[0, 0, 0]}
        castShadow
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta > 8) return; // ignore les glissements
          onSelect(index);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[ART_WIDTH + 0.42, ART_HEIGHT + 0.42, 0.1]} />
        <meshStandardMaterial color={active ? "#dcb978" : "#b8924f"} metalness={0.82} roughness={0.3} />
      </mesh>
      {/* Rang de perles doré bordant la vue */}
      <Beads active={active} />
      {/* Marie-louise (carton clair mat) : fine bordure crème autour de la toile */}
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[ART_WIDTH + 0.02, ART_HEIGHT + 0.02]} />
        <meshStandardMaterial color="#efe7d4" roughness={0.92} metalness={0} />
      </mesh>

      {/* La toile — couche la plus en avant, mate (aucun voile dessus) */}
      <Suspense fallback={<ArtFallback />}>
        {post.cover_image ? (
          <LoadedArt url={post.cover_image} />
        ) : (
          <PlaceholderArt title={post.title} />
        )}
      </Suspense>

      <PictureLight />

      {/* Cartel gravé, plaqué sous l'œuvre — nettement détaché du cadre pour
          éviter tout chevauchement (z-fighting) avec sa bordure inférieure */}
      <group position={[0, -(ART_HEIGHT / 2) - 0.7, -0.04]}>
        <mesh castShadow>
          <boxGeometry args={[1.0, 0.64, 0.05]} />
          <meshStandardMaterial color="#cdbf9f" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[0.9, 0.56]} />
          <meshBasicMaterial map={cartel} transparent toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Rang de perles (boules dorées) au pourtour intérieur du cadre. */
function Beads({ active }: { active: boolean }) {
  const positions = useMemo(() => {
    const list: Array<[number, number]> = [];
    const halfW = (ART_WIDTH + 0.28) / 2;
    const halfH = (ART_HEIGHT + 0.28) / 2;
    const step = 0.1;
    const nx = Math.floor((halfW * 2) / step);
    const ny = Math.floor((halfH * 2) / step);
    for (let i = 0; i <= nx; i++) {
      const x = -halfW + (i / nx) * halfW * 2;
      list.push([x, halfH], [x, -halfH]);
    }
    for (let j = 1; j < ny; j++) {
      const y = -halfH + (j / ny) * halfH * 2;
      list.push([-halfW, y], [halfW, y]);
    }
    return list;
  }, []);

  return (
    <group position={[0, 0, 0.055]}>
      {positions.map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]}>
          <sphereGeometry args={[0.026, 6, 5]} />
          <meshStandardMaterial color={active ? "#e8cd9c" : "#bb9656"} metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
