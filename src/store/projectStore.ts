import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  appendClosingSegment,
  appendSegment,
  createProject,
  addEmptyVersion,
  duplicateVersion,
  findVersion,
  removeVersion,
  renameVersion,
  mergeCollinearSegments,
  moveSegment,
  ok,
  removeOpeningsOnWall,
  removeSegment,
  unwrap,
  updateSegment,
  type DomainError,
  type Floor,
  type Id,
  type Perimeter,
  type Point,
  type Project,
  type Result,
  type SegmentInput,
} from '../domain';

export type EditorMode = 'structure' | 'layout';
export type Selection = { kind: 'segment'; id: Id } | null;
export type NewVersionSource = 'current' | 'empty';

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
}

const DEFAULT_PROJECT_NAME = 'Mi piso';

function freshProject(name: string): Project {
  return unwrap(createProject(name.trim() === '' ? DEFAULT_PROJECT_NAME : name));
}

const initialProject = freshProject(DEFAULT_PROJECT_NAME);

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

      const replaceProject = (project: Project, savedProject: Project | null) => {
        set({
          project,
          savedProject,
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
        setActiveVersion: (versionId) => set({ activeVersionId: versionId, selection: null }),
        createVersion: (name, source) => {
          const { project, activeVersionId } = get();
          const result =
            source === 'current' ? duplicateVersion(project, activeVersionId, name) : addEmptyVersion(project, name);
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
        setMode: (mode) => set({ mode, selection: null }),
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
