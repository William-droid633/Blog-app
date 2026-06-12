import * as THREE from "three";

/**
 * Textures procédurales générées sur canvas (côté client uniquement) :
 * marbre veiné, travertin, dallage, cannelures de colonnes, faisceaux
 * de lumière. Aucun fichier externe à charger — réalisme sans réseau.
 */

function makeCanvas(width: number, height = width): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  return [canvas, ctx];
}

function asTexture(canvas: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function grain(ctx: CanvasRenderingContext2D, size: number, amount: number, alpha: number) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < amount; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** Marbre clair veiné — colonnes, frontons, encadrements. */
export function marbleTexture(base = "#d9d2c0", vein = "#9a8f76", size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, base);
  grad.addColorStop(0.45, "#cfc7b2");
  grad.addColorStop(1, base);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = vein;
  for (let i = 0; i < 16; i++) {
    ctx.globalAlpha = 0.06 + Math.random() * 0.12;
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.beginPath();
    let x = Math.random() * size;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < size) {
      x += (Math.random() - 0.5) * 70;
      y += 18 + Math.random() * 45;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  grain(ctx, size, 5000, 0.045);

  return asTexture(canvas);
}

/** Travertin — murs du couloir, strates horizontales et pores. */
export function travertineTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);

  ctx.fillStyle = "#cfc4ab";
  ctx.fillRect(0, 0, size, size);

  // Strates horizontales
  for (let y = 0; y < size; y += 6 + Math.random() * 14) {
    ctx.globalAlpha = 0.05 + Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.5 ? "#b9ad92" : "#ddd3bc";
    ctx.fillRect(0, y, size, 3 + Math.random() * 8);
  }
  // Pores de la pierre
  ctx.fillStyle = "#8f8469";
  for (let i = 0; i < 900; i++) {
    ctx.globalAlpha = 0.05 + Math.random() * 0.12;
    const w = 1 + Math.random() * 5;
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, w, w * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  grain(ctx, size, 4000, 0.04);

  return asTexture(canvas);
}

/** Dallage de marbre en damier patiné — sols. */
export function floorTexture(size = 1024): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const tiles = 4;
  const tile = size / tiles;

  for (let i = 0; i < tiles; i++) {
    for (let j = 0; j < tiles; j++) {
      const dark = (i + j) % 2 === 0;
      const gradient = ctx.createLinearGradient(i * tile, j * tile, (i + 1) * tile, (j + 1) * tile);
      if (dark) {
        gradient.addColorStop(0, "#3a3127");
        gradient.addColorStop(0.5, "#2c251d");
        gradient.addColorStop(1, "#423828");
      } else {
        gradient.addColorStop(0, "#cdc3a9");
        gradient.addColorStop(0.5, "#bfb499");
        gradient.addColorStop(1, "#d8cfb6");
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(i * tile, j * tile, tile, tile);

      // Veines discrètes par dalle
      ctx.strokeStyle = dark ? "#574a39" : "#a2967c";
      for (let v = 0; v < 3; v++) {
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        let x = i * tile + Math.random() * tile;
        let y = j * tile;
        ctx.moveTo(x, y);
        while (y < (j + 1) * tile) {
          x += (Math.random() - 0.5) * 24;
          y += 10 + Math.random() * 20;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Joints
      ctx.strokeStyle = "#1c1812";
      ctx.lineWidth = 3;
      ctx.strokeRect(i * tile, j * tile, tile, tile);
    }
  }
  grain(ctx, size, 9000, 0.03);

  return asTexture(canvas);
}

/** Cannelures de colonne (carte de relief, niveaux de gris). */
export function fluteTexture(stripes = 8, size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size, 64);
  const stripeWidth = size / stripes;

  for (let i = 0; i < stripes; i++) {
    const gradient = ctx.createLinearGradient(i * stripeWidth, 0, (i + 1) * stripeWidth, 0);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, "#5a5a5a");
    gradient.addColorStop(1, "#ffffff");
    ctx.fillStyle = gradient;
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, 64);
  }

  const texture = asTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

/** Faisceau de lumière conique (alpha), pour les éclairages de tableaux. */
export function lightBeamTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "rgba(255, 232, 190, 0.55)");
  gradient.addColorStop(0.6, "rgba(255, 232, 190, 0.12)");
  gradient.addColorStop(1, "rgba(255, 232, 190, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Adoucit les bords latéraux
  const side = ctx.createLinearGradient(0, 0, size, 0);
  side.addColorStop(0, "rgba(0,0,0,1)");
  side.addColorStop(0.25, "rgba(0,0,0,0)");
  side.addColorStop(0.75, "rgba(0,0,0,0)");
  side.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";

  const texture = asTexture(canvas, false);
  return texture;
}

/** Œuvre de remplacement quand un article n'a pas d'image de couverture. */
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

  return asTexture(canvas, false);
}

/** Ciel étoilé : positions aléatoires sur un grand dôme. */
export function starPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.9); // concentre vers le zénith
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  return positions;
}
