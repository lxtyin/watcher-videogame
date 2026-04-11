import type { TerrainModule } from "./types";

export const HIGHWALL_TERRAIN_MODULE: TerrainModule = {
  accent: "#556273",
  blocksGroundMovement: true,
  blocksLeapTraversal: true,
  blocksProjectile: true,
  getTextDescription: () => ({
    title: "高墙",
    description: "带铁栅栏的高墙，会阻挡地面移动、飞跃穿越与投射物。",
    details: []
  }),
  label: "高墙",
  type: "highwall"
};
