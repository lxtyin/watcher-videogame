import { MOVEMENT_DIE_FACES } from "./constants";
import { getRollableToolIds } from "./tools";
import type { RolledToolId, SummonStateMap } from "./types";

export const DICE_PIG_CARRY_STATE_KEY = "carry";
export const DEFAULT_DICE_PIG_CARRY_CODE = "random_tool";

export type DicePigPointCarryCode = `point:${typeof MOVEMENT_DIE_FACES[number]}`;
export type DicePigToolCarryCode = `tool:${RolledToolId}`;
export type DicePigCarryCode =
  | "none"
  | "random_tool"
  | DicePigPointCarryCode
  | DicePigToolCarryCode;

export interface DicePigCarryVariant {
  code: DicePigCarryCode;
  token: string;
}

function isMovementDieFace(value: number): value is typeof MOVEMENT_DIE_FACES[number] {
  return MOVEMENT_DIE_FACES.includes(value as typeof MOVEMENT_DIE_FACES[number]);
}

function isRolledToolId(value: string): value is RolledToolId {
  return getRollableToolIds().includes(value as RolledToolId);
}

export function createDicePigState(
  carryCode: DicePigCarryCode = DEFAULT_DICE_PIG_CARRY_CODE
): SummonStateMap {
  return {
    [DICE_PIG_CARRY_STATE_KEY]: carryCode
  };
}

export function normalizeDicePigCarryCode(value: unknown): DicePigCarryCode {
  if (value === "none" || value === "random_tool") {
    return value;
  }

  if (typeof value !== "string") {
    return DEFAULT_DICE_PIG_CARRY_CODE;
  }

  const pointMatch = value.match(/^point:([1-6])$/);
  if (pointMatch?.[1]) {
    const pointValue = Number.parseInt(pointMatch[1], 10);

    if (isMovementDieFace(pointValue)) {
      return `point:${pointValue}`;
    }
  }

  if (value.startsWith("tool:")) {
    const toolId = value.slice("tool:".length);

    if (isRolledToolId(toolId)) {
      return `tool:${toolId}`;
    }
  }

  return DEFAULT_DICE_PIG_CARRY_CODE;
}

export function getDicePigCarryCode(state: SummonStateMap | undefined): DicePigCarryCode {
  return normalizeDicePigCarryCode(state?.[DICE_PIG_CARRY_STATE_KEY]);
}

export function parseDicePigCarryToken(token: string): DicePigCarryCode | null {
  const normalizedToken = token.trim();
  const pointMatch = normalizedToken.match(/^p([1-6])$/);

  if (pointMatch?.[1]) {
    return `point:${pointMatch[1]}` as DicePigPointCarryCode;
  }

  if (normalizedToken === "p?" || normalizedToken === "pr" || normalizedToken === "randomPig") {
    return "random_tool";
  }

  if (normalizedToken === "pn" || normalizedToken === "p0" || normalizedToken === "emptyPig") {
    return "none";
  }

  const toolToken = normalizedToken.startsWith("p:")
    ? normalizedToken.slice(2)
    : normalizedToken.startsWith("pig:")
      ? normalizedToken.slice(4)
      : null;

  if (toolToken && isRolledToolId(toolToken)) {
    return `tool:${toolToken}`;
  }

  return null;
}

export function getDicePigCarryToken(carryCode: DicePigCarryCode): string {
  if (carryCode === "none") {
    return "pn";
  }

  if (carryCode === "random_tool") {
    return "p?";
  }

  if (carryCode.startsWith("point:")) {
    return `p${carryCode.slice("point:".length)}`;
  }

  return `p:${carryCode.slice("tool:".length)}`;
}

export function getDicePigCarryVariants(): DicePigCarryVariant[] {
  return [
    ...MOVEMENT_DIE_FACES.map((face) => {
      const code = `point:${face}` as DicePigPointCarryCode;

      return {
        code,
        token: getDicePigCarryToken(code)
      };
    }),
    ...getRollableToolIds().map((toolId) => {
      const code = `tool:${toolId}` as DicePigToolCarryCode;

      return {
        code,
        token: getDicePigCarryToken(code)
      };
    }),
    {
      code: "random_tool",
      token: getDicePigCarryToken("random_tool")
    },
    {
      code: "none",
      token: getDicePigCarryToken("none")
    }
  ];
}
