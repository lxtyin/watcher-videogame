import { getTile, isWithinBoard } from "./board";
import type { Direction, GridPosition, MovementContext, MovementResolution } from "./types";

const DIRECTION_VECTORS: Record<Direction, GridPosition> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

export function getDirectionVector(direction: Direction): GridPosition {
  return DIRECTION_VECTORS[direction];
}

export function resolveMoveAttempt(context: MovementContext): MovementResolution {
  // The shared resolver is the single source of truth for step-by-step movement.
  const vector = getDirectionVector(context.direction);
  const target = {
    x: context.actor.position.x + vector.x,
    y: context.actor.position.y + vector.y
  };

  if (!isWithinBoard(context.board, target)) {
    return {
      kind: "blocked",
      reason: "Board edge",
      target
    };
  }

  const tile = getTile(context.board, target);

  if (!tile) {
    return {
      kind: "blocked",
      reason: "Missing tile",
      target
    };
  }

  if (
    context.occupiedPositions.some(
      (position) => position.x === target.x && position.y === target.y
    )
  ) {
    return {
      kind: "blocked",
      reason: "Tile occupied",
      target
    };
  }

  if (tile.type === "wall") {
    return {
      kind: "blocked",
      reason: "Wall",
      target
    };
  }

  let moveCost = 1;
  let destroyedTileKey: string | undefined;

  if (tile.type === "earthWall") {
    // Earth walls consume extra move points and become floor after a successful pass.
    moveCost += tile.durability;
    destroyedTileKey = tile.key;
  }

  if (context.actor.remainingMovePoints < moveCost) {
    return {
      kind: "blocked",
      reason: "Not enough move points",
      target
    };
  }

  return destroyedTileKey
    ? {
        kind: "moved",
        target,
        moveCost,
        remainingMovePoints: context.actor.remainingMovePoints - moveCost,
        destroyedTileKey
      }
    : {
        kind: "moved",
        target,
        moveCost,
        remainingMovePoints: context.actor.remainingMovePoints - moveCost
      };
}
