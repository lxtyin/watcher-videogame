import { getTile, isWithinBoard, toTileKey } from "./board";
import { getToolDefinition } from "./tools";
import type {
  ActionResolution,
  AffectedPlayerMove,
  BoardPlayerState,
  Direction,
  DirectionalActionContext,
  GridPosition,
  MovementActor,
  TileMutation,
  TileType,
  ToolActionContext,
  ToolId
} from "./types";

const DIRECTION_VECTORS: Record<Direction, GridPosition> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

type ToolExecutor = (context: ToolActionContext) => ActionResolution;

function buildBlockedResolution(
  actor: MovementActor,
  reason: string,
  path: GridPosition[] = []
): ActionResolution {
  return {
    kind: "blocked",
    reason,
    path,
    actor: {
      position: actor.position,
      remainingMovePoints: actor.remainingMovePoints,
      movementActionsRemaining: actor.movementActionsRemaining
    },
    affectedPlayers: [],
    tileMutations: [],
    consumedMovePoints: 0
  };
}

function buildAppliedResolution(
  actor: MovementActor,
  nextActor: MovementActor,
  summary: string,
  path: GridPosition[],
  tileMutations: TileMutation[] = [],
  affectedPlayers: AffectedPlayerMove[] = []
): ActionResolution {
  return {
    kind: "applied",
    summary,
    path,
    actor: {
      position: nextActor.position,
      remainingMovePoints: nextActor.remainingMovePoints,
      movementActionsRemaining: nextActor.movementActionsRemaining
    },
    affectedPlayers,
    tileMutations,
    consumedMovePoints: actor.remainingMovePoints - nextActor.remainingMovePoints
  };
}

export function getDirectionVector(direction: Direction): GridPosition {
  return DIRECTION_VECTORS[direction];
}

export function getOppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

export function stepPosition(
  position: GridPosition,
  direction: Direction,
  amount = 1
): GridPosition {
  const vector = getDirectionVector(direction);

  return {
    x: position.x + vector.x * amount,
    y: position.y + vector.y * amount
  };
}

export function isSolidTileType(tileType: TileType): boolean {
  return tileType === "wall" || tileType === "earthWall";
}

function hasOccupant(
  players: BoardPlayerState[],
  position: GridPosition,
  ignoredPlayerIds: string[] = []
): boolean {
  return players.some(
    (player) =>
      !ignoredPlayerIds.includes(player.id) &&
      player.position.x === position.x &&
      player.position.y === position.y
  );
}

function isLandableTile(
  context: DirectionalActionContext,
  position: GridPosition,
  ignoredPlayerIds: string[] = []
): boolean {
  if (!isWithinBoard(context.board, position)) {
    return false;
  }

  const tile = getTile(context.board, position);

  if (!tile || isSolidTileType(tile.type)) {
    return false;
  }

  return !hasOccupant(context.players, position, ignoredPlayerIds);
}

function createTileMutation(position: GridPosition): TileMutation {
  return {
    key: toTileKey(position),
    position,
    nextType: "floor",
    nextDurability: 0
  };
}

export function resolveMovementAction(context: DirectionalActionContext): ActionResolution {
  const { actor } = context;

  if (actor.movementActionsRemaining < 1) {
    return buildBlockedResolution(actor, "No movement actions left");
  }

  if (actor.remainingMovePoints < 1) {
    return buildBlockedResolution(actor, "No move points left");
  }

  let currentPosition = actor.position;
  let remainingMovePoints = actor.remainingMovePoints;
  const path: GridPosition[] = [];
  const tileMutations: TileMutation[] = [];
  let stopReason = "Movement ended";

  while (remainingMovePoints > 0) {
    const target = stepPosition(currentPosition, context.direction);

    if (!isWithinBoard(context.board, target)) {
      stopReason = "Board edge";
      break;
    }

    if (hasOccupant(context.players, target, [actor.id])) {
      stopReason = "Tile occupied";
      break;
    }

    const tile = getTile(context.board, target);

    if (!tile) {
      stopReason = "Missing tile";
      break;
    }

    if (tile.type === "wall") {
      stopReason = "Wall";
      break;
    }

    const moveCost = tile.type === "earthWall" ? 1 + tile.durability : 1;

    if (remainingMovePoints < moveCost) {
      stopReason = "Not enough move points";
      break;
    }

    remainingMovePoints -= moveCost;
    currentPosition = target;
    path.push(target);

    if (tile.type === "earthWall") {
      tileMutations.push(createTileMutation(target));
    }
  }

  if (!path.length) {
    return buildBlockedResolution(actor, stopReason);
  }

  return buildAppliedResolution(
    actor,
    {
      ...actor,
      position: currentPosition,
      remainingMovePoints,
      movementActionsRemaining: Math.max(0, actor.movementActionsRemaining - 1)
    },
    `Moved ${context.direction} for ${path.length} tile(s).`,
    path,
    tileMutations
  );
}

function resolveJumpTool(context: ToolActionContext): ActionResolution {
  const path = [1, 2]
    .map((distance) => stepPosition(context.actor.position, context.direction, distance))
    .filter((position) => isWithinBoard(context.board, position));

  for (let distance = 2; distance >= 1; distance -= 1) {
    const landing = stepPosition(context.actor.position, context.direction, distance);

    if (!isLandableTile(context, landing, [context.actor.id])) {
      continue;
    }

    return buildAppliedResolution(
      context.actor,
      {
        ...context.actor,
        position: landing
      },
      `Used ${getToolDefinition(context.toolId).label}.`,
      path
    );
  }

  return buildBlockedResolution(context.actor, "No landing tile", path);
}

function resolveHookshotTool(context: ToolActionContext): ActionResolution {
  const rayPath: GridPosition[] = [];

  for (let distance = 1; distance <= 3; distance += 1) {
    const target = stepPosition(context.actor.position, context.direction, distance);

    if (!isWithinBoard(context.board, target)) {
      break;
    }

    rayPath.push(target);

    const hitPlayer = context.players.find(
      (player) =>
        player.id !== context.actor.id &&
        player.position.x === target.x &&
        player.position.y === target.y
    );

    if (hitPlayer) {
      const pullDirection = getOppositeDirection(context.direction);
      let currentTarget = hitPlayer.position;
      const occupiedIds = [context.actor.id, hitPlayer.id];

      while (true) {
        const nextTarget = stepPosition(currentTarget, pullDirection);

        if (
          nextTarget.x === context.actor.position.x &&
          nextTarget.y === context.actor.position.y
        ) {
          break;
        }

        if (!isLandableTile(context, nextTarget, occupiedIds)) {
          break;
        }

        currentTarget = nextTarget;
      }

      if (
        currentTarget.x === hitPlayer.position.x &&
        currentTarget.y === hitPlayer.position.y
      ) {
        return buildBlockedResolution(context.actor, "Target cannot be pulled", rayPath);
      }

      return buildAppliedResolution(
        context.actor,
        context.actor,
        `Used ${getToolDefinition(context.toolId).label}.`,
        rayPath,
        [],
        [
          {
            playerId: hitPlayer.id,
            target: currentTarget,
            reason: "hookshot"
          }
        ]
      );
    }

    const tile = getTile(context.board, target);

    if (tile && isSolidTileType(tile.type)) {
      if (distance === 1) {
        return buildBlockedResolution(context.actor, "No hookshot landing space", rayPath);
      }

      const landing = stepPosition(context.actor.position, context.direction, distance - 1);

      return buildAppliedResolution(
        context.actor,
        {
          ...context.actor,
          position: landing
        },
        `Used ${getToolDefinition(context.toolId).label}.`,
        rayPath
      );
    }
  }

  return buildBlockedResolution(context.actor, "No hookshot target", rayPath);
}

function resolvePivotTool(context: ToolActionContext): ActionResolution {
  return buildAppliedResolution(
    context.actor,
    {
      ...context.actor,
      movementActionsRemaining: context.actor.movementActionsRemaining + 1
    },
    `Used ${getToolDefinition(context.toolId).label}.`,
    []
  );
}

function resolveDashTool(context: ToolActionContext): ActionResolution {
  return buildAppliedResolution(
    context.actor,
    {
      ...context.actor,
      remainingMovePoints: context.actor.remainingMovePoints + 2
    },
    `Used ${getToolDefinition(context.toolId).label}.`,
    []
  );
}

const TOOL_EXECUTORS: Record<ToolId, ToolExecutor> = {
  jump: resolveJumpTool,
  hookshot: resolveHookshotTool,
  pivot: resolvePivotTool,
  dash: resolveDashTool
};

export function resolveToolAction(context: ToolActionContext): ActionResolution {
  // Tool behavior stays centralized here so room authority and client preview
  // can extend from the same registry instead of branching on tool ids in many places.
  return TOOL_EXECUTORS[context.toolId](context);
}
