import { getTile, isWithinBoard, toTileKey } from "../board";
import type {
  BoardDefinition,
  BoardPlayerState,
  BoardSummonState,
  Direction,
  GridPosition,
  TileDefinition,
  TileMutation,
  TileType,
  ToolActionContext
} from "../types";
import { getSummonDefinition } from "../summons";

export interface AxisTarget {
  direction: Direction;
  distance: number;
  snappedTarget: GridPosition;
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
        entities: BoardEntityState[];
        kind: "entity";
        position: GridPosition;
        previousPosition: GridPosition;
      };
  path: GridPosition[];
}

export type BoardEntityState =
  | {
      id: string;
      kind: "player";
      player: BoardPlayerState;
      position: GridPosition;
    }
  | {
      id: string;
      kind: "summon";
      position: GridPosition;
      summon: BoardSummonState;
    };

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

// Opposite directions are reused when projectiles or hookshots reverse a target path.
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

// Ground blockers prevent landing and direct entry.
export function isSolidTileType(tileType: TileType): boolean {
  return (
    tileType === "wall" ||
    tileType === "earthWall" ||
    tileType === "boxingBall" ||
    tileType === "tower" ||
    tileType === "highwall"
  );
}

export function isLeapBlockingTileType(tileType: TileType): boolean {
  return tileType == "highwall";
}

export function isProjectileBlockingTileType(tileType: TileType): boolean {
  return (
    tileType === "wall" ||
    tileType === "earthWall" ||
    tileType === "boxingBall" ||
    tileType === "tower" ||
    tileType === "highwall"
  );
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

export function isCreatureSummon(summon: BoardSummonState): boolean {
  return getSummonDefinition(summon.summonId).kind === "creature";
}

export function findMovableEntitiesAtPosition(
  players: BoardPlayerState[],
  summons: BoardSummonState[],
  position: GridPosition,
  ignoredEntityIds: string[] = []
): BoardEntityState[] {
  const playerEntities: BoardEntityState[] = players
    .filter(
      (player) =>
        !ignoredEntityIds.includes(player.id) &&
        player.position.x === position.x &&
        player.position.y === position.y
    )
    .map((player) => ({
      id: player.id,
      kind: "player" as const,
      player,
      position: player.position
    }));
  const summonEntities: BoardEntityState[] = summons
    .filter(
      (summon) =>
        isCreatureSummon(summon) &&
        !ignoredEntityIds.includes(summon.instanceId) &&
        summon.position.x === position.x &&
        summon.position.y === position.y
    )
    .map((summon) => ({
      id: summon.instanceId,
      kind: "summon" as const,
      position: summon.position,
      summon
    }));

  return [...playerEntities, ...summonEntities];
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

  return !!tile && !isSolidTileType(tile.type);
}

// Tile mutations are emitted through one helper so floors and walls use the same sync path.
export function createTileMutation(
  position: GridPosition,
  nextType: TileType,
  nextDurability: number,
  presentationStartMs?: number,
  nextState?: TileMutation["nextState"]
): TileMutation {
  return {
    key: toTileKey(position),
    position,
    nextType,
    nextDurability,
    ...(nextState === undefined ? {} : { nextState }),
    ...(presentationStartMs === undefined ? {} : { presentationStartMs })
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

// Leap landing search ignores blockers between start and landing, but the landing itself must be valid.
export function resolveLeapLanding(
  board: BoardDefinition,
  startPosition: GridPosition,
  direction: Direction,
  maxDistance: number,
  tileMutations: TileMutation[] = []
): { landing: GridPosition | null; path: GridPosition[] } {
  const traversedPath: GridPosition[] = [];

  for (let distance = 1; distance <= maxDistance; distance += 1) {
    const position = stepPosition(startPosition, direction, distance);

    if (!isWithinBoard(board, position)) {
      break;
    }

    traversedPath.push(position);
    const tile = getTileAfterMutations(board, tileMutations, position);

    if (tile && isLeapBlockingTileType(tile.type)) {
      break;
    }
  }

  for (let index = traversedPath.length - 1; index >= 0; index -= 1) {
    const landing = traversedPath[index]!;

    if (isLandablePosition(board, landing, tileMutations)) {
      return {
        landing,
        path: traversedPath.slice(0, index + 1)
      };
    }
  }

  return {
    landing: null,
    path: traversedPath
  };
}

// Projectile tracing stops on the first solid tile or tile that contains any players.
export function traceProjectile(
  context: ToolActionContext,
  direction: Direction,
  maxDistance: number,
  maxBounces: number
): ProjectileTraceResult {
  return traceProjectileFromPosition(
    {
      board: context.board,
      players: context.players,
      summons: context.summons
    },
    context.actor.position,
    direction,
    maxDistance,
    maxBounces
  );
}

export function traceProjectileFromPosition(
  context: Pick<ToolActionContext, "board" | "players" | "summons">,
  startPosition: GridPosition,
  direction: Direction,
  maxDistance: number,
  maxBounces: number
): ProjectileTraceResult {
  let currentDirection = direction;
  let currentPosition = startPosition;
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

    if (tile && isProjectileBlockingTileType(tile.type)) {
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

    const hitEntities = findMovableEntitiesAtPosition(context.players, context.summons, target, []);

    if (hitEntities.length) {
      return {
        path,
        collision: {
          kind: "entity",
          position: target,
          previousPosition: path[path.length - 2] ?? startPosition,
          direction: currentDirection,
          entities: hitEntities
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
