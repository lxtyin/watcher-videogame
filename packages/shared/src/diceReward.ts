import { MOVEMENT_DIE_FACES } from "./constants";
import type { RolledToolId, TileStateMap } from "./types";

export const DICE_REWARD_STATE_KEY = "reward";
export const DEFAULT_DICE_REWARD_CODE = "random_tool";
export const DICE_REWARD_TOOL_IDS = [
  "jump",
  "hookshot",
  "basketball",
  "buildWall",
  "rocket",
  "punch"
] as const satisfies readonly RolledToolId[];

export type DiceRewardPointCode = `point:${typeof MOVEMENT_DIE_FACES[number]}`;
export type DiceRewardToolCode = `tool:${RolledToolId}`;
export type DiceRewardCode = "random_tool" | DiceRewardPointCode | DiceRewardToolCode;

export interface DiceRewardVariant {
  code: DiceRewardCode;
  token: string;
}

function isMovementDieFace(value: number): value is typeof MOVEMENT_DIE_FACES[number] {
  return MOVEMENT_DIE_FACES.includes(value as typeof MOVEMENT_DIE_FACES[number]);
}

function isRolledToolId(value: string): value is RolledToolId {
  return DICE_REWARD_TOOL_IDS.includes(value as (typeof DICE_REWARD_TOOL_IDS)[number]);
}

export function normalizeDiceRewardCode(value: unknown): DiceRewardCode {
  if (value === "random_tool") {
    return value;
  }

  if (typeof value !== "string") {
    return DEFAULT_DICE_REWARD_CODE;
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

  return DEFAULT_DICE_REWARD_CODE;
}

export function createDiceRewardState(rewardCode: DiceRewardCode = DEFAULT_DICE_REWARD_CODE): TileStateMap {
  return {
    [DICE_REWARD_STATE_KEY]: rewardCode
  };
}

export function getDiceRewardCode(
  state: Record<string, unknown> | undefined,
  stateKey = DICE_REWARD_STATE_KEY
): DiceRewardCode {
  return normalizeDiceRewardCode(state?.[stateKey]);
}

export function parseLuckyRewardToken(token: string): DiceRewardCode | null {
  const normalizedToken = token.trim();
  const pointMatch = normalizedToken.match(/^(?:L|Lucky)([1-6])$/);

  if (pointMatch?.[1]) {
    return `point:${pointMatch[1]}` as DiceRewardPointCode;
  }

  if (normalizedToken === "L?" || normalizedToken === "Lucky?" || normalizedToken === "Lucky") {
    return "random_tool";
  }

  const toolToken = normalizedToken.startsWith("L:")
    ? normalizedToken.slice(2)
    : normalizedToken.startsWith("Lucky:")
      ? normalizedToken.slice("Lucky:".length)
      : null;

  if (toolToken && isRolledToolId(toolToken)) {
    return `tool:${toolToken}`;
  }

  return null;
}

export function getLuckyRewardToken(rewardCode: DiceRewardCode): string {
  if (rewardCode === "random_tool") {
    return "L?";
  }

  if (rewardCode.startsWith("point:")) {
    return `L${rewardCode.slice("point:".length)}`;
  }

  return `L:${rewardCode.slice("tool:".length)}`;
}

export function getDiceRewardVariants(): DiceRewardVariant[] {
  return [
    ...MOVEMENT_DIE_FACES.map((face) => {
      const code = `point:${face}` as DiceRewardPointCode;

      return {
        code,
        token: getLuckyRewardToken(code)
      };
    }),
    ...DICE_REWARD_TOOL_IDS.map((toolId) => {
      const code = `tool:${toolId}` as DiceRewardToolCode;

      return {
        code,
        token: getLuckyRewardToken(code)
      };
    }),
    {
      code: "random_tool",
      token: getLuckyRewardToken("random_tool")
    }
  ];
}
