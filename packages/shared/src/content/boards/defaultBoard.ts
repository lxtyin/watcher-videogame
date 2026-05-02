import { createDicePigState } from "../../dicePig";
import {
  createDiceRewardState,
  getDiceRewardVariants
} from "../../diceReward";
import type {
  Direction,
  SummonId,
  SummonStateMap,
  TeamId,
  TileStateMap,
  TileType
} from "../../types";

export interface LayoutSymbolDefinition {
  faction?: TeamId;
  initialSummon?: {
    ownerId?: string;
    state?: SummonStateMap;
    summonId: SummonId;
  };
  type: TileType;
  direction?: Direction;
  durability?: number;
  state?: TileStateMap;
}

// Default board content lives outside the runtime builder so map edits stay data-only.
export const DEFAULT_BOARD_LAYOUT = [
  "#\t#\t#\t#\t#\t#\t#\t#\t#\t#\t#",
  "#\tStart\tV>\tL?\tL1\t.\t.\tGoal\t.\t.\t#",
  "#\t.\tVv\t.\tHigh\t.\t.\tC^\t.\t.\t#",
  "#\t.\tPoison\tE2\t#\tE2\t.\tC<\t.\t.\t#",
  "#\t.\t.\tV^\t.\t.\tPit\t.|p?\t.\t.\t#",
  "#\t.\t.\tE2\t.\t.\tC>\t.\t.\t.\t#",
  "#\tCv\t.\t.\t#\t#\t.\t.\tBox\t.\t#",
  "#\t.\t.\t.\t.\tV<\t.\t.\t.\t.\t#",
  "#\t#\t#\t#\t#\t#\t#\t#\t#\t#\t#"
] as const;

const LUCKY_BOARD_SYMBOLS = Object.fromEntries(
  getDiceRewardVariants().map((variant) => [
    variant.token,
    {
      type: "lucky",
      state: createDiceRewardState(variant.code)
    } satisfies LayoutSymbolDefinition
  ])
) as Record<string, LayoutSymbolDefinition>;

const CANONICAL_BOARD_SYMBOLS: Record<string, LayoutSymbolDefinition> = {
  ".": { type: "floor" },
  "#": { type: "wall" },
  E2: { type: "earthWall", durability: 2 },
  Box: { type: "boxingBall" },
  TowerW: { type: "tower", durability: 5, faction: "white" },
  TowerB: { type: "tower", durability: 5, faction: "black" },
  SpawnW: { type: "teamSpawn", faction: "white" },
  SpawnB: { type: "teamSpawn", faction: "black" },
  CampW: { type: "teamCamp", faction: "white" },
  CampB: { type: "teamCamp", faction: "black" },
  Poison: { type: "poison" },
  Pit: { type: "pit" },
  High: { type: "highwall" },
  Lucky: { type: "lucky", state: createDiceRewardState() },
  Lucky0: { type: "lucky", state: createDiceRewardState() },
  ...LUCKY_BOARD_SYMBOLS,
  Start: { type: "start" },
  Goal: { type: "goal" },
  "V^": { type: "conveyor", direction: "up" },
  Vv: { type: "conveyor", direction: "down" },
  "V<": { type: "conveyor", direction: "left" },
  "V>": { type: "conveyor", direction: "right" },
  Cv: { type: "cannon", direction: "down" },
  "C^": { type: "cannon", direction: "up" },
  "C<": { type: "cannon", direction: "left" },
  "C>": { type: "cannon", direction: "right" }
};

const LEGACY_BOARD_SYMBOLS: Record<string, LayoutSymbolDefinition> = {
  e: CANONICAL_BOARD_SYMBOLS.E2!,
  b: CANONICAL_BOARD_SYMBOLS.Box!,
  P: { type: "floor", initialSummon: { summonId: "dicePig", state: createDicePigState() } },
  t: CANONICAL_BOARD_SYMBOLS.TowerW!,
  T: CANONICAL_BOARD_SYMBOLS.TowerB!,
  i: CANONICAL_BOARD_SYMBOLS.SpawnW!,
  I: CANONICAL_BOARD_SYMBOLS.SpawnB!,
  c: CANONICAL_BOARD_SYMBOLS.CampW!,
  C: CANONICAL_BOARD_SYMBOLS.CampB!,
  p: CANONICAL_BOARD_SYMBOLS.Poison!,
  o: CANONICAL_BOARD_SYMBOLS.Pit!,
  H: CANONICAL_BOARD_SYMBOLS.High!,
  l: CANONICAL_BOARD_SYMBOLS.Lucky!,
  x: CANONICAL_BOARD_SYMBOLS.Lucky!,
  s: CANONICAL_BOARD_SYMBOLS.Start!,
  g: CANONICAL_BOARD_SYMBOLS.Goal!,
  "^": CANONICAL_BOARD_SYMBOLS["V^"]!,
  v: CANONICAL_BOARD_SYMBOLS.Vv!,
  "<": CANONICAL_BOARD_SYMBOLS["V<"]!,
  ">": CANONICAL_BOARD_SYMBOLS["V>"]!,
  D: CANONICAL_BOARD_SYMBOLS.Cv!,
  U: CANONICAL_BOARD_SYMBOLS["C^"]!,
  L: CANONICAL_BOARD_SYMBOLS["C<"]!,
  R: CANONICAL_BOARD_SYMBOLS["C>"]!
};

export const DEFAULT_BOARD_SYMBOLS: Record<string, LayoutSymbolDefinition> = {
  ...CANONICAL_BOARD_SYMBOLS,
  ...LEGACY_BOARD_SYMBOLS
};
