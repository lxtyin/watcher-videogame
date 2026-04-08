import type { Direction, TileType } from "../../types";

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
  "#D..##..#",
  "#....<..#",
  "#########"
] as const;

export const DEFAULT_BOARD_SYMBOLS: Record<string, LayoutSymbolDefinition> = {
  ".": { type: "floor" },
  "#": { type: "wall" },
  e: { type: "earthWall", durability: 2 },
  p: { type: "poison" },
  o: { type: "pit" },
  H: { type: "highwall" },
  l: { type: "lucky" },
  x: { type: "emptyLucky" },
  s: { type: "start" },
  g: { type: "goal" },
  "^": { type: "conveyor", direction: "up" },
  v: { type: "conveyor", direction: "down" },
  "<": { type: "conveyor", direction: "left" },
  ">": { type: "conveyor", direction: "right" },
  "D": { type: "cannon", direction: "down" },
  "U": { type: "cannon", direction: "up" },
  "L": { type: "cannon", direction: "left" },
  "R": { type: "cannon", direction: "right" },
};
