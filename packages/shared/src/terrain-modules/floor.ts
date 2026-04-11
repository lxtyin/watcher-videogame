import type { TerrainModule } from "./types";

export const FLOOR_TERRAIN_MODULE: TerrainModule = {
  accent: "#d5c6a1",
  getTextDescription: () => ({
    title: "普通地板",
    description: "基础地形。大多数工具都可以在这里经过、停留或落点。",
    details: []
  }),
  label: "普通地板",
  type: "floor"
};
