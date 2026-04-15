import { create } from "zustand";
import type { SceneInspectionCardData } from "../content/inspectables";

interface ToolCancelState {
  active: boolean;
  visible: boolean;
}

interface SceneOverlayStoreState {
  inspectionCard: SceneInspectionCardData | null;
  setInspectionCard: (inspectionCard: SceneInspectionCardData | null) => void;
  setToolCancelState: (state: ToolCancelState) => void;
  reset: () => void;
  toolCancelActive: boolean;
  toolCancelVisible: boolean;
}

// Scene overlays live in regular DOM so touch UI stays screen-space and independent from the 3D tree.
export const useSceneOverlayStore = create<SceneOverlayStoreState>((set) => ({
  inspectionCard: null,
  setInspectionCard: (inspectionCard) => {
    set({ inspectionCard });
  },
  setToolCancelState: ({ active, visible }) => {
    set({
      toolCancelActive: active,
      toolCancelVisible: visible
    });
  },
  reset: () => {
    set({
      inspectionCard: null,
      toolCancelActive: false,
      toolCancelVisible: false
    });
  },
  toolCancelActive: false,
  toolCancelVisible: false
}));
