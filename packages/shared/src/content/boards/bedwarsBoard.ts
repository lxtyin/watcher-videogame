import type { LayoutSymbolDefinition } from "./defaultBoard";

export const BEDWARS_BOARD_LAYOUT = [
  "###############",
  "#.t.c.........#",
  "#i......p.....#",
  "#.c..###......#",
  "#........C...T#",
  "#.....p.....I.#",
  "###############"
] as const;

export const BEDWARS_BOARD_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};

