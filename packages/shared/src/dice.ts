import { MOVEMENT_DIE_FACES } from "./constants";
import { TOOL_DIE_FACES } from "./tools";
import type { ToolDieFaceDefinition } from "./types";

export interface DieRollResult<T> {
  value: T;
  nextSeed: number;
}

// Dice rolls stay deterministic so server authority and tests can replay the same sequence.
export function nextDeterministicSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

// Shared face rolling keeps movement and tool dice on the same seeded path.
function rollFromFaces<T>(faces: readonly T[], seed: number): DieRollResult<T> {
  const nextSeed = nextDeterministicSeed(seed);
  const faceIndex = nextSeed % faces.length;

  return {
    value: faces[faceIndex]!,
    nextSeed
  };
}

// The movement die feeds the per-turn Movement tool instance.
export function rollMovementDie(seed: number): DieRollResult<number> {
  return rollFromFaces(MOVEMENT_DIE_FACES, seed);
}

// The tool die selects one configured face, including its base parameters.
export function rollToolDie(seed: number): DieRollResult<ToolDieFaceDefinition> {
  return rollFromFaces(TOOL_DIE_FACES, seed);
}
