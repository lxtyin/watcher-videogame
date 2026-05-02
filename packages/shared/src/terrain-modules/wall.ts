import type { TerrainModule } from "./types";

export const WALL_TERRAIN_MODULE: TerrainModule = {
  accent: "#455062",
  getTextDescription: () => ({
    title: "墙壁",
    description: "阻挡地面移动和投掷物，可以被飞跃。",
    details: []
  }),
  label: "墙壁",
  type: "wall"
};
