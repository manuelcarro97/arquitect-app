export type Id = string;
export type MaterialId = string;

export interface Point {
  x: number;
  y: number;
}

export interface WallProps {
  thickness: number;
  height: number;
  finishA?: MaterialId;
  finishB?: MaterialId;
}

/** A perimeter wall expressed as a "turtle" step from the previous corner. */
export interface PerimeterSegment extends WallProps {
  id: Id;
  length: number;
  angle: number;
  /** Reserved for curved walls (post-MVP). Absent = straight wall. */
  arc?: { bulge: number };
}

export interface Perimeter {
  start: Point;
  segments: PerimeterSegment[];
}

export interface Partition extends WallProps {
  id: Id;
  a: Point;
  b: Point;
}

export type OpeningType = 'door' | 'window';

export interface Opening {
  id: Id;
  wallId: Id;
  type: OpeningType;
  /** Distance from the wall start to the opening's near edge. */
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
}

export interface Furniture {
  id: Id;
  catalogId: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
}

export interface Zone {
  id: Id;
  name: string;
  color: string;
  points: Point[];
  floorFinish?: MaterialId;
}

export interface Floor {
  perimeter: Perimeter;
  partitions: Partition[];
  openings: Opening[];
  furniture: Furniture[];
  zones: Zone[];
}

export interface Version {
  id: Id;
  name: string;
  createdAt: string;
  floor: Floor;
}

export interface Project {
  id: Id;
  name: string;
  versions: Version[];
}

export type WallKind = 'perimeter' | 'partition';

/** Unified, derived view of any wall, used by renderers and openings. */
export interface WallGeometry extends WallProps {
  id: Id;
  kind: WallKind;
  start: Point;
  end: Point;
  length: number;
}
