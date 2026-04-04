import type { LayoutSymbolDefinition } from "./defaultBoard";

// The first race track stays compact so goal flow and settlement rules are easy to iterate on.
export const RACE_BOARD_LAYOUT = [
  "####################",
  "#p..v.....e.v...e..#",
  "#p...#.........###.#",
  "#p.lp.##...#..##pg.#",
  "##.#......#p..l###.#",
  "#..#....p#.......#.#",
  "#.s#..ee##....<e.#.#",
  "#.##.....#...e...p.#",
  "#l...^.....^.e...p.#",
  "####################"
] as const;

export const RACE_BOARD_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};
