import { getTile, isWithinBoard, toTileKey } from "./board";
import { applyStopTerrainEffects, resolvePassThroughTerrainEffect } from "./terrain";
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
  TriggeredTerrainEffect,
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

interface GroundTraversalResult {
  currentDirection: Direction;
  path: GridPosition[];
  position: GridPosition;
  remainingMovePoints: number;
  stopReason: string;
  tileMutations: TileMutation[];
  triggeredTerrainEffects: TriggeredTerrainEffect[];
}

function buildBlockedResolution(
  actor: MovementActor,
  tools: TurnToolSnapshot[],
  reason: string,
  nextToolDieSeed: number,
  path: GridPosition[] = [],
  triggeredTerrainEffects: TriggeredTerrainEffect[] = []
): ActionResolution {
  return {
    kind: "blocked",
    reason,
    path,
    actor: {
      position: actor.position,
      turnFlags: actor.turnFlags
    },
    tools,
    affectedPlayers: [],
    tileMutations: [],
    triggeredTerrainEffects,
    nextToolDieSeed
  };
}

function buildAppliedResolution(
  nextActor: MovementActor,
  tools: TurnToolSnapshot[],
  summary: string,
  nextToolDieSeed: number,
  path: GridPosition[],
  tileMutations: TileMutation[] = [],
  affectedPlayers: AffectedPlayerMove[] = [],
  triggeredTerrainEffects: TriggeredTerrainEffect[] = []
): ActionResolution {
  return {
    kind: "applied",
    summary,
    path,
    actor: {
      position: nextActor.position,
      turnFlags: nextActor.turnFlags
    },
    tools,
    affectedPlayers,
    tileMutations,
    triggeredTerrainEffects,
    nextToolDieSeed
  };
}

function finalizeAppliedResolution(
  context: ToolActionContext,
  resolution: ActionResolution
): ActionResolution {
  if (resolution.kind === "blocked") {
    return resolution;
  }

  // Tool executors own their direct mechanics; terrain stop effects are layered
  // afterward so every tool shares the same landing rules.
  const stopResolution = applyStopTerrainEffects({
    activeTool: context.activeTool,
    actor: context.actor,
    actorPosition: resolution.actor.position,
    affectedPlayers: resolution.affectedPlayers,
    board: context.board,
    players: context.players,
    tileMutations: resolution.tileMutations,
    toolDieSeed: resolution.nextToolDieSeed,
    tools: resolution.tools
  });

  return {
    ...resolution,
    actor: stopResolution.actor,
    affectedPlayers: stopResolution.affectedPlayers,
    tools: stopResolution.tools,
    triggeredTerrainEffects: [
      ...resolution.triggeredTerrainEffects,
      ...stopResolution.triggeredTerrainEffects
    ],
    nextToolDieSeed: stopResolution.nextToolDieSeed
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

// Ground traversal keeps step rules in one place so tools can share terrain and wall logic.
function resolveGroundTraversal(
  context: ToolActionContext,
  direction: Direction,
  movePoints: number,
  maxSteps = Number.POSITIVE_INFINITY
): GroundTraversalResult {
  let currentDirection = direction;
  let currentPosition = context.actor.position;
  let remainingMovePoints = movePoints;
  let remainingSteps = maxSteps;
  const path: GridPosition[] = [];
  const tileMutations: TileMutation[] = [];
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];
  let stopReason = "Movement ended";

  while (remainingMovePoints > 0 && remainingSteps > 0) {
    const target = stepPosition(currentPosition, currentDirection);

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
    remainingSteps -= 1;
    currentPosition = target;
    path.push(target);

    if (tile.type === "earthWall") {
      tileMutations.push(createTileMutation(target));
    }

    const terrainResolution = resolvePassThroughTerrainEffect({
      direction: currentDirection,
      playerId: context.actor.id,
      position: currentPosition,
      remainingMovePoints,
      tile
    });

    currentDirection = terrainResolution.direction;
    remainingMovePoints = terrainResolution.remainingMovePoints;
    triggeredTerrainEffects.push(...terrainResolution.triggeredTerrainEffects);
  }

  return {
    currentDirection,
    path,
    position: currentPosition,
    remainingMovePoints,
    stopReason,
    tileMutations,
    triggeredTerrainEffects
  };
}

function resolveMovementTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const maxMovePoints = context.activeTool.movePoints ?? 0;

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Movement needs a direction",
      context.toolDieSeed
    );
  }

  if (maxMovePoints < 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No move points left",
      context.toolDieSeed
    );
  }

  const traversal = resolveGroundTraversal(context, direction, maxMovePoints);

  // Movement intentionally still resolves when it cannot leave the tile.
  return buildAppliedResolution(
    {
      ...context.actor,
      position: traversal.position
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    traversal.path,
    traversal.tileMutations,
    [],
    traversal.triggeredTerrainEffects
  );
}

function resolveJumpTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Jump needs a direction",
      context.toolDieSeed
    );
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
      {
        ...context.actor,
        position: landing
      },
      consumeActiveTool(context),
      `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
      context.toolDieSeed,
      path
    );
  }

  return buildBlockedResolution(
    context.actor,
    context.tools,
    "No landing tile",
    context.toolDieSeed,
    path
  );
}

function resolveHookshotTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Hookshot needs a direction",
      context.toolDieSeed
    );
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
        return buildBlockedResolution(
          context.actor,
          context.tools,
          "Target cannot be pulled",
          context.toolDieSeed,
          rayPath
        );
      }

      return buildAppliedResolution(
        context.actor,
        consumeActiveTool(context),
        `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
        context.toolDieSeed,
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
        return buildBlockedResolution(
          context.actor,
          context.tools,
          "No hookshot landing space",
          context.toolDieSeed,
          rayPath
        );
      }

      const landing = stepPosition(context.actor.position, direction, distance - 1);

      return buildAppliedResolution(
        {
          ...context.actor,
          position: landing
        },
        consumeActiveTool(context),
        `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
        context.toolDieSeed,
        rayPath
      );
    }
  }

  return buildBlockedResolution(
    context.actor,
    context.tools,
    "No hookshot target",
    context.toolDieSeed,
    rayPath
  );
}

function resolvePivotTool(context: ToolActionContext): ActionResolution {
  return buildAppliedResolution(
    context.actor,
    [...consumeActiveTool(context), createPivotMovementTool(context.activeTool)],
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
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
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    []
  );
}

function resolveBrakeTool(context: ToolActionContext): ActionResolution {
  const maxRange = context.activeTool.range ?? 0;
  const axisTarget = normalizeAxisTarget(context.actor.position, context.targetPosition);

  if (!axisTarget) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Brake needs a target tile",
      context.toolDieSeed
    );
  }

  if (maxRange < 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No brake range left",
      context.toolDieSeed
    );
  }

  const requestedDistance = Math.min(maxRange, axisTarget.distance);
  const traversal = resolveGroundTraversal(
    context,
    axisTarget.direction,
    requestedDistance,
    requestedDistance
  );

  if (!traversal.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      traversal.stopReason,
      context.toolDieSeed
    );
  }

  return buildAppliedResolution(
    {
      ...context.actor,
      position: traversal.position
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    traversal.path,
    traversal.tileMutations,
    [],
    traversal.triggeredTerrainEffects
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
      availability.reason ?? "Tool cannot be used right now",
      context.toolDieSeed
    );
  }

  if (toolDefinition.targetMode === "direction" && !context.direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      `${toolDefinition.label} needs a direction`,
      context.toolDieSeed
    );
  }

  if (toolDefinition.targetMode === "tile" && !context.targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      `${toolDefinition.label} needs a target tile`,
      context.toolDieSeed
    );
  }

  // Tool behavior stays centralized here so room authority and client preview
  // can extend from the same registry instead of branching on tool ids in many places.
  return finalizeAppliedResolution(context, TOOL_EXECUTORS[context.activeTool.toolId](context));
}
