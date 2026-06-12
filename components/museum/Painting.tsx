"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { formatDate } from "@/lib/format-date";
import { toRoman } from "@/lib/roman";
import type { Post } from "@/lib/types";
import { placeholderArtTexture } from "./textures";

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
    <mesh position={[0, 0, 0.055]}>
      <planeGeometry args={[ART_WIDTH - 0.16, ART_HEIGHT - 0.16]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function PlaceholderArt({ title }: { title: string }) {
  const texture = useMemo(() => placeholderArtTexture(title), [title]);
  return (
    <mesh position={[0, 0, 0.055]}>
      <planeGeometry args={[ART_WIDTH - 0.16, ART_HEIGHT - 0.16]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function ArtFallback() {
  return (
    <mesh position={[0, 0, 0.055]}>
      <planeGeometry args={[ART_WIDTH - 0.16, ART_HEIGHT - 0.16]} />
      <meshBasicMaterial color="#1a1510" />
    </mesh>
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
 * Une œuvre accrochée au mur du couloir : cadre doré à double moulure,
 * marie-louise, toile (photo de couverture de l'article), faisceau de
 * lumière de musée et cartel gravé (titre + date).
 */
export default function Painting({
  placement,
  focused,
  onSelect,
  beam,
}: {
  placement: PaintingPlacement;
  focused: boolean;
  onSelect: (index: number) => void;
  beam: THREE.Texture;
}) {
  const { post, index, number, position, rotationY } = placement;
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Moulure extérieure bronze */}
      <mesh position={[0, 0, -0.015]} castShadow>
        <boxGeometry args={[ART_WIDTH + 0.6, ART_HEIGHT + 0.6, 0.05]} />
        <meshStandardMaterial color="#5d4322" metalness={0.7} roughness={0.45} />
      </mesh>
      {/* Filet doré intermédiaire */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[ART_WIDTH + 0.44, ART_HEIGHT + 0.44, 0.06]} />
        <meshStandardMaterial color="#caa45e" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Cadre doré */}
      <mesh
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
        <boxGeometry args={[ART_WIDTH + 0.3, ART_HEIGHT + 0.3, 0.09]} />
        <meshStandardMaterial
          color={hovered || focused ? "#d9b87a" : "#a8854a"}
          metalness={0.78}
          roughness={0.32}
        />
      </mesh>
      {/* Marie-louise */}
      <mesh position={[0, 0, 0.048]}>
        <planeGeometry args={[ART_WIDTH + 0.02, ART_HEIGHT + 0.02]} />
        <meshStandardMaterial color="#efe7d4" roughness={0.85} />
      </mesh>

      {/* La toile */}
      <Suspense fallback={<ArtFallback />}>
        {post.cover_image ? (
          <LoadedArt url={post.cover_image} />
        ) : (
          <PlaceholderArt title={post.title} />
        )}
      </Suspense>

      {/* Lampe de tableau */}
      <mesh position={[0, ART_HEIGHT / 2 + 0.34, 0.16]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
        <meshStandardMaterial color="#3d2f1d" metalness={0.8} roughness={0.35} />
      </mesh>
      {/* Faisceau lumineux */}
      <mesh position={[0, 0.32, 0.22]}>
        <planeGeometry args={[ART_WIDTH + 0.4, ART_HEIGHT + 1.1]} />
        <meshBasicMaterial
          map={beam}
          transparent
          opacity={focused ? 0.55 : 0.34}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Cartel : titre de l'œuvre et date */}
      <Html
        transform
        position={[0, -(ART_HEIGHT / 2) - 0.62, 0.06]}
        scale={0.32}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            width: "300px",
            textAlign: "center",
            background: "linear-gradient(170deg, #efe7d4, #d8cdb2)",
            border: "1px solid #8a6a3c",
            boxShadow: "0 6px 18px rgba(0,0,0,0.55)",
            padding: "10px 14px 12px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontSize: "10px",
              letterSpacing: "0.3em",
              color: "#8a6a3c",
            }}
          >
            ŒUVRE {toRoman(number)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontWeight: 700,
              fontSize: "17px",
              lineHeight: 1.25,
              color: "#2c2317",
              marginTop: "4px",
            }}
          >
            {post.title}
          </div>
          <div
            style={{
              fontFamily: "var(--font-accent), Georgia, serif",
              fontStyle: "italic",
              fontSize: "12px",
              color: "#6f5a3a",
              marginTop: "3px",
            }}
          >
            {formatDate(post.created_at)}
          </div>
        </div>
      </Html>
    </group>
  );
}
