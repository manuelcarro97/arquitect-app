import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  appendClosingSegment,
  appendSegment,
  createProject,
  addEmptyVersion,
  addPerimeterOnlyVersion,
  duplicateVersion,
  findVersion,
  removeVersion,
  renameVersion,
  mergeCollinearPartitions,
  mergeCollinearSegments,
  moveSegment,
  ok,
  removeOpeningsOnWall,
  removeSegment,
  unwrap,
  updateSegment,
  addPartition,
  addZone,
  isPerimeterClosed,
  movePartitionEndpoint,
  movePartitionPerpendicular,
  removePartition,
  removeZone,
  setPartitionEndpoints,
  setPartitionLength,
  updateZone,
  addOpening,
  removeOpening,
  updateOpening,
  type DomainError,
  type Floor,
  type Id,
  type Perimeter,
  type Point,
  type Project,
  type Result,
  type SegmentInput,
  type OpeningInput,
  type ZoneInput,
} from '../domain';

export type EditorMode = 'structure' | 'layout';
export type SelectionKind = 'segment' | 'partition' | 'zone' | 'opening';
export type Selection = { kind: SelectionKind; id: Id } | null;
export type NewVersionSource = 'current' | 'perimeter' | 'empty';

export interface ProjectState {
  project: Project;
  activeVersionId: Id;
  mode: EditorMode;
  selection: Selection;
  /** Segment whose length input should receive focus (set when clicking a dimension label). */
  lengthEditRequest: Id | null;
  lastError: DomainError | null;
  /** Project as last written to (or read from) a file. Differs from `project` when there are unsaved changes. */
  savedProject: Project | null;
  /** Wall shown in the elevation (front) view, or null when it is closed. */
  elevationWallId: Id | null;

  newProject: (name: string) => void;
  loadProject: (project: Project, options: { fromFile: boolean }) => void;
  renameProject: (name: string) => void;
  setActiveVersion: (versionId: Id) => void;
  createVersion: (name: string, source: NewVersionSource) => void;
  renameActiveVersion: (name: string) => void;
  removeActiveVersion: () => void;
  markSaved: (project: Project) => void;
  setMode: (mode: EditorMode) => void;
  select: (selection: Selection) => void;
  requestLengthEdit: (segmentId: Id | null) => void;
  clearError: () => void;

  setPerimeterStart: (start: Point) => void;
  appendPerimeterSegment: (input: SegmentInput) => boolean;
  closePerimeter: () => void;
  updatePerimeterSegment: (segmentId: Id, changes: Partial<SegmentInput>) => void;
  movePerimeterSegment: (segmentId: Id, offset: number) => void;
  removePerimeterSegment: (segmentId: Id) => void;

  addPartition: (a: Point, b: Point) => boolean;
  /** Moves a partition perpendicular to itself; linked partitions follow. */
  movePartition: (partitionId: Id, offset: number) => void;
  /** Moves one end of a partition; partitions joined there follow. */
  movePartitionEndpoint: (partitionId: Id, end: 'a' | 'b', point: Point) => void;
  setPartitionEndpoints: (partitionId: Id, a: Point, b: Point) => void;
  setPartitionLength: (partitionId: Id, length: number) => void;
  removePartition: (partitionId: Id) => void;
  addZone: (input: ZoneInput) => boolean;
  updateZone: (zoneId: Id, changes: Partial<ZoneInput>) => void;
  removeZone: (zoneId: Id) => void;
  addOpening: (input: OpeningInput) => boolean;
  updateOpening: (openingId: Id, changes: Partial<OpeningInput>) => void;
  removeOpening: (openingId: Id) => void;
  openElevation: (wallId: Id) => void;
  closeElevation: () => void;
  /** Deletes whatever is selected (perimeter segment, partition or zone). */
  removeSelection: () => void;
}

const DEFAULT_PROJECT_NAME = 'Mi piso';

function freshProject(name: string): Project {
  return unwrap(createProject(name.trim() === '' ? DEFAULT_PROJECT_NAME : name));
}

const initialProject = freshProject(DEFAULT_PROJECT_NAME);

function selectFloor(state: Pick<ProjectState, 'project' | 'activeVersionId'>): Floor {
  return (findVersion(state.project, state.activeVersionId) ?? state.project.versions[0]).floor;
}

export const useProjectStore = create<ProjectState>()(
  temporal(
    (set, get) => {
      /** Applies a domain operation to the active floor. Records the error and returns false if rejected. */
      const editFloor = (operation: (floor: Floor) => Result<Floor>): boolean => {
        const { project, activeVersionId } = get();
        const version = findVersion(project, activeVersionId);
        if (!version) return false;
        const result = operation(version.floor);
        if (!result.ok) {
          set({ lastError: result.error });
          return false;
        }
        set({
          lastError: null,
          project: {
            ...project,
            versions: project.versions.map((v) => (v.id === activeVersionId ? { ...v, floor: result.value } : v)),
          },
        });
        return true;
      };

      const editPerimeter = (operation: (perimeter: Perimeter) => Result<Perimeter>): boolean =>
        editFloor((floor) => {
          const result = operation(floor.perimeter);
          return result.ok ? ok(mergeCollinearSegments({ ...floor, perimeter: result.value })) : result;
        });

      // Partition edits end by joining partitions that ended up on the same line.
      const editPartitions = (operation: (floor: Floor) => Result<Floor>): boolean =>
        editFloor((floor) => {
          const result = operation(floor);
          return result.ok ? ok(mergeCollinearPartitions(result.value)) : result;
        });

      const replaceProject = (project: Project, savedProject: Project | null) => {
        set({
          project,
          savedProject,
          elevationWallId: null,
          activeVersionId: project.versions[0].id,
          selection: null,
          lengthEditRequest: null,
          lastError: null,
        });
        useProjectStore.temporal.getState().clear();
      };

      return {
        project: initialProject,
        activeVersionId: initialProject.versions[0].id,
        mode: 'structure',
        selection: null,
        lengthEditRequest: null,
        lastError: null,
        savedProject: initialProject,
        elevationWallId: null,

        newProject: (name) => {
          const project = freshProject(name);
          replaceProject(project, project);
        },
        loadProject: (project, { fromFile }) => replaceProject(project, fromFile ? project : null),
        markSaved: (project) => set({ savedProject: project }),
        renameProject: (name) => {
          if (name.trim() === '') return set({ lastError: 'INVALID_NAME' });
          set({ project: { ...get().project, name: name.trim() } });
        },
        setActiveVersion: (versionId) => set({ activeVersionId: versionId, selection: null, elevationWallId: null }),
        createVersion: (name, source) => {
          const { project, activeVersionId } = get();
          const result =
            source === 'current'
              ? duplicateVersion(project, activeVersionId, name)
              : source === 'perimeter'
                ? addPerimeterOnlyVersion(project, activeVersionId, name)
                : addEmptyVersion(project, name);
          if (!result.ok) return set({ lastError: result.error });
          const created = result.value.versions[result.value.versions.length - 1];
          set({ project: result.value, activeVersionId: created.id, selection: null, lastError: null });
        },
        renameActiveVersion: (name) => {
          const result = renameVersion(get().project, get().activeVersionId, name);
          if (!result.ok) return set({ lastError: result.error });
          set({ project: result.value, lastError: null });
        },
        removeActiveVersion: () => {
          const result = removeVersion(get().project, get().activeVersionId);
          if (!result.ok) return set({ lastError: result.error });
          set({ project: result.value, activeVersionId: result.value.versions[0].id, selection: null, lastError: null });
        },
        setMode: (mode) => {
          const version = findVersion(get().project, get().activeVersionId);
          if (mode === 'layout' && version && !isPerimeterClosed(version.floor.perimeter)) {
            return set({ lastError: 'PERIMETER_NOT_CLOSED' });
          }
          set({ mode, selection: null });
        },
        select: (selection) => set({ selection }),
        requestLengthEdit: (segmentId) => set({ lengthEditRequest: segmentId }),
        clearError: () => set({ lastError: null }),

        setPerimeterStart: (start) => editPerimeter((perimeter) => ok({ ...perimeter, start })),
        appendPerimeterSegment: (input) => editPerimeter((perimeter) => appendSegment(perimeter, input)),
        closePerimeter: () => {
          editPerimeter(appendClosingSegment);
        },
        updatePerimeterSegment: (segmentId, changes) => {
          editPerimeter((perimeter) => updateSegment(perimeter, segmentId, changes));
        },
        movePerimeterSegment: (segmentId, offset) => {
          editPerimeter((perimeter) => moveSegment(perimeter, segmentId, offset));
        },
        removePerimeterSegment: (segmentId) => {
          const removed = editFloor((floor) => {
            const result = removeSegment(floor.perimeter, segmentId);
            return result.ok
              ? ok(mergeCollinearSegments(removeOpeningsOnWall({ ...floor, perimeter: result.value }, segmentId)))
              : result;
          });
          if (removed) set({ selection: null });
        },

        addPartition: (a, b) => editPartitions((floor) => addPartition(floor, a, b)),
        movePartition: (partitionId, offset) => {
          editPartitions((floor) => movePartitionPerpendicular(floor, partitionId, offset));
        },
        movePartitionEndpoint: (partitionId, end, point) => {
          editPartitions((floor) => movePartitionEndpoint(floor, partitionId, end, point));
        },
        setPartitionEndpoints: (partitionId, a, b) => {
          editPartitions((floor) => setPartitionEndpoints(floor, partitionId, a, b));
        },
        setPartitionLength: (partitionId, length) => {
          editPartitions((floor) => setPartitionLength(floor, partitionId, length));
        },
        removePartition: (partitionId) => {
          if (editFloor((floor) => removePartition(floor, partitionId))) set({ selection: null });
        },
        addZone: (input) => {
          const added = editFloor((floor) => addZone(floor, input));
          if (added) {
            const zones = selectFloor(get()).zones;
            set({ selection: { kind: 'zone', id: zones[zones.length - 1].id } });
          }
          return added;
        },
        updateZone: (zoneId, changes) => {
          editFloor((floor) => updateZone(floor, zoneId, changes));
        },
        removeZone: (zoneId) => {
          if (editFloor((floor) => ok(removeZone(floor, zoneId)))) set({ selection: null });
        },
        addOpening: (input) => {
          const added = editFloor((floor) => addOpening(floor, input));
          if (added) {
            const openings = selectFloor(get()).openings;
            set({ selection: { kind: 'opening', id: openings[openings.length - 1].id } });
          }
          return added;
        },
        updateOpening: (openingId, changes) => {
          editFloor((floor) => updateOpening(floor, openingId, changes));
        },
        removeOpening: (openingId) => {
          if (editFloor((floor) => ok(removeOpening(floor, openingId)))) set({ selection: null });
        },
        openElevation: (wallId) => set({ elevationWallId: wallId }),
        closeElevation: () => set({ elevationWallId: null }),
        removeSelection: () => {
          const { selection } = get();
          if (!selection) return;
          if (selection.kind === 'opening') get().removeOpening(selection.id);
          if (selection.kind === 'segment') get().removePerimeterSegment(selection.id);
          if (selection.kind === 'partition') get().removePartition(selection.id);
          if (selection.kind === 'zone') get().removeZone(selection.id);
        },
      };
    },
    {
      // Only the project is part of undo/redo; selection, mode and errors are UI state.
      partialize: (state) => ({ project: state.project }),
      equality: (a, b) => a.project === b.project,
      limit: 200,
    },
  ),
);
