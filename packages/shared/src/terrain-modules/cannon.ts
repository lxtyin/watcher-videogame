import { appendTerrainTrigger } from "./helpers";
import type { TerrainModule } from "./types";
import { resolveRocketCore } from "../tool-modules/rocket";

const CANNON_PROJECTILE_RANGE = 999;
const CANNON_BLAST_LEAP_DISTANCE = 3;
const CANNON_SPLASH_PUSH_DISTANCE = 1;

export const CANNON_TERRAIN_MODULE: TerrainModule = {
  onStop: (context) => {
    if (!context.tile.direction) {
      return;
    }

    appendTerrainTrigger(context.draft, {
      direction: context.tile.direction,
      kind: "cannon",
      movement: context.movement,
      playerId: context.player.id,
      position: context.player.position,
      tileKey: context.tile.key
    });
    resolveRocketCore(context.draft, {
      blastLeapDistance: CANNON_BLAST_LEAP_DISTANCE,
      direction: context.tile.direction,
      eventIdPrefix: `${context.draft.sourceId}:cannon:${context.tile.key}`,
      originPosition: context.player.position,
      projectileOwnerId: null,
      projectileRange: CANNON_PROJECTILE_RANGE,
      splashPushDistance: CANNON_SPLASH_PUSH_DISTANCE,
      startMs: context.startMs,
      tagBase: `terrain:${context.tile.type}`
    });
  },
  type: "cannon"
};
