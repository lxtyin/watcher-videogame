import { appendTerrainTrigger, respawnPlayerOnTerrain } from "./helpers";
import type { TerrainModule } from "./types";
import { isMovementType } from "../rules/displacement";

export const PIT_TERRAIN_MODULE: TerrainModule = {
  accent: "#8b705f",
  getTextDescription: () => ({
    title: "坑洞",
    description: "经过时会直接坠落并送回出生点，不能停留结算后再触发。",
    details: []
  }),
  label: "坑洞",
  onPassThrough: (context) => {
    const triggerPosition = {
      x: context.state.player.position.x,
      y: context.state.player.position.y
    };

    if (!isMovementType(context.movement, "translate")) {
      return;
    }

    respawnPlayerOnTerrain(context.draft, {
      eventId: `${context.draft.sourceId}:pit:${context.tile.key}`,
      motionStyle: "spin_drop",
      player: context.state.player,
      startMs: context.startMs,
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
