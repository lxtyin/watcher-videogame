import { appendTerrainTrigger } from "./helpers";
import type { TerrainModule } from "./types";

export const GOAL_TERRAIN_MODULE: TerrainModule = {
  accent: "#d97a70",
  getTextDescription: () => ({
    title: "终点",
    description: "只会在自己的回合停留时触发，用于竞速模式的到达结算。",
    details: []
  }),
  label: "终点",
  onStop: (context) => {
    if (context.player.id !== context.draft.actorId) {
      return;
    }

    appendTerrainTrigger(context.draft, {
      kind: "goal",
      movement: context.movement,
      playerId: context.player.id,
      position: context.position,
      tileKey: context.tile.key
    });
  },
  type: "goal"
};
