import { useStore } from 'zustand';
import { findVersion, type Floor, type Version } from '../domain';
import { useProjectStore, type ProjectState } from './projectStore';

export function selectActiveVersion(state: ProjectState): Version {
  return findVersion(state.project, state.activeVersionId) ?? state.project.versions[0];
}

export function useActiveFloor(): Floor {
  return useProjectStore((state) => selectActiveVersion(state).floor);
}

export function useUndoRedo() {
  const canUndo = useStore(useProjectStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useProjectStore.temporal, (state) => state.futureStates.length > 0);
  const { undo, redo } = useProjectStore.temporal.getState();
  return { canUndo, canRedo, undo: () => undo(), redo: () => redo() };
}
