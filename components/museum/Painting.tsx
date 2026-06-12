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

  const active = hovered || focused;
  const gold = active ? "#e6ce8e" : "#b8924f";
  const goldDeep = active ? "#caa45e" : "#9a7a45";
  const openW = ART_WIDTH - 0.04;
  const openH = ART_HEIGHT - 0.04;
  const BORDER = 0.34;
  // Baguettes du cadre : haut/bas pleine largeur, gauche/droite ajustées.
  const bars: Array<{ key: string; w: number; h: number; x: number; y: number }> = [
    { key: "t", w: openW + BORDER * 2, h: BORDER, x: 0, y: openH / 2 + BORDER / 2 },
    { key: "b", w: openW + BORDER * 2, h: BORDER, x: 0, y: -(openH / 2 + BORDER / 2) },
    { key: "l", w: BORDER, h: openH, x: -(openW / 2 + BORDER / 2), y: 0 },
    { key: "r", w: BORDER, h: openH, x: openW / 2 + BORDER / 2, y: 0 },
  ];
  const corners: Array<[number, number]> = [
    [openW / 2 + BORDER / 2, openH / 2 + BORDER / 2],
    [-(openW / 2 + BORDER / 2), openH / 2 + BORDER / 2],
    [openW / 2 + BORDER / 2, -(openH / 2 + BORDER / 2)],
    [-(openW / 2 + BORDER / 2), -(openH / 2 + BORDER / 2)],
  ];

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Corps du cadre / fond (donne épaisseur et ombre portée) */}
      <mesh position={[0, 0, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[openW + BORDER * 2 + 0.06, openH + BORDER * 2 + 0.06, 0.08]} />
        <meshStandardMaterial color="#332715" metalness={0.45} roughness={0.55} />
      </mesh>

      {/* Marie-louise (passe-partout crème), en retrait derrière la toile */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[ART_WIDTH + 0.04, ART_HEIGHT + 0.04]} />
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

      {/* Cadre profilé : quatre baguettes dorées à gorge interne */}
      {bars.map((bar) => (
        <group key={bar.key} position={[bar.x, bar.y, 0]}>
          <mesh castShadow>
            <boxGeometry args={[bar.w, bar.h, 0.18]} />
            <meshStandardMaterial color={gold} metalness={0.85} roughness={0.28} />
          </mesh>
          {/* Gorge intérieure plus sombre (rebord vers la toile) */}
          <mesh position={[0, 0, 0.07]}>
            <boxGeometry args={[bar.w - 0.1, bar.h - 0.1, 0.06]} />
            <meshStandardMaterial color={goldDeep} metalness={0.9} roughness={0.22} />
          </mesh>
        </group>
      ))}
      {/* Ornements d'angle */}
      {corners.map(([cx, cy], i) => (
        <mesh key={i} position={[cx, cy, 0.13]}>
          <sphereGeometry args={[0.1, 14, 10]} />
          <meshStandardMaterial color={active ? "#e6ce8e" : "#b8924f"} metalness={0.9} roughness={0.25} />
        </mesh>
      ))}

      {/* Cible de clic / survol (plan transparent couvrant l'œuvre) */}
      <mesh
        position={[0, 0, 0.2]}
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
        <planeGeometry args={[openW + BORDER * 2, openH + BORDER * 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {/* Lampe de tableau */}
      <mesh position={[0, ART_HEIGHT / 2 + 0.42, 0.26]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 10]} />
        <meshStandardMaterial color="#3d2f1d" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, ART_HEIGHT / 2 + 0.5, 0.62]} rotation={[1.15, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.18, 12, 1, true]} />
        <meshStandardMaterial color="#a8854a" metalness={0.85} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Faisceau lumineux */}
      <mesh position={[0, 0.32, 0.3]}>
        <planeGeometry args={[ART_WIDTH + 0.2, ART_HEIGHT + 1.0]} />
        <meshBasicMaterial
          map={beam}
          transparent
          opacity={focused ? 0.5 : 0.28}
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
