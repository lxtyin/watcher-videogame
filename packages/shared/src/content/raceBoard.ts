import type { LayoutSymbolDefinition } from "./defaultBoard";

// The first race track stays compact so goal flow and settlement rules are easy to iterate on.
export const RACE_BOARD_LAYOUT = [
  "#########",
  "#s..>...#",
  "#.##v#..#",
  "#..l.#.g#",
  "#..#.^..#",
  "#..#....#",
  "#..e....#",
  "#....<..#",
  "#########"
] as const;

export const RACE_BOARD_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};
