import type { Direction, TileType } from "../types";

export interface LayoutSymbolDefinition {
  type: TileType;
  direction?: Direction;
  durability?: number;
}

// Default board content lives outside the runtime builder so map edits stay data-only.
export const DEFAULT_BOARD_LAYOUT = [
  "#########",
  "#.>l#...#",
  "#.v.#...#",
  "#.pe#e..#",
  "#..^....#",
  "#..e....#",
  "#...##..#",
  "#....<..#",
  "#########"
] as const;

export const DEFAULT_BOARD_SYMBOLS: Record<string, LayoutSymbolDefinition> = {
  ".": { type: "floor" },
  "#": { type: "wall" },
  e: { type: "earthWall", durability: 2 },
  p: { type: "pit" },
  l: { type: "lucky" },
  s: { type: "start" },
  g: { type: "goal" },
  "^": { type: "conveyor", direction: "up" },
  v: { type: "conveyor", direction: "down" },
  "<": { type: "conveyor", direction: "left" },
  ">": { type: "conveyor", direction: "right" }
};
