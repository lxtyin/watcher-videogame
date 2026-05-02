import type {
  GridPosition,
  MovementDescriptor,
  MovementDisposition,
  MovementTiming,
  MovementType,
  ResolvedPlayerMovement
} from "../types";


export function createMovementDescriptor(
  type: MovementType,
  disposition: MovementDisposition,
  tags?: readonly string[]
): MovementDescriptor {
  return {
    type,
    disposition,
    tags: [...(tags ?? [])]
  };
}

export function getMovementTimingForPlayer(
  actorId: string,
  playerId: string
): MovementTiming {
  return actorId === playerId ? "in_turn" : "out_of_turn";
}

// Resolved movement records track who moved, how they moved, and which cells were traversed.
export function createResolvedPlayerMovement(
  playerId: string,
  startPosition: GridPosition,
  path: GridPosition[],
  movement: MovementDescriptor
): ResolvedPlayerMovement | null {
  const target = path[path.length - 1];

  if (!target) {
    return null;
  }

  return {
    playerId,
    startPosition,
    path,
    target,
    movement
  };
}

export function isMovementType(
  movement: MovementDescriptor | null,
  type: MovementType
): boolean {
  return movement?.type === type;
}

export function isMovementDisposition(
  movement: MovementDescriptor | null,
  disposition: MovementDisposition
): boolean {
  return movement?.disposition === disposition;
}

export function hasMovementTag(
  movement: MovementDescriptor | null,
  tag: string
): boolean {
  return movement?.tags.includes(tag) ?? false;
}
