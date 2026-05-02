import { appendTerrainPreviewHighlight, appendTerrainTrigger, defeatEntityOnTerrain } from "./helpers";
import type { TerrainModule } from "./types";
import { isMovementType } from "../rules/displacement";

export const PIT_TERRAIN_MODULE: TerrainModule = {
  accent: "#8b705f",
  getTextDescription: () => ({
    title: "坑洞",
    description: "经过时坠落，死亡并回到出生点。",
    details: []
  }),
  label: "坑洞",
  onPassThrough: (context) => {

    if (context.movement.type == "translate" || context.movement.type == "landing") {
      const triggerPosition = {
        x: context.state.player.position.x,
        y: context.state.player.position.y
      };

      appendTerrainPreviewHighlight(context.draft, triggerPosition);
      defeatEntityOnTerrain(context.draft, {
        eventId: `${context.draft.sourceId}:pit:${context.tile.key}`,
        motionStyle: "spin_drop",
        player: context.state.player,
        startMs: context.startMs,
        triggerPosition
      });
      const playerState = context.draft.playersById.get(context.state.player.id);
      context.state.direction = null;
      context.state.remainingMovePoints = 0;
      appendTerrainTrigger(context.draft, {
        kind: "pit",
        movement: context.movement,
        playerId: context.state.player.id,
        position: triggerPosition,
        respawnPosition: playerState?.boardVisible ? context.state.player.spawnPosition : null,
        tileKey: context.tile.key
      });
    }
  },

  onStop: (context) => { 
      const triggerPosition = {
        x: context.player.position.x,
        y: context.player.position.y
      };

      appendTerrainPreviewHighlight(context.draft, triggerPosition);
      defeatEntityOnTerrain(context.draft, {
        eventId: `${context.draft.sourceId}:pit:${context.tile.key}`,
        motionStyle: "spin_drop",
        player: context.player,
        startMs: context.startMs,
        triggerPosition
      });
      const playerState = context.draft.playersById.get(context.player.id);
      appendTerrainTrigger(context.draft, {
        kind: "pit",
        movement: context.movement,
        playerId: context.player.id,
        position: triggerPosition,
        respawnPosition: playerState?.boardVisible ? context.player.spawnPosition : null,
        tileKey: context.tile.key
      });
  },
  type: "pit"
};
