/**
 * Bruit de valeur + FBM (fractal brownian motion) déterministes,
 * utilisés pour générer des textures de pierre réalistes sur canvas.
 */

const PERM = new Uint8Array(512);
(() => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  let seed = 1789;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
  }
})();

function hash(x: number, y: number): number {
  return PERM[(PERM[x & 255] + y) & 255] / 255;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Bruit de valeur 2D, dans [0, 1]. */
export function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const tl = hash(xi, yi);
  const tr = hash(xi + 1, yi);
  const bl = hash(xi, yi + 1);
  const br = hash(xi + 1, yi + 1);
  const u = smooth(xf);
  const v = smooth(yf);
  const top = tl + (tr - tl) * u;
  const bottom = bl + (br - bl) * u;
  return top + (bottom - top) * v;
}

/** Somme fractale d'octaves de bruit, dans [0, 1]. */
export function fbm(x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * frequency, y * frequency) * amplitude;
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / norm;
}

/** Turbulence (valeur absolue repliée), utile pour les veines. */
export function turbulence(x: number, y: number, octaves = 4): number {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += Math.abs(valueNoise(x * frequency, y * frequency) * 2 - 1) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / norm;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const value = parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.min(1, Math.max(0, t));
  return {
    r: a.r + (b.r - a.r) * k,
    g: a.g + (b.g - a.g) * k,
    b: a.b + (b.b - a.b) * k,
  };
}

/**
 * Construit les cartes d'un matériau en évaluant `shader(u, v)` pour chaque
 * pixel (u, v dans [0, 1]) → [couleur, hauteur, rugosité]. Le champ de
 * hauteur est ensuite converti en véritable **carte de normales** tangentes
 * par filtre de Sobel (avec enroulement aux bords) : la lumière accroche la
 * surface bien plus finement qu'avec un simple relief grayscale. `strength`
 * règle l'amplitude (pierre brute élevée, marbre poli faible).
 */
export function bakeSurface(
  size: number,
  shader: (u: number, v: number) => { color: RGB; bump: number; rough: number },
  strength = 2.2
): { color: HTMLCanvasElement; normal: HTMLCanvasElement; rough: HTMLCanvasElement } {
  const colorCanvas = document.createElement("canvas");
  const normalCanvas = document.createElement("canvas");
  const roughCanvas = document.createElement("canvas");
  colorCanvas.width = colorCanvas.height = size;
  normalCanvas.width = normalCanvas.height = size;
  roughCanvas.width = roughCanvas.height = size;

  const colorCtx = colorCanvas.getContext("2d") as CanvasRenderingContext2D;
  const normalCtx = normalCanvas.getContext("2d") as CanvasRenderingContext2D;
  const roughCtx = roughCanvas.getContext("2d") as CanvasRenderingContext2D;

  const colorData = colorCtx.createImageData(size, size);
  const normalData = normalCtx.createImageData(size, size);
  const roughData = roughCtx.createImageData(size, size);

  // Champ de hauteur, conservé pour en dériver les normales.
  const height = new Float32Array(size * size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      const { color, bump, rough } = shader(px / size, py / size);
      colorData.data[i] = color.r;
      colorData.data[i + 1] = color.g;
      colorData.data[i + 2] = color.b;
      colorData.data[i + 3] = 255;
      height[py * size + px] = bump;
      const roughValue = Math.min(255, Math.max(0, rough * 255));
      roughData.data[i] = roughData.data[i + 1] = roughData.data[i + 2] = roughValue;
      roughData.data[i + 3] = 255;
    }
  }

  // Normales par opérateur de Sobel, avec enroulement (textures répétables).
  const at = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx =
        (at(px + 1, py - 1) + 2 * at(px + 1, py) + at(px + 1, py + 1) -
          at(px - 1, py - 1) - 2 * at(px - 1, py) - at(px - 1, py + 1)) *
        strength;
      const dy =
        (at(px - 1, py + 1) + 2 * at(px, py + 1) + at(px + 1, py + 1) -
          at(px - 1, py - 1) - 2 * at(px, py - 1) - at(px + 1, py - 1)) *
        strength;
      let nx = -dx;
      let ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      const i = (py * size + px) * 4;
      normalData.data[i] = (nx * 0.5 + 0.5) * 255;
      normalData.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      normalData.data[i + 2] = (nz / len) * 127.5 + 127.5;
      normalData.data[i + 3] = 255;
    }
  }

  colorCtx.putImageData(colorData, 0, 0);
  normalCtx.putImageData(normalData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);
  return { color: colorCanvas, normal: normalCanvas, rough: roughCanvas };
}
