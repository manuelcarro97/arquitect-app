import type { Point } from './types';

/** Tolerance in cm for floating point comparisons. */
export const EPSILON = 1e-6;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function normalizeAngle(degrees: number): number {
  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

/** Unit vector for an angle. 0° = +x (right), 90° = +y (down on screen). */
export function direction(angleDegrees: number): Point {
  const radians = toRadians(angleDegrees);
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

export function pointFromPolar(origin: Point, length: number, angleDegrees: number): Point {
  const unit = direction(angleDegrees);
  return { x: origin.x + unit.x * length, y: origin.y + unit.y * length };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function angleBetween(from: Point, to: Point): number {
  return normalizeAngle(toDegrees(Math.atan2(to.y - from.y, to.x - from.x)));
}

/** Shoelace formula. Returns the absolute area in cm². */
export function polygonArea(points: Point[]): number {
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(twiceArea) / 2;
}

export function squareCmToSquareM(areaCm2: number): number {
  return areaCm2 / 10_000;
}

/** Z component of (a - origin) × (b - origin). Sign tells the turn direction. */
function cross(origin: Point, a: Point, b: Point): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Parameter t of the projection of p onto segment ab (0 = a, 1 = b). */
function projectionParameter(p: Point, a: Point, b: Point): number {
  const lengthSquared = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (lengthSquared < EPSILON) return 0;
  return ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / lengthSquared;
}

export function pointOnSegment(p: Point, a: Point, b: Point): boolean {
  const segmentLength = distance(a, b);
  if (segmentLength < EPSILON) return distance(p, a) < EPSILON;
  const perpendicularDistance = Math.abs(cross(a, b, p)) / segmentLength;
  if (perpendicularDistance > EPSILON) return false;
  const t = projectionParameter(p, a, b);
  return t >= -EPSILON && t <= 1 + EPSILON;
}

/** Ray casting. Points on the boundary count as inside. */
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  for (let i = 0; i < polygon.length; i++) {
    if (pointOnSegment(p, polygon[i], polygon[(i + 1) % polygon.length])) return true;
  }
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const straddles = a.y > p.y !== b.y > p.y;
    if (straddles && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** True only when the segments cross at a point interior to both (touching does not count). */
export function segmentsProperlyIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  const opposite = (u: number, v: number) => (u > EPSILON && v < -EPSILON) || (u < -EPSILON && v > EPSILON);
  return opposite(d1, d2) && opposite(d3, d4);
}

/** True when every point of segment ab lies inside the polygon or on its boundary. */
export function segmentInsidePolygon(a: Point, b: Point, polygon: Point[]): boolean {
  if (!pointInPolygon(a, polygon) || !pointInPolygon(b, polygon)) return false;

  for (let i = 0; i < polygon.length; i++) {
    if (segmentsProperlyIntersect(a, b, polygon[i], polygon[(i + 1) % polygon.length])) return false;
  }

  // The segment may still leave the polygon by passing exactly through vertices.
  // Split it at every vertex it touches and check each piece's midpoint.
  const cuts = [0, 1];
  for (const vertex of polygon) {
    if (pointOnSegment(vertex, a, b)) cuts.push(projectionParameter(vertex, a, b));
  }
  cuts.sort((x, y) => x - y);
  for (let i = 0; i < cuts.length - 1; i++) {
    if (cuts[i + 1] - cuts[i] < EPSILON) continue;
    const midpoint = lerp(a, b, (cuts[i] + cuts[i + 1]) / 2);
    if (!pointInPolygon(midpoint, polygon)) return false;
  }
  return true;
}

export function closestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const t = Math.min(1, Math.max(0, projectionParameter(p, a, b)));
  return lerp(a, b, t);
}

/**
 * Distance along the ray origin + t·unitDirection (t > 0) where it crosses segment ab, or null if it does not.
 */
export function rayHitsSegment(origin: Point, unitDirection: Point, a: Point, b: Point): number | null {
  const edge = { x: b.x - a.x, y: b.y - a.y };
  const denominator = unitDirection.x * edge.y - unitDirection.y * edge.x;
  if (Math.abs(denominator) < EPSILON) return null;
  const t = ((a.x - origin.x) * edge.y - (a.y - origin.y) * edge.x) / denominator;
  const s = ((a.x - origin.x) * unitDirection.y - (a.y - origin.y) * unitDirection.x) / denominator;
  if (t <= EPSILON || s < -EPSILON || s > 1 + EPSILON) return null;
  return t;
}

/** Intersection of the infinite lines p1 + t·d1 and p2 + s·d2, or null if parallel. */
export function lineIntersection(p1: Point, d1: Point, p2: Point, d2: Point): Point | null {
  const denominator = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denominator) < EPSILON) return null;
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denominator;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
}
