import { appendTerrainTrigger, respawnPlayerOnTerrain } from "./helpers";
import type { TerrainModule } from "./types";

export const POISON_TERRAIN_MODULE: TerrainModule = {
  onStop: (context) => {
    respawnPlayerOnTerrain(context.draft, {
      eventId: `${context.draft.sourceId}:poison:${context.tile.key}`,
      motionStyle: "fall_side",
      player: context.player,
      triggerPosition: context.position
    });
    appendTerrainTrigger(context.draft, {
      kind: "poison",
      movement: context.movement,
      playerId: context.player.id,
      position: context.position,
      respawnPosition: context.player.spawnPosition,
      tileKey: context.tile.key
    });
  },
  type: "poison"
};
