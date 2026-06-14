import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { SurfaceMaps } from "./textures";

/* — Textures PBR externes (Poly Haven, CC0) déposées dans public/textures — */
export const GROUND_FILES = {
  map: "/textures/sol-exterieur/grassy_cobblestone_diff_1k.jpg",
  normalMap: "/textures/sol-exterieur/grassy_cobblestone_nor_gl_1k.jpg",
  roughnessMap: "/textures/sol-exterieur/grassy_cobblestone_rough_1k.jpg",
};
export const WALL_FILES = {
  map: "/textures/murs-facade/marble_01_diff_1k.jpg",
  normalMap: "/textures/murs-facade/marble_01_nor_gl_1k.jpg",
  roughnessMap: "/textures/murs-facade/marble_01_rough_1k.jpg",
};
export const STAIR_FILES = {
  map: "/textures/escaliers/floor_tiles_02_diff_1k.jpg",
  normalMap: "/textures/escaliers/floor_tiles_02_nor_gl_1k.jpg",
  roughnessMap: "/textures/escaliers/floor_tiles_02_rough_1k.jpg",
};
export const ROCK_FILES = {
  map: "/textures/ruines/marble_rock_02_diff_1k.jpg",
  normalMap: "/textures/ruines/marble_rock_02_nor_gl_1k.jpg",
  roughnessMap: "/textures/ruines/marble_rock_02_rough_1k.jpg",
};

/**
 * Charge une texture PBR externe (couleur sRGB + normal GL + roughness linéaire)
 * et la renvoie au format SurfaceMaps, prête à être étalée sur un
 * meshStandardMaterial comme les matériaux procéduraux. Tuilage repeatX/repeatY.
 */
export function usePbrSurface(
  files: { map: string; normalMap: string; roughnessMap: string },
  repeatX: number,
  repeatY: number
): SurfaceMaps {
  const maps = useTexture(files) as {
    map: THREE.Texture;
    normalMap: THREE.Texture;
    roughnessMap: THREE.Texture;
  };
  return useMemo(() => {
    maps.map.colorSpace = THREE.SRGBColorSpace;
    maps.normalMap.colorSpace = THREE.NoColorSpace;
    maps.roughnessMap.colorSpace = THREE.NoColorSpace;
    for (const t of [maps.map, maps.normalMap, maps.roughnessMap]) {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.anisotropy = 8;
    }
    return maps as unknown as SurfaceMaps;
  }, [maps, repeatX, repeatY]);
}
