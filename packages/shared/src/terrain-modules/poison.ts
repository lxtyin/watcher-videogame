import { appendTerrainPreviewHighlight, appendTerrainTrigger, respawnPlayerOnTerrain } from "./helpers";
import type { TerrainModule } from "./types";

export const POISON_TERRAIN_MODULE: TerrainModule = {
  accent: "#6da552",
  getTextDescription: () => ({
    title: "毒气",
    description: "停留在上面时会被毒气放倒，并立刻送回出生点。",
    details: []
  }),
  label: "毒气",
  onStop: (context) => {
    appendTerrainPreviewHighlight(context.draft, context.position);
    respawnPlayerOnTerrain(context.draft, {
      eventId: `${context.draft.sourceId}:poison:${context.tile.key}`,
      motionStyle: "fall_side",
      player: context.player,
      startMs: context.startMs,
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
