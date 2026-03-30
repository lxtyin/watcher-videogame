import { getTile, isWithinBoard, toTileKey } from "../board";
import { resolvePassThroughTerrainEffect } from "../terrain";
import type {
  BoardDefinition,
  BoardPlayerState,
  Direction,
  GridPosition,
  TileDefinition,
  TileMutation,
  TileType,
  ToolActionContext,
  TriggeredTerrainEffect
} from "../types";

export interface AxisTarget {
  direction: Direction;
  distance: number;
  snappedTarget: GridPosition;
}

export interface GroundTraversalResult {
  currentDirection: Direction;
  path: GridPosition[];
  position: GridPosition;
  remainingMovePoints: number;
  stopReason: string;
  tileMutations: TileMutation[];
  triggeredTerrainEffects: TriggeredTerrainEffect[];
}

export interface GroundTraversalOptions {
  actorId: string;
  board: BoardDefinition;
  direction: Direction;
  maxSteps?: number;
  movePoints: number;
  position: GridPosition;
  priorTileMutations?: TileMutation[];
}

export interface ProjectileTraceResult {
  collision:
    | {
        direction: Direction;
        endPosition: GridPosition;
        kind: "none";
      }
    | {
        direction: Direction;
        endPosition: GridPosition;
        kind: "edge";
      }
    | {
        direction: Direction;
        kind: "solid";
        position: GridPosition;
        previousPosition: GridPosition;
        tile: TileDefinition;
      }
    | {
        direction: Direction;
        kind: "player";
        players: BoardPlayerState[];
        position: GridPosition;
        previousPosition: GridPosition;
      };
  path: GridPosition[];
}

const DIRECTION_VECTORS: Record<Direction, GridPosition> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

export const CARDINAL_DIRECTIONS: Direction[] = ["up", "right", "down", "left"];

function toPositionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

export function getDirectionVector(direction: Direction): GridPosition {
  return DIRECTION_VECTORS[direction];
}

// Opposite directions are reused when hookshot pulls a target back toward the actor.
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

// Step math stays centralized so every tool uses the same board coordinate system.
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

// Solid tiles block both grounded traversal and landing checks.
export function isSolidTileType(tileType: TileType): boolean {
  return tileType === "wall" || tileType === "earthWall";
}

export function positionsEqual(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

function dedupePositions(positions: GridPosition[]): GridPosition[] {
  const seen = new Set<string>();

  return positions.filter((position) => {
    const key = toPositionKey(position);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function findPlayersAtPosition(
  players: BoardPlayerState[],
  position: GridPosition,
  ignoredPlayerIds: string[] = []
): BoardPlayerState[] {
  return players.filter(
    (player) =>
      !ignoredPlayerIds.includes(player.id) &&
      player.position.x === position.x &&
      player.position.y === position.y
  );
}

// Tile lookups can be overridden by pending mutations during one composite action.
export function getTileAfterMutations(
  board: BoardDefinition,
  tileMutations: TileMutation[],
  position: GridPosition
): TileDefinition | null {
  const tile = getTile(board, position);

  if (!tile) {
    return null;
  }

  const matchingMutation = tileMutations.find((entry) => entry.key === tile.key);

  if (!matchingMutation) {
    return tile;
  }

  return {
    ...tile,
    type: matchingMutation.nextType,
    durability: matchingMutation.nextDurability
  };
}

// Landing validation only checks board topology now that players can stack.
export function isLandablePosition(
  board: BoardDefinition,
  position: GridPosition,
  tileMutations: TileMutation[] = []
): boolean {
  if (!isWithinBoard(board, position)) {
    return false;
  }

  const tile = getTileAfterMutations(board, tileMutations, position);

  if (!tile || isSolidTileType(tile.type)) {
    return false;
  }

  return true;
}

// Tile mutations are emitted through one helper so floors and walls use the same room sync path.
export function createTileMutation(
  position: GridPosition,
  nextType: TileType,
  nextDurability: number
): TileMutation {
  return {
    key: toTileKey(position),
    position,
    nextType,
    nextDurability
  };
}

// Tile-target tools snap off-axis drags onto one cardinal lane before resolving.
export function normalizeAxisTarget(
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

// Ground traversal is shared by movement and push-like effects so tile rules stay identical.
export function resolveGroundTraversal(options: GroundTraversalOptions): GroundTraversalResult {
  let currentDirection = options.direction;
  let currentPosition = options.position;
  let remainingMovePoints = options.movePoints;
  let remainingSteps = options.maxSteps ?? Number.POSITIVE_INFINITY;
  const path: GridPosition[] = [];
  const tileMutations: TileMutation[] = [];
  const effectiveTileMutations = [...(options.priorTileMutations ?? [])];
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];
  let stopReason = "Movement ended";

  while (remainingMovePoints > 0 && remainingSteps > 0) {
    const target = stepPosition(currentPosition, currentDirection);

    if (!isWithinBoard(options.board, target)) {
      stopReason = "Board edge";
      break;
    }

    const tile = getTileAfterMutations(options.board, effectiveTileMutations, target);

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
      const mutation = createTileMutation(target, "floor", 0);
      tileMutations.push(mutation);
      effectiveTileMutations.push(mutation);
    }

    const terrainResolution = resolvePassThroughTerrainEffect({
      direction: currentDirection,
      playerId: options.actorId,
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

// Leap resolution reuses landing rules while ignoring walls between start and destination.
export function resolveLeapLanding(
  board: BoardDefinition,
  startPosition: GridPosition,
  direction: Direction,
  maxDistance: number,
  tileMutations: TileMutation[] = []
): { landing: GridPosition | null; path: GridPosition[] } {
  for (let distance = maxDistance; distance >= 1; distance -= 1) {
    const landing = stepPosition(startPosition, direction, distance);

    if (isLandablePosition(board, landing, tileMutations)) {
      const path = Array.from({ length: distance }, (_, index) =>
        stepPosition(startPosition, direction, index + 1)
      );

      return {
        landing,
        path
      };
    }
  }

  return {
    landing: null,
    path: []
  };
}

// Push resolution is grounded traversal with a move budget equal to push strength.
export function resolvePushTarget(
  context: ToolActionContext,
  pushedPlayer: BoardPlayerState,
  direction: Direction,
  distance: number,
  priorTileMutations: TileMutation[] = []
): GroundTraversalResult {
  return resolveGroundTraversal({
    actorId: pushedPlayer.id,
    board: context.board,
    direction,
    movePoints: distance,
    position: pushedPlayer.position,
    priorTileMutations
  });
}

// Projectile tracing stops on the first solid tile or tile that contains any players.
export function traceProjectile(
  context: ToolActionContext,
  direction: Direction,
  maxDistance: number,
  maxBounces: number
): ProjectileTraceResult {
  let currentDirection = direction;
  let currentPosition = context.actor.position;
  let remainingBounces = maxBounces;
  const path: GridPosition[] = [];

  for (let step = 0; step < maxDistance; step += 1) {
    const target = stepPosition(currentPosition, currentDirection);

    if (!isWithinBoard(context.board, target)) {
      return {
        path,
        collision: {
          kind: "edge",
          endPosition: currentPosition,
          direction: currentDirection
        }
      };
    }

    const tile = getTile(context.board, target);

    if (tile && isSolidTileType(tile.type)) {
      if (remainingBounces > 0) {
        remainingBounces -= 1;
        currentDirection = getOppositeDirection(currentDirection);
        currentPosition = target;
        continue;
      }

      return {
        path,
        collision: {
          kind: "solid",
          position: target,
          previousPosition: currentPosition,
          direction: currentDirection,
          tile
        }
      };
    }

    currentPosition = target;
    path.push(target);

    const hitPlayers = findPlayersAtPosition(context.players, target, []);

    if (hitPlayers.length) {
      return {
        path,
        collision: {
          kind: "player",
          position: target,
          previousPosition: path[path.length - 2] ?? context.actor.position,
          direction: currentDirection,
          players: hitPlayers
        }
      };
    }
  }

  return {
    path,
    collision: {
      kind: "none",
      endPosition: currentPosition,
      direction: currentDirection
    }
  };
}

export function collectExplosionPreviewTiles(
  board: BoardDefinition,
  center: GridPosition
): GridPosition[] {
  return dedupePositions([
    center,
    ...CARDINAL_DIRECTIONS.map((direction) => stepPosition(center, direction))
  ]).filter((position) => isWithinBoard(board, position));
}
