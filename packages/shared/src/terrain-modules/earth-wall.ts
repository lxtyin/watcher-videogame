import type { TerrainModule } from "./types";

export const EARTH_WALL_TERRAIN_MODULE: TerrainModule = {
  accent: "#bc7441",
  getTextDescription: (tile) => ({
    title: "土墙",
    description: "会阻挡投射物；地面移动撞上时会被撞碎并消耗额外移动点数。",
    details: [`耐久 ${tile.durability}`]
  }),
  label: "土墙",
  type: "earthWall"
};
