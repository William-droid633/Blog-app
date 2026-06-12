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
 * Construit un canvas en évaluant `shader(u, v)` pour chaque pixel
 * (u et v dans [0, 1]) — retourne [couleur, relief, rugosité].
 */
export function bakeSurface(
  size: number,
  shader: (u: number, v: number) => { color: RGB; bump: number; rough: number }
): { color: HTMLCanvasElement; bump: HTMLCanvasElement; rough: HTMLCanvasElement } {
  const colorCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  const roughCanvas = document.createElement("canvas");
  colorCanvas.width = colorCanvas.height = size;
  bumpCanvas.width = bumpCanvas.height = size;
  roughCanvas.width = roughCanvas.height = size;

  const colorCtx = colorCanvas.getContext("2d") as CanvasRenderingContext2D;
  const bumpCtx = bumpCanvas.getContext("2d") as CanvasRenderingContext2D;
  const roughCtx = roughCanvas.getContext("2d") as CanvasRenderingContext2D;

  const colorData = colorCtx.createImageData(size, size);
  const bumpData = bumpCtx.createImageData(size, size);
  const roughData = roughCtx.createImageData(size, size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      const { color, bump, rough } = shader(px / size, py / size);
      colorData.data[i] = color.r;
      colorData.data[i + 1] = color.g;
      colorData.data[i + 2] = color.b;
      colorData.data[i + 3] = 255;
      const bumpValue = Math.min(255, Math.max(0, bump * 255));
      bumpData.data[i] = bumpData.data[i + 1] = bumpData.data[i + 2] = bumpValue;
      bumpData.data[i + 3] = 255;
      const roughValue = Math.min(255, Math.max(0, rough * 255));
      roughData.data[i] = roughData.data[i + 1] = roughData.data[i + 2] = roughValue;
      roughData.data[i + 3] = 255;
    }
  }

  colorCtx.putImageData(colorData, 0, 0);
  bumpCtx.putImageData(bumpData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);
  return { color: colorCanvas, bump: bumpCanvas, rough: roughCanvas };
}
