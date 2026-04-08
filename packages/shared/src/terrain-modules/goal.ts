import { appendTerrainTrigger } from "./helpers";
import type { TerrainModule } from "./types";

export const GOAL_TERRAIN_MODULE: TerrainModule = {
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
