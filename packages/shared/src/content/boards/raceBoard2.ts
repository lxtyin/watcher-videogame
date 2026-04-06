import type { LayoutSymbolDefinition } from "./defaultBoard";

// The first race track stays compact so goal flow and settlement rules are easy to iterate on.
export const RACE_BOARD2_LAYOUT = [
  "###################",
  "#ps..>..........v.#",
  "##....e.ppe.p.ee..#",
  "###....#.........p#",
  "####.....ele...p.##",
  "#####l.......<....#",
  "#..###p##p...####p#",
  "#...p#.##...>..p..#",
  "#.l...^..^.e..le.e#",
  "###....e.p..eppe..#",
  "#pg.^.pe....<...<p#",
  "###################"
] as const;

export const RACE_BOARD2_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};
