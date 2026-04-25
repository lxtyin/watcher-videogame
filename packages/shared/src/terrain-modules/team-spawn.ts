import type { TerrainModule } from "./types";

export const TEAM_SPAWN_TERRAIN_MODULE: TerrainModule = {
  accent: "#b5c8d8",
  getTextDescription: (tile) => ({
    title: tile.faction === "black" ? "黑队出生点" : "白队出生点",
    description: "该阵营角色被击倒后，会在这里复活。",
    details: []
  }),
  label: "阵营出生点",
  type: "teamSpawn"
};

