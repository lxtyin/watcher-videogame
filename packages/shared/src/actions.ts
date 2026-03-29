import { getTile, isWithinBoard, toTileKey } from "./board";
import {
  consumeToolInstance,
  createMovementToolInstance,
  getToolAvailability,
  getToolDefinition
} from "./tools";
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
  ToolId,
  TurnToolSnapshot
} from "./types";

const DIRECTION_VECTORS: Record<Direction, GridPosition> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

type ToolExecutor = (context: ToolActionContext) => ActionResolution;

interface AxisTarget {
  direction: Direction;
  distance: number;
  snappedTarget: GridPosition;
}

function buildBlockedResolution(
  actor: MovementActor,
  tools: TurnToolSnapshot[],
  reason: string,
  path: GridPosition[] = []
): ActionResolution {
  return {
    kind: "blocked",
    reason,
    path,
    actor: {
      position: actor.position
    },
    tools,
    affectedPlayers: [],
    tileMutations: []
  };
}

function buildAppliedResolution(
  actor: MovementActor,
  nextActor: MovementActor,
  tools: TurnToolSnapshot[],
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
      position: nextActor.position
    },
    tools,
    affectedPlayers,
    tileMutations
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

function createPivotMovementTool(activeTool: TurnToolSnapshot): TurnToolSnapshot {
  return createMovementToolInstance(`${activeTool.instanceId}:pivot-movement`, 2);
}

function consumeActiveTool(context: ToolActionContext): TurnToolSnapshot[] {
  return consumeToolInstance(context.tools, context.activeTool.instanceId);
}

function requireDirection(context: ToolActionContext): Direction | null {
  return context.direction ?? null;
}

function normalizeAxisTarget(
  from: GridPosition,
  target: GridPosition | undefined
): AxisTarget | null {
  if (!target) {
    return null;
  }

  const deltaX = target.x - from.x;
  const deltaY = target.y - from.y;

  if (!deltaX && !deltaY) {
    return null;
  }

  if (Math.abs(deltaX) >= Math.abs(deltaY) && deltaX !== 0) {
    const direction = deltaX > 0 ? "right" : "left";
    const distance = Math.abs(deltaX);

    return {
      direction,
      distance,
      snappedTarget: stepPosition(from, direction, distance)
    };
  }

  if (deltaY !== 0) {
    const direction = deltaY > 0 ? "down" : "up";
    const distance = Math.abs(deltaY);

    return {
      direction,
      distance,
      snappedTarget: stepPosition(from, direction, distance)
    };
  }

  return null;
}

function resolveMovementTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const maxMovePoints = context.activeTool.movePoints ?? 0;

  if (!direction) {
    return buildBlockedResolution(context.actor, context.tools, "Movement needs a direction");
  }

  if (maxMovePoints < 1) {
    return buildBlockedResolution(context.actor, context.tools, "No move points left");
  }

  let currentPosition = context.actor.position;
  let remainingMovePoints = maxMovePoints;
  const path: GridPosition[] = [];
  const tileMutations: TileMutation[] = [];
  let stopReason = "Movement ended";

  while (remainingMovePoints > 0) {
    const target = stepPosition(currentPosition, direction);

    if (!isWithinBoard(context.board, target)) {
      stopReason = "Board edge";
      break;
    }

    if (hasOccupant(context.players, target, [context.actor.id])) {
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
    return buildBlockedResolution(context.actor, context.tools, stopReason);
  }

  return buildAppliedResolution(
    context.actor,
    {
      ...context.actor,
      position: currentPosition
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    path,
    tileMutations
  );
}

function resolveJumpTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);

  if (!direction) {
    return buildBlockedResolution(context.actor, context.tools, "Jump needs a direction");
  }

  const directionalContext: DirectionalActionContext = {
    board: context.board,
    actor: context.actor,
    direction,
    players: context.players
  };
  const path = [1, 2]
    .map((distance) => stepPosition(context.actor.position, direction, distance))
    .filter((position) => isWithinBoard(context.board, position));

  for (let distance = 2; distance >= 1; distance -= 1) {
    const landing = stepPosition(context.actor.position, direction, distance);

    if (!isLandableTile(directionalContext, landing, [context.actor.id])) {
      continue;
    }

    return buildAppliedResolution(
      context.actor,
      {
        ...context.actor,
        position: landing
      },
      consumeActiveTool(context),
      `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
      path
    );
  }

  return buildBlockedResolution(context.actor, context.tools, "No landing tile", path);
}

function resolveHookshotTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);

  if (!direction) {
    return buildBlockedResolution(context.actor, context.tools, "Hookshot needs a direction");
  }

  const rayPath: GridPosition[] = [];

  for (let distance = 1; distance <= 3; distance += 1) {
    const target = stepPosition(context.actor.position, direction, distance);

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
      const pullDirection = getOppositeDirection(direction);
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

        const directionalContext: DirectionalActionContext = {
          board: context.board,
          actor: context.actor,
          direction,
          players: context.players
        };

        if (!isLandableTile(directionalContext, nextTarget, occupiedIds)) {
          break;
        }

        currentTarget = nextTarget;
      }

      if (
        currentTarget.x === hitPlayer.position.x &&
        currentTarget.y === hitPlayer.position.y
      ) {
        return buildBlockedResolution(context.actor, context.tools, "Target cannot be pulled", rayPath);
      }

      return buildAppliedResolution(
        context.actor,
        context.actor,
        consumeActiveTool(context),
        `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
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
        return buildBlockedResolution(context.actor, context.tools, "No hookshot landing space", rayPath);
      }

      const landing = stepPosition(context.actor.position, direction, distance - 1);

      return buildAppliedResolution(
        context.actor,
        {
          ...context.actor,
          position: landing
        },
        consumeActiveTool(context),
        `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
        rayPath
      );
    }
  }

  return buildBlockedResolution(context.actor, context.tools, "No hookshot target", rayPath);
}

function resolvePivotTool(context: ToolActionContext): ActionResolution {
  return buildAppliedResolution(
    context.actor,
    context.actor,
    [...consumeActiveTool(context), createPivotMovementTool(context.activeTool)],
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    []
  );
}

function resolveDashTool(context: ToolActionContext): ActionResolution {
  const nextTools = consumeActiveTool(context).map((tool) =>
    tool.toolId === "movement"
      ? {
          ...tool,
          movePoints: (tool.movePoints ?? 0) + 2
        }
      : tool
  );

  return buildAppliedResolution(
    context.actor,
    context.actor,
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    []
  );
}

function resolveBrakeTool(context: ToolActionContext): ActionResolution {
  const maxRange = context.activeTool.range ?? 0;
  const axisTarget = normalizeAxisTarget(context.actor.position, context.targetPosition);

  if (!axisTarget) {
    return buildBlockedResolution(context.actor, context.tools, "Brake needs a target tile");
  }

  if (maxRange < 1) {
    return buildBlockedResolution(context.actor, context.tools, "No brake range left");
  }

  const requestedDistance = Math.min(maxRange, axisTarget.distance);
  let currentPosition = context.actor.position;
  const path: GridPosition[] = [];
  const tileMutations: TileMutation[] = [];
  let stopReason = "Brake ended";

  for (let step = 0; step < requestedDistance; step += 1) {
    const target = stepPosition(currentPosition, axisTarget.direction);

    if (!isWithinBoard(context.board, target)) {
      stopReason = "Board edge";
      break;
    }

    if (hasOccupant(context.players, target, [context.actor.id])) {
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

    currentPosition = target;
    path.push(target);

    if (tile.type === "earthWall") {
      tileMutations.push(createTileMutation(target));
    }

    if (
      currentPosition.x === axisTarget.snappedTarget.x &&
      currentPosition.y === axisTarget.snappedTarget.y
    ) {
      break;
    }
  }

  if (!path.length) {
    return buildBlockedResolution(context.actor, context.tools, stopReason);
  }

  return buildAppliedResolution(
    context.actor,
    {
      ...context.actor,
      position: currentPosition
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    path,
    tileMutations
  );
}

const TOOL_EXECUTORS: Record<ToolId, ToolExecutor> = {
  movement: resolveMovementTool,
  jump: resolveJumpTool,
  hookshot: resolveHookshotTool,
  pivot: resolvePivotTool,
  dash: resolveDashTool,
  brake: resolveBrakeTool
};

export function resolveToolAction(context: ToolActionContext): ActionResolution {
  const availability = getToolAvailability(context.activeTool, context.tools);
  const toolDefinition = getToolDefinition(context.activeTool.toolId);

  if (!availability.usable) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      availability.reason ?? "Tool cannot be used right now"
    );
  }

  if (toolDefinition.targetMode === "direction" && !context.direction) {
    return buildBlockedResolution(context.actor, context.tools, `${toolDefinition.label} needs a direction`);
  }

  if (toolDefinition.targetMode === "tile" && !context.targetPosition) {
    return buildBlockedResolution(context.actor, context.tools, `${toolDefinition.label} needs a target tile`);
  }

  // Tool behavior stays centralized here so room authority and client preview
  // can extend from the same registry instead of branching on tool ids in many places.
  return TOOL_EXECUTORS[context.activeTool.toolId](context);
}
