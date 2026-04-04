import type { LayoutSymbolDefinition } from "./defaultBoard";

// The first race track stays compact so goal flow and settlement rules are easy to iterate on.
export const RACE_BOARD_LAYOUT = [
  "######################",
  "#...v...........eee..#",
  "#....#...........###.#",
  "#..lp.##....#...##.g.#",
  "#e.#.......#p...l###.#",
  "#..#......#..........#",
  "#.s#.....##......e...#",
  "#.##............e....#",
  "#....^.........e....p#",
  "######################"
] as const;

export const RACE_BOARD_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};
