import { appendTerrainTrigger } from "./helpers";
import type { TerrainModule } from "./types";
import { resolveRocketCore } from "../tool-modules/rocket";

const CANNON_PROJECTILE_RANGE = 999;
const CANNON_BLAST_LEAP_DISTANCE = 3;
const CANNON_SPLASH_PUSH_DISTANCE = 1;
const DIRECTION_LABELS = {
  up: "朝上",
  right: "朝右",
  down: "朝下",
  left: "朝左"
} as const;

export const CANNON_TERRAIN_MODULE: TerrainModule = {
  accent: "#8c6850",
  getTextDescription: (tile) => ({
    title: "大炮",
    description: "停留时会立刻朝当前朝向发射一枚无来源火箭。",
    details: [`发射方向 ${tile.direction ? DIRECTION_LABELS[tile.direction] : "未设置"}`]
  }),
  label: "大炮",
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
