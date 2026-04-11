import type { TerrainModule } from "./types";

export const EMPTY_LUCKY_TERRAIN_MODULE: TerrainModule = {
  accent: "#b7a36a",
  getTextDescription: () => ({
    title: "空幸运方块",
    description: "已经被拾取的幸运方块，会在下一位玩家回合开始时恢复。",
    details: []
  }),
  label: "空幸运方块",
  type: "emptyLucky"
};
