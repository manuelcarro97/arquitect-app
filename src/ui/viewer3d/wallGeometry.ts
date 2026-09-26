import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { CM_TO_M } from './scene';
import type { WallPiece } from './wallPieces';

/**
 * Material slot of each face, the same order Three.js uses for boxes (+x, -x, +y, -y, +z, -z)
 * so wall faces keep their meaning: 4 is face A (towards the wall normal), 5 is face B.
 */
export const WALL_FACE = { end: 0, start: 1, top: 2, bottom: 3, A: 4, B: 5 } as const;

interface UvAxes {
  /** Which coordinates of the vertex become u and v (in metres, so textures keep their real size). */
  uv: (p: Vector3) => [number, number];
}

const MIN_AREA = 1e-10;

/**
 * Solid block of a wall in the wall's own axes (metres): x along the wall from its start, y up,
 * z towards face A. Faces A and B can have different lengths, so the ends may be cut at an angle.
 * UVs are in metres along the wall, so a finish continues without jumps across blocks.
 */
export function wallPieceGeometry(piece: WallPiece, thicknessCm: number): BufferGeometry {
  const h = (thicknessCm / 2) * CM_TO_M;
  const [y0, y1] = [piece.bottom * CM_TO_M, piece.top * CM_TO_M];
  const [aFrom, aTo, bFrom, bTo] = [piece.fromA, piece.toA, piece.fromB, piece.toB].map((cm) => cm * CM_TO_M);
  const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

  // Footprint corners at a given height: face A start/end, face B end/start.
  const ring = (y: number) => [v(aFrom, y, h), v(aTo, y, h), v(bTo, y, -h), v(bFrom, y, -h)];
  const [low, high] = [ring(y0), ring(y1)];
  const center = v((aFrom + aTo + bFrom + bTo) / 4, (y0 + y1) / 2, 0);

  const along: UvAxes = { uv: (p) => [p.x, p.y] };
  const alongMirrored: UvAxes = { uv: (p) => [-p.x, p.y] };
  const across: UvAxes = { uv: (p) => [p.z, p.y] };
  const plan: UvAxes = { uv: (p) => [p.x, p.z] };

  const faces: { slot: number; corners: Vector3[]; axes: UvAxes }[] = [
    { slot: WALL_FACE.end, corners: [low[1], low[2], high[2], high[1]], axes: across },
    { slot: WALL_FACE.start, corners: [low[3], low[0], high[0], high[3]], axes: across },
    { slot: WALL_FACE.top, corners: high, axes: plan },
    { slot: WALL_FACE.bottom, corners: low, axes: plan },
    { slot: WALL_FACE.A, corners: [low[0], low[1], high[1], high[0]], axes: along },
    { slot: WALL_FACE.B, corners: [low[2], low[3], high[3], high[2]], axes: alongMirrored },
  ];

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const geometry = new BufferGeometry();

  for (const { slot, corners, axes } of faces) {
    const normal = new Vector3()
      .subVectors(corners[1], corners[0])
      .cross(new Vector3().subVectors(corners[2], corners[0]));
    if (normal.lengthSq() < MIN_AREA) {
      // First triangle may be degenerate (a corner cut to a point): try the other diagonal.
      normal.subVectors(corners[2], corners[0]).cross(new Vector3().subVectors(corners[3], corners[0]));
    }
    if (normal.lengthSq() < MIN_AREA) continue; // zero-size face (e.g. a face cut away completely)
    normal.normalize();

    // Faces must be wound counter-clockwise seen from outside, or they would be invisible from outside.
    const faceCenter = corners.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(4);
    const ordered = normal.dot(faceCenter.sub(center)) >= 0 ? corners : [...corners].reverse();
    if (ordered !== corners) normal.negate();

    const first = positions.length / 3;
    for (const [i, j, k] of [
      [0, 1, 2],
      [0, 2, 3],
    ]) {
      for (const p of [ordered[i], ordered[j], ordered[k]]) {
        positions.push(p.x, p.y, p.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(...axes.uv(p));
      }
    }
    geometry.addGroup(first, 6, slot);
  }

  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  return geometry;
}
