import type { Direction, TeamId, TileType } from "../../types";

export interface LayoutSymbolDefinition {
  faction?: TeamId;
  type: TileType;
  direction?: Direction;
  durability?: number;
}

// Default board content lives outside the runtime builder so map edits stay data-only.
export const DEFAULT_BOARD_LAYOUT = [
  "###########",
  "#s>lx..g..#",
  "#.v.H..U..#",
  "#.pe#e.L..#",
  "#..^..o...#",
  "#..e..R...#",
  "#D..##..b.#",
  "#....<....#",
  "###########"
] as const;

export const DEFAULT_BOARD_SYMBOLS: Record<string, LayoutSymbolDefinition> = {
  ".": { type: "floor" },
  "#": { type: "wall" },
  e: { type: "earthWall", durability: 2 },
  b: { type: "boxingBall" },
  t: { type: "tower", durability: 5, faction: "white" },
  T: { type: "tower", durability: 5, faction: "black" },
  i: { type: "teamSpawn", faction: "white" },
  I: { type: "teamSpawn", faction: "black" },
  c: { type: "teamCamp", faction: "white" },
  C: { type: "teamCamp", faction: "black" },
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
