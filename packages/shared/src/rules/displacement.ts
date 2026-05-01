import type {
  GridPosition,
  MovementDescriptor,
  MovementDisposition,
  MovementTiming,
  MovementType,
  ResolvedPlayerMovement
} from "../types";
export interface MovementDescriptorOptions {
  tags?: readonly string[];
  timing?: MovementTiming;
}

export function createMovementDescriptor(
  type: MovementType,
  disposition: MovementDisposition,
  options: MovementDescriptorOptions = {}
): MovementDescriptor {
  return {
    type,
    disposition,
    timing: options.timing ?? (disposition === "active" ? "in_turn" : "out_of_turn"),
    tags: [...(options.tags ?? [])]
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

export function isMovementTiming(
  movement: MovementDescriptor | null,
  timing: MovementTiming
): boolean {
  return movement?.timing === timing;
}

export function hasMovementTag(
  movement: MovementDescriptor | null,
  tag: string
): boolean {
  return movement?.tags.includes(tag) ?? false;
}
