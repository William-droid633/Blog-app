import * as THREE from "three";
import { bakeSurface, fbm, turbulence, hexToRgb, mix, type RGB } from "./noise";

/**
 * Matériaux PBR procéduraux (couleur + relief + rugosité) générés sur
 * canvas à partir de bruit fractal — marbre, travertin, vert antique,
 * bronze patiné, mosaïque. Aucun fichier externe : réalisme sans réseau.
 */

export interface SurfaceMaps {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

function toTexture(canvas: HTMLCanvasElement, srgb: boolean, repeat = true): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function toSurface(
  baked: { color: HTMLCanvasElement; bump: HTMLCanvasElement; rough: HTMLCanvasElement },
  repeat = true
): SurfaceMaps {
  return {
    map: toTexture(baked.color, true, repeat),
    bumpMap: toTexture(baked.bump, false, repeat),
    roughnessMap: toTexture(baked.rough, false, repeat),
  };
}

export function setRepeat(surface: SurfaceMaps, x: number, y: number): SurfaceMaps {
  surface.map.repeat.set(x, y);
  surface.bumpMap.repeat.set(x, y);
  surface.roughnessMap.repeat.set(x, y);
  return surface;
}

/** Marbre blanc-crème veiné (colonnes, corniches, encadrements). */
export function marbleSurface(size = 512): SurfaceMaps {
  const base = hexToRgb("#ddd6c4");
  const shadowTone = hexToRgb("#c2b9a2");
  const veinTone = hexToRgb("#7e7460");

  return toSurface(
    bakeSurface(size, (u, v) => {
      const clouds = fbm(u * 4, v * 4, 4);
      const warp = fbm(u * 7 + 31.4, v * 7 + 17.2, 4);
      // Veines : sinusoïde déformée par le bruit, repliée et affinée
      const veinField = Math.sin((u * 3 + warp * 2.6 + v * 0.8) * Math.PI * 2);
      const vein = Math.pow(1 - Math.abs(veinField), 14);
      const microVein = Math.pow(1 - Math.abs(Math.sin((v * 5 + clouds * 3.1) * Math.PI * 2)), 22) * 0.5;

      let color = mix(base, shadowTone, (clouds - 0.5) * 1.2 + 0.2);
      color = mix(color, veinTone, vein * 0.75 + microVein);

      return {
        color,
        bump: 0.55 + (clouds - 0.5) * 0.2 - vein * 0.3,
        rough: 0.5 + (clouds - 0.5) * 0.18 + vein * 0.18,
      };
    })
  );
}

/** Travertin strié et piqué (grands murs). */
export function travertineSurface(size = 512): SurfaceMaps {
  const light = hexToRgb("#cfc2a4");
  const band = hexToRgb("#b3a482");
  const pitTone: RGB = hexToRgb("#6f6248");

  return toSurface(
    bakeSurface(size, (u, v) => {
      const warp = fbm(u * 5, v * 5, 4);
      // Strates horizontales déformées
      const strata = 0.5 + 0.5 * Math.sin((v * 9 + warp * 1.4) * Math.PI * 2);
      // Piqûres typiques du travertin
      const pores = turbulence(u * 26, v * 26, 3);
      const pore = pores < 0.16 ? (0.16 - pores) / 0.16 : 0;
      const grain = fbm(u * 40 + 7.7, v * 40 + 3.3, 3);

      let color = mix(light, band, strata * 0.55 + (warp - 0.5) * 0.4);
      color = mix(color, pitTone, pore * 0.8);
      color = mix(color, hexToRgb("#dccfae"), (grain - 0.5) * 0.3);

      return {
        color,
        bump: 0.6 - pore * 0.5 + (grain - 0.5) * 0.12 - strata * 0.05,
        rough: 0.78 + pore * 0.2 - (grain - 0.5) * 0.08,
      };
    })
  );
}

/** Dallage poli : damier travertin crème / vert antique veiné. */
export function floorSurface(size = 1024): SurfaceMaps {
  const cream = hexToRgb("#cdc1a4");
  const creamVeinTone: RGB = hexToRgb("#8f8468");
  const green = hexToRgb("#2e4438");
  const greenVein = hexToRgb("#9fbfa8");
  const grout = hexToRgb("#191510");

  return toSurface(
    bakeSurface(size, (u, v) => {
      const tiles = 2; // 2×2 dalles par tuile de texture
      const tu = u * tiles;
      const tv = v * tiles;
      const ix = Math.floor(tu);
      const iy = Math.floor(tv);
      const fu = tu - ix;
      const fv = tv - iy;
      const dark = (ix + iy) % 2 === 1;

      // Joints biseautés entre dalles
      const edge = Math.min(fu, 1 - fu, fv, 1 - fv);
      const joint = edge < 0.012 ? 1 : edge < 0.03 ? (0.03 - edge) / 0.018 * 0.4 : 0;

      const warp = fbm(tu * 3.1 + ix * 13.7, tv * 3.1 + iy * 7.3, 4);
      const veinField = Math.sin((fu * 2.2 + warp * 3 + fv) * Math.PI * 2);
      const vein = Math.pow(1 - Math.abs(veinField), 12);
      const clouds = fbm(tu * 5 + 51, tv * 5 + 23, 4);

      let color: RGB;
      if (dark) {
        color = mix(green, hexToRgb("#1f3026"), (clouds - 0.5) * 1.1);
        color = mix(color, greenVein, vein * 0.65);
      } else {
        color = mix(cream, hexToRgb("#b5a888"), (clouds - 0.5) * 1.1);
        color = mix(color, creamVeinTone, vein * 0.6);
      }
      color = mix(color, grout, joint);

      return {
        color,
        bump: 0.6 - joint * 0.45 + (clouds - 0.5) * 0.06,
        rough: 0.22 + joint * 0.5 + (clouds - 0.5) * 0.1 + vein * 0.08,
      };
    })
  );
}

/** Bronze patiné des grandes portes. */
export function bronzeSurface(size = 512): SurfaceMaps {
  const bronze = hexToRgb("#5d4120");
  const bright = hexToRgb("#8a6530");
  const verdigris = hexToRgb("#3c5a4a");

  return toSurface(
    bakeSurface(size, (u, v) => {
      const wear = fbm(u * 6, v * 6, 4);
      const patina = fbm(u * 11 + 41.3, v * 11 + 9.1, 4);
      const streak = fbm(u * 3, v * 18, 3); // coulures verticales

      let color = mix(bronze, bright, (wear - 0.45) * 1.4);
      const patinaAmount = Math.max(0, patina - 0.52) * 2.2 + Math.max(0, streak - 0.58) * 1.4;
      color = mix(color, verdigris, Math.min(0.7, patinaAmount));

      return {
        color,
        bump: 0.5 + (wear - 0.5) * 0.3,
        rough: 0.38 + patinaAmount * 0.3 + (wear - 0.5) * 0.12,
      };
    })
  );
}

/**
 * Terre sableuse tassée des abords d'un temple romain : nappes ocre
 * irrégulières, ondulations balayées par le vent, grain serré et
 * cailloux épars à demi enfouis.
 */
export function sandSurface(size = 1024): SurfaceMaps {
  const sand = hexToRgb("#a8906a");
  const lightSand = hexToRgb("#c6ad83");
  const damp = hexToRgb("#73603f");
  const pebbleTone = hexToRgb("#90867a");

  return toSurface(
    bakeSurface(size, (u, v) => {
      // Grandes nappes : zones tassées sombres / zones sèches claires
      const patches = fbm(u * 3.1, v * 3.1, 4);
      // Ondulations fines de sable balayé, déformées par le bruit
      const ripple =
        Math.sin((v * 24 + fbm(u * 6, v * 6, 3) * 7) * Math.PI * 2) * 0.5 + 0.5;
      // Grain serré + micro-relief
      const grain = fbm(u * 60 + 11.7, v * 60 + 41.2, 3);
      const micro = fbm(u * 140 + 3.1, v * 140 + 9.4, 2);
      // Cailloux épars : seuil sur une turbulence haute fréquence
      const t = turbulence(u * 48 + 17.3, v * 48 + 5.1, 3);
      const pebble = t < 0.085 ? (0.085 - t) / 0.085 : 0;

      let color = mix(sand, damp, Math.max(0, patches - 0.45) * 1.5);
      color = mix(
        color,
        lightSand,
        Math.max(0, 0.5 - patches) * ripple * 0.7 + (grain - 0.5) * 0.4
      );
      color = mix(color, pebbleTone, pebble * 0.85);

      return {
        color,
        bump: 0.5 + (grain - 0.5) * 0.28 + (micro - 0.5) * 0.18 + ripple * 0.07 + pebble * 0.5,
        rough: 0.94 - pebble * 0.25 + (grain - 0.5) * 0.06,
      };
    })
  );
}

/* ————— Textures dessinées (non PBR) ————— */

function makeCanvas(width: number, height = width): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext("2d") as CanvasRenderingContext2D];
}

/** Cannelures de colonne (carte de relief). */
export function fluteTexture(stripes = 8, size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size, 64);
  const stripeWidth = size / stripes;
  for (let i = 0; i < stripes; i++) {
    const gradient = ctx.createLinearGradient(i * stripeWidth, 0, (i + 1) * stripeWidth, 0);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, "#4a4a4a");
    gradient.addColorStop(1, "#ffffff");
    ctx.fillStyle = gradient;
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, 64);
  }
  return toTexture(canvas, false);
}

/** Mosaïque romaine : champ ivoire, bordures pourpres, frise en méandre. */
export function mosaicTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const cells = 32;
  const cell = size / cells;

  // Méandre 4 colonnes × 8 rangées (X = tesselle sombre)
  const fret = ["XXXX", "X...", "X.XX", "X..X", "XXXX", "...X", "XX.X", "X..X"];

  ctx.fillStyle = "#15110c";
  ctx.fillRect(0, 0, size, size);

  for (let iy = 0; iy < cells; iy++) {
    for (let ix = 0; ix < cells; ix++) {
      let baseColor: string;
      if (ix < 2 || ix >= cells - 2) {
        baseColor = "#7c3328"; // bordure pourpre de Pompéi
      } else if (ix < 6) {
        baseColor = fret[iy % 8][ix - 2] === "X" ? "#2c3147" : "#d8cdb2";
      } else if (ix >= cells - 6) {
        baseColor = fret[iy % 8][cells - 3 - ix] === "X" ? "#2c3147" : "#d8cdb2";
      } else {
        // Champ central ivoire, semis de losanges terracotta
        const diamond = (ix + iy) % 9 === 0 && ix % 3 === 0;
        baseColor = diamond ? "#a05538" : "#cfc4a6";
      }

      // Jitter de teinte par tesselle + joint sombre
      const rgb = hexToRgb(baseColor);
      const jitter = (fbm(ix * 0.91, iy * 0.91, 2) - 0.5) * 36;
      ctx.fillStyle = `rgb(${Math.round(rgb.r + jitter)}, ${Math.round(rgb.g + jitter)}, ${Math.round(
        rgb.b + jitter
      )})`;
      ctx.fillRect(ix * cell + 1, iy * cell + 1, cell - 2, cell - 2);
    }
  }

  return toTexture(canvas, true);
}

/** Faisceau de lumière (alpha) pour les éclairages muséaux. */
export function lightBeamTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "rgba(255, 232, 190, 0.55)");
  gradient.addColorStop(0.6, "rgba(255, 232, 190, 0.12)");
  gradient.addColorStop(1, "rgba(255, 232, 190, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const side = ctx.createLinearGradient(0, 0, size, 0);
  side.addColorStop(0, "rgba(0,0,0,1)");
  side.addColorStop(0.25, "rgba(0,0,0,0)");
  side.addColorStop(0.75, "rgba(0,0,0,0)");
  side.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";

  return toTexture(canvas, true, false);
}

/** Œuvre de remplacement quand un article n'a pas d'image. */
export function placeholderArtTexture(title: string, size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const bg = ctx.createRadialGradient(size / 2, size * 0.35, 40, size / 2, size / 2, size * 0.8);
  bg.addColorStop(0, "#2e2517");
  bg.addColorStop(1, "#120e0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(201, 163, 106, 0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, size - 56, size - 56);

  ctx.fillStyle = "#c9a36a";
  ctx.font = `600 ${size * 0.42}px Cinzel, Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title.charAt(0).toUpperCase(), size / 2, size / 2 + 10);

  return toTexture(canvas, true, false);
}

/** Dégradé atmosphérique du ciel nocturne (zénith → horizon). */
export function skyGradientTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(16, 512);
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#0a1228");
  gradient.addColorStop(0.4, "#101a30");
  gradient.addColorStop(0.68, "#1d2438");
  gradient.addColorStop(0.86, "#33304a");
  gradient.addColorStop(1, "#4a3c40");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 512);
  const texture = toTexture(canvas, true, false);
  return texture;
}

/** Nappe de nuages fins (alpha en bruit fractal, bords fondus). */
export function cloudTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const data = ctx.createImageData(size, size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = px / size;
      const v = py / size;
      const i = (py * size + px) * 4;
      const density = fbm(u * 5, v * 9 + 13.7, 4);
      // Fondu radial pour éviter les bords nets
      const dx = u - 0.5;
      const dy = v - 0.5;
      const falloff = Math.max(0, 1 - Math.hypot(dx * 2, dy * 2.4));
      const alpha = Math.max(0, density * 1.6 - 0.72) * falloff;
      data.data[i] = 200;
      data.data[i + 1] = 210;
      data.data[i + 2] = 232;
      data.data[i + 3] = Math.min(255, alpha * 340);
    }
  }
  ctx.putImageData(data, 0, 0);
  return toTexture(canvas, true, false);
}

/** Ombre de contact douce (disque sombre fondu) à poser sous les objets. */
export function shadowBlobTexture(size = 128): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0,0,0,0.6)");
  gradient.addColorStop(0.6, "rgba(0,0,0,0.28)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas, true, false);
}

/** Ciel étoilé : positions aléatoires sur un grand dôme. */
export function starPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.9);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  return positions;
}

/** Tirage gaussien (Box-Muller) — dispersion naturelle des particules. */
export function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Particule douce : disque blanc à bord fondu, pour des points ronds et
 * lumineux (étoiles de la galaxie, poussières en suspension) au lieu des
 * carrés bruts du PointsMaterial nu.
 */
export function softParticleTexture(size = 64): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.7)");
  gradient.addColorStop(0.7, "rgba(255,255,255,0.18)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas, false, false);
}

/**
 * Langue de flamme (alpha) : cœur blanc-jaune, corps orange, lisière
 * rouge sombre, base fondue — ondulée par un léger bruit pour casser
 * la symétrie. Posée sur des plans croisés et animée par flicker.
 */
export function flameTexture(size = 128): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size, size * 2);
  const img = ctx.createImageData(size, size * 2);
  const data = img.data;

  for (let py = 0; py < size * 2; py++) {
    for (let px = 0; px < size; px++) {
      const u = px / size - 0.5;
      const h = 1 - py / (size * 2); // 0 = base, 1 = pointe
      // Largeur : ventrue au tiers bas, effilée vers la pointe
      const width =
        0.34 *
        Math.pow(Math.sin(Math.PI * Math.min(1, h * 0.92 + 0.04)), 0.85) *
        (1 - h * 0.55);
      const waver = (fbm(u * 3 + 7.7, h * 5.2 + 1.3, 3) - 0.5) * 0.12 * h;
      const d = Math.abs(u - waver) / Math.max(width, 0.001);
      let a = Math.max(0, 1 - d);
      a = Math.pow(a, 1.6) * Math.pow(Math.min(1, h * 6), 1.2);
      const core = Math.pow(a, 3) * (1 - h * 0.35);

      const i = (py * size + px) * 4;
      data[i] = 255;
      data[i + 1] = Math.min(255, Math.round(110 + core * 135 + a * 35));
      data[i + 2] = Math.min(255, Math.round(24 + core * 215));
      data[i + 3] = Math.round(Math.min(1, a * 1.25) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(canvas, true, false);
}
