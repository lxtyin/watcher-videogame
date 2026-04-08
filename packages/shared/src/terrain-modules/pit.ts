import { appendTerrainTrigger, respawnPlayerOnTerrain } from "./helpers";
import type { TerrainModule } from "./types";

export const PIT_TERRAIN_MODULE: TerrainModule = {
  onPassThrough: (context) => {
    const triggerPosition = {
      x: context.state.player.position.x,
      y: context.state.player.position.y
    };

    respawnPlayerOnTerrain(context.draft, {
      eventId: `${context.draft.sourceId}:pit:${context.tile.key}`,
      motionStyle: "spin_drop",
      player: context.state.player,
      triggerPosition
    });
    context.state.direction = null;
    context.state.remainingMovePoints = 0;
    context.state.shouldResolveStopTriggers = false;
    appendTerrainTrigger(context.draft, {
      kind: "pit",
      movement: context.movement,
      playerId: context.state.player.id,
      position: triggerPosition,
      respawnPosition: context.state.player.spawnPosition,
      tileKey: context.tile.key
    });
  },
  type: "pit"
};
