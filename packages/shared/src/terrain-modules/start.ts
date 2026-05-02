import type { TerrainModule } from "./types";

export const START_TERRAIN_MODULE: TerrainModule = {
  accent: "#7dc8be",
  getTextDescription: () => ({
    title: "出生点",
    description: "出生点，也是复活点。",
    details: []
  }),
  label: "出生点",
  type: "start"
};
