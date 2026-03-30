import { BOARD_HEIGHT, BOARD_WIDTH } from "./constants";
import type {
  BoardDefinition,
  Direction,
  GridPosition,
  TileDefinition,
  TileType
} from "./types";

// The layout is intentionally tiny so the first prototype stays easy to inspect.
const LAYOUT = [
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

interface LayoutSymbolDefinition {
  type: TileType;
  direction?: Direction;
  durability?: number;
}

const SYMBOL_TO_TILE: Record<string, LayoutSymbolDefinition> = {
  ".": { type: "floor" },
  "#": { type: "wall" },
  e: { type: "earthWall", durability: 2 },
  p: { type: "pit" },
  l: { type: "lucky" },
  "^": { type: "conveyor", direction: "up" },
  v: { type: "conveyor", direction: "down" },
  "<": { type: "conveyor", direction: "left" },
  ">": { type: "conveyor", direction: "right" }
};

export function toTileKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

// The default board comes from a compact symbol layout so prototype maps stay easy to edit.
export function createDefaultBoardDefinition(): BoardDefinition {
  const tiles: TileDefinition[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      // Character lookup keeps the board editable without changing runtime code.
      const symbol = LAYOUT[y]?.[x] ?? ".";
      const tileConfig = SYMBOL_TO_TILE[symbol] ?? SYMBOL_TO_TILE["."]!;

      tiles.push({
        key: toTileKey({ x, y }),
        x,
        y,
        type: tileConfig.type,
        durability: tileConfig.durability ?? 0,
        direction: tileConfig.direction ?? null
      });
    }
  }

  return {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    tiles
  };
}

// Tile lookup stays centralized so movement and terrain code share one access path.
export function getTile(board: BoardDefinition, position: GridPosition): TileDefinition | undefined {
  return board.tiles.find((tile) => tile.x === position.x && tile.y === position.y);
}

// Bounds checks are shared by both authoritative resolution and client previews.
export function isWithinBoard(board: BoardDefinition, position: GridPosition): boolean {
  return (
    position.x >= 0 &&
    position.x < board.width &&
    position.y >= 0 &&
    position.y < board.height
  );
}
