import { appendTerrainPreviewHighlight, appendTerrainTrigger } from "./helpers";
import type { TerrainModule } from "./types";
import { isMovementType } from "../rules/displacement";

const DIRECTION_LABELS = {
  up: "朝上",
  right: "朝右",
  down: "朝下",
  left: "朝左"
} as const;

export const CONVEYOR_TERRAIN_MODULE: TerrainModule = {
  accent: "#6db0c6",
  getTextDescription: (tile) => ({
    title: "传送带",
    description: "顺行经过时获得+2移动步数，逆行或侧行经过时会被强制转向。",
    details: [`传送方向 ${tile.direction ? DIRECTION_LABELS[tile.direction] : "未设置"}`]
  }),
  label: "传送带",
  onPassThrough: (context) => {
    if (
      !context.tile.direction ||
      !context.state.direction ||
      typeof context.state.remainingMovePoints !== "number" ||
      !isMovementType(context.movement, "translate")
    ) {
      return;
    }

    if (context.state.direction === context.tile.direction) {
      context.state.remainingMovePoints += 2;
      appendTerrainPreviewHighlight(context.draft, context.state.player.position);
      appendTerrainTrigger(context.draft, {
        kind: "conveyor_boost",
        movement: context.movement,
        playerId: context.state.player.id,
        tileKey: context.tile.key,
        position: context.state.player.position,
        direction: context.state.direction,
        bonusMovePoints: 2
      });
      return;
    }

    appendTerrainTrigger(context.draft, {
      kind: "conveyor_turn",
      movement: context.movement,
      playerId: context.state.player.id,
      tileKey: context.tile.key,
      position: context.state.player.position,
      fromDirection: context.state.direction,
      toDirection: context.tile.direction
    });
    context.state.direction = context.tile.direction;
  },
  type: "conveyor"
};
