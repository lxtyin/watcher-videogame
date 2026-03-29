import { MOVEMENT_DIE_FACES } from "./constants";
import { TOOL_DIE_FACES } from "./tools";
import type { ToolId } from "./types";

export interface DieRollResult<T> {
  value: T;
  nextSeed: number;
}

export function nextDeterministicSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

function rollFromFaces<T>(faces: readonly T[], seed: number): DieRollResult<T> {
  const nextSeed = nextDeterministicSeed(seed);
  const faceIndex = nextSeed % faces.length;

  return {
    value: faces[faceIndex]!,
    nextSeed
  };
}

export function rollMovementDie(seed: number): DieRollResult<number> {
  return rollFromFaces(MOVEMENT_DIE_FACES, seed);
}

export function rollToolDie(seed: number): DieRollResult<ToolId> {
  return rollFromFaces(TOOL_DIE_FACES, seed);
}
