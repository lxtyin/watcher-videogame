import type { TerrainModule } from "./types";

export const HIGHWALL_TERRAIN_MODULE: TerrainModule = {
  accent: "#556273",
  getTextDescription: () => ({
    title: "高墙",
    description: "带铁栅栏的高墙，能阻挡地面移动、飞跃与投射物。",
    details: []
  }),
  label: "高墙",
  type: "highwall"
};
