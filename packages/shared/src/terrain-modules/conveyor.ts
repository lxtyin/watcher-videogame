import { appendTerrainTrigger } from "./helpers";
import type { TerrainModule } from "./types";
import { isMovementType } from "../rules/displacement";

export const CONVEYOR_TERRAIN_MODULE: TerrainModule = {
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
