import type { TerrainModule } from "./types";

export const WALL_TERRAIN_MODULE: TerrainModule = {
  accent: "#455062",
  getTextDescription: () => ({
    title: "墙壁",
    description: "阻挡地面移动和投射物，但飞跃仍然可以越过。",
    details: []
  }),
  label: "墙壁",
  type: "wall"
};
