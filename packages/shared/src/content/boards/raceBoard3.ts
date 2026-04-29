import type { LayoutSymbolDefinition } from "./defaultBoard";

export const RACE_BOARD3_LAYOUT = [
  "##############",
  "#l#...sHogooo#",
  "#.o....Hl..eR#",
  "#v...HHHHH..e#",
  "#...##ol....e#",
  "#.ee#o...ee.<#",
  "#...#...<...L#",
  "#..l...##ooU.#",
  "#pU.>.p.>...p#",
  "##############"
] as const;


export const RACE_BOARD3_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};
