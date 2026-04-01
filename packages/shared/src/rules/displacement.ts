import type {
  GridPosition,
  MovementDescriptor,
  MovementDisposition,
  MovementType,
  ResolvedPlayerMovement
} from "../types";

// Movement descriptors make traversal, leap, and drag triggers explicit across board systems.
export function createMovementDescriptor(
  type: MovementType,
  disposition: MovementDisposition
): MovementDescriptor {
  return {
    type,
    disposition
  };
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
