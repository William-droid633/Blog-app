import * as THREE from "three";
import { bakeSurface, fbm, turbulence, hexToRgb, mix, type RGB } from "./noise";

/**
 * Matériaux PBR procéduraux (couleur + relief + rugosité) générés sur
 * canvas à partir de bruit fractal — marbre, travertin, vert antique,
 * bronze patiné, mosaïque. Aucun fichier externe : réalisme sans réseau.
 */

export interface SurfaceMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
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
  baked: { color: HTMLCanvasElement; normal: HTMLCanvasElement; rough: HTMLCanvasElement },
  repeat = true
): SurfaceMaps {
  return {
    map: toTexture(baked.color, true, repeat),
    normalMap: toTexture(baked.normal, false, repeat),
    roughnessMap: toTexture(baked.rough, false, repeat),
  };
}

export function setRepeat(surface: SurfaceMaps, x: number, y: number): SurfaceMaps {
  surface.map.repeat.set(x, y);
  surface.normalMap.repeat.set(x, y);
  surface.roughnessMap.repeat.set(x, y);
  return surface;
}

/**
 * Clone léger d'une surface : mêmes canvas sources, textures distinctes —
 * permet des répétitions différentes par mur sans re-générer le matériau.
 */
export function cloneSurface(surface: SurfaceMaps): SurfaceMaps {
  return {
    map: surface.map.clone() as THREE.CanvasTexture,
    normalMap: surface.normalMap.clone() as THREE.CanvasTexture,
    roughnessMap: surface.roughnessMap.clone() as THREE.CanvasTexture,
  };
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
      // Réseau secondaire de veines plus fines, orientées autrement
      const warp2 = fbm(u * 13 + 5.1, v * 13 + 9.7, 3);
      const vein2 =
        Math.pow(1 - Math.abs(Math.sin((v * 4 - u * 1.4 + warp2 * 3) * Math.PI * 2)), 20) * 0.6;
      const microVein = Math.pow(1 - Math.abs(Math.sin((v * 5 + clouds * 3.1) * Math.PI * 2)), 22) * 0.5;
      // Grain microscopique du poli (capté par la lumière rasante)
      const grain = fbm(u * 110 + 4.3, v * 110 + 8.1, 2);

      let color = mix(base, shadowTone, (clouds - 0.5) * 1.2 + 0.2);
      color = mix(color, veinTone, vein * 0.7 + vein2 + microVein);
      // Patine chaude par plaques (marbre légèrement vieilli)
      color = mix(color, hexToRgb("#cdbf9c"), Math.max(0, warp - 0.62) * 0.5);

      return {
        color,
        bump: 0.55 + (clouds - 0.5) * 0.18 - (vein + vein2) * 0.28 + (grain - 0.5) * 0.08,
        rough: 0.46 + (clouds - 0.5) * 0.16 + (vein + vein2) * 0.2 + (grain - 0.5) * 0.06,
      };
    }, 1.8)
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
      const micro = fbm(u * 130 + 2.7, v * 130 + 6.4, 2);
      // Coulures d'oxyde de fer (taches rousses)
      const rust = Math.max(0, fbm(u * 3 + 20.5, v * 7 + 11.3, 4) - 0.6);

      let color = mix(light, band, strata * 0.55 + (warp - 0.5) * 0.4);
      color = mix(color, pitTone, pore * 0.8);
      color = mix(color, hexToRgb("#dccfae"), (grain - 0.5) * 0.3);
      color = mix(color, hexToRgb("#9c7a52"), rust * 0.5);

      return {
        color,
        bump: 0.6 - pore * 0.5 + (grain - 0.5) * 0.12 - strata * 0.05 + (micro - 0.5) * 0.07,
        rough: 0.78 + pore * 0.2 - (grain - 0.5) * 0.08,
      };
    }, 2.6)
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
      // Ton propre à chaque dalle (pierres de provenances diverses) + usure
      const tileJitter = fbm(ix * 13.7 + 3.1, iy * 9.3 + 8.7, 2) - 0.5;
      color = mix(color, dark ? hexToRgb("#9fbfa8") : hexToRgb("#8f8468"), Math.max(0, tileJitter) * 0.25);
      color = mix(color, dark ? hexToRgb("#1a2820") : hexToRgb("#a99c7e"), Math.max(0, -tileJitter) * 0.35);
      color = mix(color, grout, joint);

      return {
        color,
        bump: 0.6 - joint * 0.45 + (clouds - 0.5) * 0.06,
        rough: 0.22 + joint * 0.5 + (clouds - 0.5) * 0.1 + vein * 0.08 + tileJitter * 0.12,
      };
    }, 1.5)
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
    }, 1.9)
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
    }, 2.6)
  );
}

/**
 * Grand appareil de travertin : assises de blocs en quinconce, joints
 * fins creusés, ton légèrement différent par bloc, surface piquée —
 * pour les murs de la cella et les antes, bien plus crédible qu'une
 * nappe de pierre uniforme.
 */
export function ashlarSurface(size = 1024): SurfaceMaps {
  const light = hexToRgb("#cbbd9e");
  const band = hexToRgb("#b0a07e");
  const pitTone = hexToRgb("#6f6248");
  const jointTone = hexToRgb("#564b35");

  const rows = 5;
  const cols = 2.5; // blocs deux fois plus larges que hauts

  return toSurface(
    bakeSurface(size, (u, v) => {
      const rv = v * rows;
      const row = Math.floor(rv);
      const offset = (row % 2) * 0.5;
      const cu = u * cols + offset;
      const col = Math.floor(cu);
      const fu = cu - col;
      const fv = rv - row;

      // Joints biseautés (égalisés malgré l'anisotropie des blocs)
      const jx = Math.min(fu, 1 - fu) * 2;
      const jy = Math.min(fv, 1 - fv);
      const j = Math.min(jx, jy);
      const joint = j < 0.045 ? (0.045 - j) / 0.045 : 0;

      // Ton propre à chaque bloc + nuages de surface
      const blockTone = fbm(col * 7.13 + row * 3.71, row * 9.17 + col * 1.3, 2);
      const warp = fbm(u * 6 + col * 0.7, v * 6 + row * 1.4, 4);
      // Piqûres du travertin
      const pores = turbulence(u * 30 + 8.2, v * 30 + 2.6, 3);
      const pore = pores < 0.13 ? (0.13 - pores) / 0.13 : 0;
      const grain = fbm(u * 44 + 21, v * 44 + 7, 3);

      // Coulures verticales de ruissellement, plus marquées vers le bas du bloc
      const streak = fbm(u * 50 + col * 3.3, v * 5, 3);
      const micro = fbm(u * 140 + 3.1, v * 140 + 7.7, 2);

      let color = mix(light, band, (blockTone - 0.5) * 1.3 + (warp - 0.5) * 0.5);
      color = mix(color, hexToRgb("#d8cba9"), (grain - 0.5) * 0.3);
      color = mix(color, pitTone, pore * 0.6);
      color = mix(color, hexToRgb("#8c7e60"), Math.max(0, streak - 0.55) * 0.5 * fv);
      color = mix(color, jointTone, joint * 0.9);

      return {
        color,
        bump:
          0.62 - joint * 0.5 - pore * 0.3 + (warp - 0.5) * 0.1 + (grain - 0.5) * 0.08 +
          (micro - 0.5) * 0.06,
        rough: 0.8 + pore * 0.15 - (blockTone - 0.5) * 0.08,
      };
    }, 2.7)
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

/**
 * Caisson de plafond peint : fond bleu nuit nuagé, moulures en retrait
 * sur les bords, étoile dorée à huit branches au centre — à la manière
 * des plafonds peints des temples et basiliques romaines.
 */
export function cofferTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);

  // Fond bleu nuit nuagé
  const img = ctx.createImageData(size, size);
  const deep = hexToRgb("#27396b");
  const mid = hexToRgb("#3a4f8e");
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = px / size;
      const v = py / size;
      const n = fbm(u * 5 + 2.3, v * 5 + 7.1, 3);
      const c = mix(deep, mid, n);
      const i = (py * size + px) * 4;
      img.data[i] = c.r;
      img.data[i + 1] = c.g;
      img.data[i + 2] = c.b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Moulures en retrait : cadres successifs, du clair au sombre
  const frames: Array<[number, string, number]> = [
    [0.02, "rgba(190, 175, 140, 0.5)", size * 0.014],
    [0.055, "rgba(20, 16, 10, 0.55)", size * 0.012],
    [0.085, "rgba(150, 130, 90, 0.35)", size * 0.008],
  ];
  for (const [inset, style, width] of frames) {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    const o = size * inset;
    ctx.strokeRect(o, o, size - o * 2, size - o * 2);
  }

  // Étoile dorée à huit branches
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.2;
  const inner = size * 0.075;
  ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const r = k % 2 === 0 ? outer : inner;
    const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const gold = ctx.createRadialGradient(cx, cy, 2, cx, cy, outer);
  gold.addColorStop(0, "#e8cd9c");
  gold.addColorStop(0.6, "#c9a36a");
  gold.addColorStop(1, "#8a6a3c");
  ctx.fillStyle = gold;
  ctx.fill();
  // Points dorés aux écoinçons
  ctx.fillStyle = "rgba(201, 163, 106, 0.8)";
  const m = size * 0.16;
  for (const [px, py] of [
    [m, m],
    [size - m, m],
    [m, size - m],
    [size - m, size - m],
  ]) {
    ctx.beginPath();
    ctx.arc(px, py, size * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }

  return toTexture(canvas, true, false);
}

/**
 * Panneau de fresque pompéienne : champ rouge profond nuagé, plinthe
 * sombre, cadre noir à filets dorés et médaillon de laurier au centre —
 * décor du vestibule d'entrée de la galerie.
 */
export function frescoPanelTexture(width = 384, height = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(width, height);

  // Champ rouge nuancé
  const img = ctx.createImageData(width, height);
  const red = hexToRgb("#82352a");
  const redDark = hexToRgb("#5e241d");
  const redLight = hexToRgb("#9c4534");
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const u = px / width;
      const v = py / height;
      const n = fbm(u * 4 + 9.2, v * 5.3 + 4.4, 4);
      let c = mix(red, redLight, Math.max(0, n - 0.5) * 1.4);
      c = mix(c, redDark, Math.max(0, 0.5 - n) * 1.2 + v * 0.18);
      const i = (py * width + px) * 4;
      img.data[i] = c.r;
      img.data[i + 1] = c.g;
      img.data[i + 2] = c.b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Cadre noir et filets dorés
  ctx.strokeStyle = "#1c120c";
  ctx.lineWidth = width * 0.05;
  ctx.strokeRect(width * 0.025, height * 0.02, width * 0.95, height * 0.96);
  ctx.strokeStyle = "rgba(201, 163, 106, 0.85)";
  ctx.lineWidth = width * 0.008;
  ctx.strokeRect(width * 0.07, height * 0.055, width * 0.86, height * 0.89);
  ctx.strokeStyle = "rgba(201, 163, 106, 0.4)";
  ctx.lineWidth = width * 0.004;
  ctx.strokeRect(width * 0.1, height * 0.078, width * 0.8, height * 0.844);

  // Médaillon de laurier
  const cx = width / 2;
  const cy = height * 0.46;
  const r = width * 0.16;
  ctx.strokeStyle = "rgba(201, 163, 106, 0.9)";
  ctx.lineWidth = width * 0.012;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Feuilles : traits obliques le long du cercle
  ctx.lineWidth = width * 0.006;
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * (r - width * 0.022);
    const y1 = cy + Math.sin(a) * (r - width * 0.022);
    const x2 = cx + Math.cos(a + 0.18) * (r + width * 0.03);
    const y2 = cy + Math.sin(a + 0.18) * (r + width * 0.03);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(201, 163, 106, 0.65)";
  ctx.beginPath();
  ctx.arc(cx, cy, width * 0.02, 0, Math.PI * 2);
  ctx.fill();

  return toTexture(canvas, true, false);
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

function drawInscription(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, text: string) {
  const family =
    (typeof document !== "undefined" &&
      getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim()) ||
    "";
  const fontStack = family ? `${family}, Georgia, serif` : "Georgia, serif";
  let fontSize = canvas.height * 0.56;
  let tracking = fontSize * 0.5;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // Lettrage espacé, centré (interlettrage manuel : fiable partout)
  const chars = Array.from(text);
  const measure = () => {
    ctx.font = `700 ${fontSize}px ${fontStack}`;
    const list = chars.map((c) => ctx.measureText(c).width);
    return { list, total: list.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1) };
  };
  let { list: widths, total } = measure();
  // Auto-ajustement : on réduit la taille pour que TOUT le texte tienne dans
  // le canevas (sinon les lettres de bord — le H et le dernier M — débordaient
  // et disparaissaient).
  const maxWidth = canvas.width * 0.92;
  if (total > maxWidth) {
    const fit = maxWidth / total;
    fontSize *= fit;
    tracking *= fit;
    ({ list: widths, total } = measure());
  }
  ctx.font = `700 ${fontSize}px ${fontStack}`;
  const startX = (canvas.width - total) / 2;
  const cy = canvas.height / 2;

  // Trois passes : creux sombre, rehaut clair, lettre dorée — effet gravé
  const passes: Array<[number, string]> = [
    [5, "rgba(0,0,0,0.72)"],
    [-3, "rgba(255,246,214,0.42)"],
  ];
  for (const [dy, style] of passes) {
    ctx.fillStyle = style;
    let x = startX;
    chars.forEach((c, i) => {
      ctx.fillText(c, x, cy + dy);
      x += widths[i] + tracking;
    });
  }
  const gold = ctx.createLinearGradient(0, cy - fontSize / 2, 0, cy + fontSize / 2);
  gold.addColorStop(0, "#ecca84");
  gold.addColorStop(0.5, "#cda25c");
  gold.addColorStop(1, "#a87f43");
  ctx.fillStyle = gold;
  let x = startX;
  chars.forEach((c, i) => {
    ctx.fillText(c, x, cy);
    x += widths[i] + tracking;
  });
}

/**
 * Inscription monumentale gravée, rendue sur canvas et plaquée sur la
 * frise — entièrement dans la scène WebGL : elle apparaît et disparaît
 * exactement avec le temple (contrairement à un élément DOM superposé).
 * Redessinée quand les polices web sont prêtes.
 */
export function inscriptionTexture(text: string, width = 2048, height = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(width, height);
  drawInscription(canvas, ctx, text);
  const texture = toTexture(canvas, true, false);
  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(() => {
      drawInscription(canvas, ctx, text);
      texture.needsUpdate = true;
    });
  }
  return texture;
}

function fontFamily(variable: string): string {
  const v =
    (typeof document !== "undefined" &&
      getComputedStyle(document.documentElement).getPropertyValue(variable).trim()) ||
    "";
  return v ? `${v}, Georgia, serif` : "Georgia, serif";
}

/** Texte centré à interlettrage manuel (fiable sur tous les navigateurs). */
function fillTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  tracking: number
) {
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = "center";
}

/** Découpe un titre en lignes tenant dans `maxWidth` (2 lignes max, ellipse). */
function wrapTitle(ctx: CanvasRenderingContext2D, title: string, maxWidth: number): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === 2) break;
    } else {
      line = test;
    }
  }
  if (lines.length < 2 && line) lines.push(line);
  if (lines.length === 2 && ctx.measureText(lines[1]).width > maxWidth) {
    let s = lines[1];
    while (s && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
    lines[1] = `${s}…`;
  }
  return lines.slice(0, 2);
}

function drawCartel(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  roman: string,
  title: string,
  date: string
) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Fond parchemin patiné
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#f1ead8");
  bg.addColorStop(1, "#dcd0b4");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const grain = ctx.createImageData(w, h);
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = 235 + Math.floor(Math.random() * 18);
    grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = n;
    grain.data[i + 3] = 12;
  }
  ctx.putImageData(grain, 0, 0);
  ctx.fillStyle = bg;
  ctx.globalAlpha = 0.82;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  // Double filet doré gravé
  ctx.strokeStyle = "#9a7a45";
  ctx.lineWidth = Math.max(2, w * 0.008);
  ctx.strokeRect(w * 0.04, h * 0.06, w * 0.92, h * 0.88);
  ctx.strokeStyle = "rgba(154, 122, 69, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.065, h * 0.1, w * 0.87, h * 0.8);

  const display = fontFamily("--font-display");
  const accent = fontFamily("--font-accent");

  // ŒUVRE + chiffre romain
  ctx.fillStyle = "#7a5a2c";
  ctx.font = `600 ${Math.round(h * 0.115)}px ${display}`;
  ctx.textBaseline = "middle";
  fillTracked(ctx, `ŒUVRE ${roman}`, w / 2, h * 0.24, h * 0.05);

  // Filet de séparation
  ctx.strokeStyle = "rgba(138, 106, 60, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.34);
  ctx.lineTo(w * 0.68, h * 0.34);
  ctx.stroke();

  // Titre (1–2 lignes)
  ctx.fillStyle = "#2c2317";
  ctx.font = `700 ${Math.round(h * 0.18)}px ${display}`;
  const lines = wrapTitle(ctx, title.toUpperCase(), w * 0.88);
  const titleY = lines.length === 1 ? h * 0.53 : h * 0.45;
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, titleY + i * h * 0.2);
  });

  // Date en italique
  ctx.fillStyle = "#6f5a3a";
  ctx.font = `italic 400 ${Math.round(h * 0.12)}px ${accent}`;
  ctx.fillText(date, w / 2, h * 0.82);
}

/**
 * Cartel d'œuvre gravé sur canvas (numéro romain, titre, date) — plaqué
 * sur un panneau dans la scène WebGL : il apparaît et disparaît avec le
 * couloir, sans la latence ni le rectangle fantôme d'un calque DOM.
 * Redessiné quand les polices web sont prêtes.
 */
export function cartelTexture(
  roman: string,
  title: string,
  date: string,
  width = 896,
  height = 560
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(width, height);
  drawCartel(canvas, ctx, roman, title, date);
  const texture = toTexture(canvas, true, false);
  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(() => {
      drawCartel(canvas, ctx, roman, title, date);
      texture.needsUpdate = true;
    });
  }
  return texture;
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

/**
 * Ciel de nébuleuse plaqué sur le dôme céleste : vastes nappes de gaz chaud
 * (ocre → tan clair) creusées de voies de poussière brune, un grand cœur
 * lumineux bleu acier calé vers la vue par défaut (−Z, le temple), un voile
 * bleuté en haut et un fond spatial profond. Recrée l'aspect d'une
 * photographie de nébuleuse de la Voie lactée — sans aucun fichier externe.
 * Le semis d'étoiles dense est fourni à part par les points 3D (Stars), qui
 * restent nets et parallaxés.
 *
 * Carte équirectangulaire : u = azimut (≈0,75 → direction du temple),
 * v = du zénith (0) au nadir (1) ; après flipY, le haut du canevas est le
 * zénith. La nébuleuse couvre tout le ciel pour qu'aucune direction ne
 * paraisse vide, mais culmine dans la bande mi-haute que cadre la caméra.
 */
export function nebulaSkyTexture(width = 1536, height = 768): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  // Palette relevée sur la photographie : du noir spatial aux émissions
  // chaudes (rouge Hα → orange → tan → crêtes crème), poussières sombres,
  // régions de réflexion bleues et un soupçon d'émission rosée.
  const space = hexToRgb("#03040a"); // fond spatial profond
  const warmDeep = hexToRgb("#2a1808"); // lueur brune des "vides"
  const ember = hexToRgb("#7e3015"); // émission rouge profonde
  const orange = hexToRgb("#c46a2c"); // gaz chaud
  const tan = hexToRgb("#e2a05f"); // nappes éclairées
  const cream = hexToRgb("#f7dca6"); // crêtes les plus vives
  const dust = hexToRgb("#120a05"); // voies de poussière sombres
  const pinkEmis = hexToRgb("#7c3f63"); // émission rosée discrète
  const topHaze = hexToRgb("#243454"); // léger voile froid du haut
  const blueReflect = hexToRgb("#4a6e9c"); // halo bleu de réflexion
  const blueBright = hexToRgb("#cfe0f6"); // noyau lumineux bleu

  const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

  for (let py = 0; py < height; py++) {
    const v = py / height;
    for (let px = 0; px < width; px++) {
      const u = px / width;

      // Déformation du domaine : tord les nappes en volutes turbulentes.
      const wx = fbm(u * 2 + 3.1, v * 2 + 1.7, 4) - 0.5;
      const wy = fbm(u * 2 + 8.3, v * 2 + 5.2, 4) - 0.5;
      const su = u + wx * 0.34;
      const sv = v + wy * 0.34;

      // Densité de gaz multi-échelle (grandes masses → grain fin).
      const big = fbm(su * 5 + 21, sv * 5 + 7, 6);
      const mid = fbm(su * 12 + 10, sv * 12 + 4, 5);
      const fine = fbm(su * 27 + 20, sv * 27 + 9, 4);
      const density = big * 0.6 + mid * 0.28 + fine * 0.18;

      // Filaments lumineux et veines de poussière : crêtes de bruit « ridé »
      // (là où la turbulence est minimale) → tendons fins, pas des taches.
      const filament = Math.pow(Math.max(0, 1 - turbulence(su * 15 + 5, sv * 15 + 2, 5) * 1.2), 2.2);
      const dustRidge = Math.pow(Math.max(0, 1 - turbulence(su * 19 + 31, sv * 19 + 13, 5) * 1.15), 2.4);

      // Enveloppe verticale : nébuleuse chaude présente sur tout le ciel.
      const vWin = Math.max(0.42, Math.min(1, 1.22 - Math.abs(v - 0.42) * 0.9));
      const warm = clamp01((density - 0.4) * 2.4) * vWin;

      // Empilement des émissions chaudes : fond brun visible partout, puis
      // rouge → orange → tan → crêtes crème là où le gaz se densifie.
      let c = mix(space, warmDeep, clamp01(0.32 + density * 0.85) * vWin * 0.9);
      c = mix(c, ember, warm * 0.6);
      c = mix(c, orange, clamp01(warm * (0.45 + mid)) * 0.95);
      c = mix(c, tan, clamp01(warm * (0.35 + filament)));
      c = mix(c, cream, clamp01((warm * filament - 0.3) * 2.4));
      c = mix(c, pinkEmis, clamp01((warm - 0.6) * 1.2) * 0.2);
      // Poussières sombres : veines nettes qui découpent le gaz.
      c = mix(c, dust, Math.min(0.85, clamp01(dustRidge - 0.12) * (0.4 + warm) * 1.25));

      // Très léger voile froid tout en haut du ciel seulement.
      const topAmt = Math.max(0, 0.22 - v) * 1.2 * (0.3 + 0.5 * big);
      c = mix(c, topHaze, Math.min(0.18, topAmt));

      // Cœur de réflexion bleu : knot lumineux LOCALISÉ, légèrement décentré,
      // calé vers la vue par défaut (−Z, le temple). Volontairement petit et
      // modéré, pour ne pas saturer en un halo de bloom géant.
      let dau = Math.abs(u - 0.72);
      if (dau > 0.5) dau = 1 - dau;
      const gx = (dau - wx * 0.04) / 0.05;
      const gy = (v - 0.43) / 0.07;
      const core1 = Math.exp(-(gx * gx + gy * gy)) * (0.6 + 0.5 * big);
      // Petite tache secondaire discrète, hors de la vue principale.
      let dau2 = Math.abs(u - 0.26);
      if (dau2 > 0.5) dau2 = 1 - dau2;
      const gx2 = dau2 / 0.06;
      const gy2 = (v - 0.5) / 0.08;
      const core2 = Math.exp(-(gx2 * gx2 + gy2 * gy2)) * (0.35 + 0.5 * mid) * 0.45;
      c = mix(c, blueReflect, Math.min(0.68, Math.max(core1, core2)));
      // Petit noyau vif au centre du cœur : il pétille (et prend un soupçon
      // de bloom) sans étaler un grand halo.
      const nucleus = Math.exp(-(Math.pow(dau / 0.02, 2) + Math.pow((v - 0.43) / 0.028, 2)));
      const glow =
        Math.pow(core1, 2.2) * 0.55 + Math.pow(core2, 2.2) * 0.25 + nucleus * (0.5 + 0.4 * big);
      c = {
        r: c.r + blueBright.r * glow,
        g: c.g + blueBright.g * glow,
        b: c.b + blueBright.b * glow,
      };

      const i = (py * width + px) * 4;
      data[i] = Math.min(255, c.r);
      data[i + 1] = Math.min(255, c.g);
      data[i + 2] = Math.min(255, c.b);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(canvas, true, false);
}

/**
 * Étoile brillante avec aigrettes de diffraction : noyau rond éclatant et
 * croix à quatre branches (plus deux diagonales discrètes), comme les
 * étoiles les plus vives d'une astrophotographie. Blanche et additive — la
 * teinte vient de la couleur du point ; le bloom de la scène l'amplifie.
 */
export function starGlintTexture(size = 128): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const c = size / 2;
  ctx.globalCompositeOperation = "lighter";

  // Noyau lumineux
  const core = ctx.createRadialGradient(c, c, 0, c, c, size * 0.18);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(0.45, "rgba(255,255,255,0.55)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  // Aigrettes : fuseaux fondus rayonnant du centre.
  const spike = (angle: number, len: number, halfWidth: number, alpha: number) => {
    for (const dir of [1, -1]) {
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(angle);
      const g = ctx.createLinearGradient(0, 0, dir * len, 0);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -halfWidth);
      ctx.lineTo(dir * len, 0);
      ctx.lineTo(0, halfWidth);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };
  spike(0, size * 0.46, size * 0.012, 0.9);
  spike(Math.PI / 2, size * 0.46, size * 0.012, 0.9);
  spike(Math.PI / 4, size * 0.28, size * 0.007, 0.32);
  spike(-Math.PI / 4, size * 0.28, size * 0.007, 0.32);

  ctx.globalCompositeOperation = "source-over";
  return toTexture(canvas, false, false);
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
      const waver =
        (fbm(u * 3 + 7.7, h * 5.2 + 1.3, 3) - 0.5) * 0.16 * h +
        (fbm(u * 7 + 2.1, h * 11 + 4.4, 2) - 0.5) * 0.07 * h * h;
      const d = Math.abs(u - waver) / Math.max(width, 0.001);
      let a = Math.max(0, 1 - d);
      a = Math.pow(a, 1.5) * Math.pow(Math.min(1, h * 6), 1.2);
      // Vacuoles : petites respirations sombres dans le corps de la flamme
      a *= 0.78 + 0.22 * fbm(u * 9 + 3.3, h * 7 - 1.7, 3);
      const core = Math.pow(a, 2.6) * (1 - h * 0.3);

      const i = (py * size + px) * 4;
      // Cœur blanc-jaune → corps orange → pointe rouge
      data[i] = 255;
      data[i + 1] = Math.min(255, Math.round(96 + core * 150 + a * 40 - h * 30));
      data[i + 2] = Math.min(255, Math.round(20 + core * 225 - h * 12));
      data[i + 3] = Math.round(Math.min(1, a * 1.3) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(canvas, true, false);
}
