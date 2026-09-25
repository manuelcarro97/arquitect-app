import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import type { MaterialInfo, Pattern } from '../materials/materials';

const PIXELS_PER_CM = 4;
const MAX_CANVAS_PX = 1024;

/** Real size (cm) of one repetition of the texture. */
export function patternUnitCm(pattern: Pattern): { width: number; height: number } {
  switch (pattern.type) {
    case 'tiles':
      return { width: pattern.tileWidth * 2, height: pattern.tileHeight * 2 };
    case 'planks':
      return { width: pattern.plankWidth * 4, height: pattern.plankLength };
    default:
      return { width: 100, height: 100 };
  }
}

/** Small deterministic random generator, so a material always looks the same. */
function seededRandom(seed: string): () => number {
  let state = [...seed].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function drawPattern(context: CanvasRenderingContext2D, material: MaterialInfo, width: number, height: number, scale: number) {
  const { pattern } = material;
  const random = seededRandom(material.id);
  context.fillStyle = material.color;
  context.fillRect(0, 0, width, height);

  if (pattern.type === 'tiles') {
    const tileW = pattern.tileWidth * scale;
    const tileH = pattern.tileHeight * scale;
    for (let row = 0; row < 2; row++) {
      for (let col = -1; col < 3; col++) {
        const x = col * tileW + (pattern.staggered && row % 2 === 1 ? tileW / 2 : 0);
        if (pattern.alternate && (row + col) % 2 === 0) {
          context.fillStyle = pattern.alternate;
          context.fillRect(x + tileW * 0.2, row * tileH + tileH * 0.2, tileW * 0.6, tileH * 0.6);
        }
        context.strokeStyle = pattern.grout;
        context.lineWidth = Math.max(2, 0.3 * scale);
        context.strokeRect(x, row * tileH, tileW, tileH);
      }
    }
  } else if (pattern.type === 'planks') {
    const plankW = pattern.plankWidth * scale;
    context.strokeStyle = pattern.joint;
    context.lineWidth = Math.max(1.5, 0.2 * scale);
    for (let i = 0; i < 4; i++) {
      // Slight tone change per plank and a joint at a random height.
      context.fillStyle = `rgba(0, 0, 0, ${random() * 0.08})`;
      context.fillRect(i * plankW, 0, plankW, height);
      context.beginPath();
      context.moveTo(i * plankW, 0);
      context.lineTo(i * plankW, height);
      const joint = random() * height;
      context.moveTo(i * plankW, joint);
      context.lineTo((i + 1) * plankW, joint);
      context.stroke();
    }
  } else if (pattern.type === 'speckle') {
    context.fillStyle = pattern.speckle;
    const dots = Math.round(width * height * 0.002 * pattern.density);
    for (let i = 0; i < dots; i++) {
      context.globalAlpha = 0.3 + random() * 0.5;
      context.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 3);
    }
    context.globalAlpha = 1;
  } else if (pattern.type === 'marble') {
    context.strokeStyle = pattern.vein;
    for (let i = 0; i < 6; i++) {
      context.globalAlpha = 0.25 + random() * 0.35;
      context.lineWidth = 1 + random() * 2.5;
      context.beginPath();
      let x = random() * width;
      let y = 0;
      context.moveTo(x, y);
      while (y < height) {
        x += (random() - 0.5) * 40;
        y += 20 + random() * 30;
        context.lineTo(x, y);
      }
      context.stroke();
    }
    context.globalAlpha = 1;
  }
}

const cache = new Map<string, Texture>();

/** Shared texture of a material (null for plain colours). One repetition = patternUnitCm. */
export function materialTexture(material: MaterialInfo): Texture | null {
  if (material.pattern.type === 'plain') return null;
  const cached = cache.get(material.id);
  if (cached) return cached;

  const unit = patternUnitCm(material.pattern);
  const scale = Math.min(PIXELS_PER_CM, MAX_CANVAS_PX / Math.max(unit.width, unit.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(unit.width * scale);
  canvas.height = Math.round(unit.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return null;
  drawPattern(context, material, canvas.width, canvas.height, scale);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  cache.set(material.id, texture);
  return texture;
}

/** Copy of the material texture repeated to cover `widthCm × heightCm` (for surfaces with 0..1 UVs). */
export function textureForSurface(material: MaterialInfo, widthCm: number, heightCm: number): Texture | null {
  const base = materialTexture(material);
  if (!base) return null;
  const unit = patternUnitCm(material.pattern);
  const texture = base.clone();
  texture.repeat.set(widthCm / unit.width, heightCm / unit.height);
  texture.needsUpdate = true;
  return texture;
}

/** Copy of the texture for geometry whose UVs are in metres (flat floor shapes). */
export function textureForMetreUVs(material: MaterialInfo): Texture | null {
  const base = materialTexture(material);
  if (!base) return null;
  const unit = patternUnitCm(material.pattern);
  const texture = base.clone();
  texture.repeat.set(100 / unit.width, 100 / unit.height);
  texture.needsUpdate = true;
  return texture;
}
