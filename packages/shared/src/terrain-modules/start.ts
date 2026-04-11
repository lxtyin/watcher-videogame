import type { TerrainModule } from "./types";

export const START_TERRAIN_MODULE: TerrainModule = {
  accent: "#7dc8be",
  getTextDescription: () => ({
    title: "出生点",
    description: "地图的起始位置。玩家被送回出生点时会回到这里。",
    details: []
  }),
  label: "出生点",
  type: "start"
};
