import type { TerrainModule } from "./types";

export const EARTH_WALL_TERRAIN_MODULE: TerrainModule = {
  accent: "#bc7441",
  getTextDescription: (tile) => ({
    title: "土墙",
    description: "阻挡地面移动和投掷物，可以被飞跃。消耗额外两点移动步数可以将其撞碎。",
    details: [`耐久 ${tile.durability}`]
  }),
  label: "土墙",
  type: "earthWall"
};
