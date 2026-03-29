import { BOARD_HEIGHT, BOARD_WIDTH } from "./constants";
import type { BoardDefinition, GridPosition, TileDefinition, TileType } from "./types";

// The layout is intentionally tiny so the first prototype stays easy to inspect.
const LAYOUT = [
  "..#....",
  ".e.#...",
  "...#e..",
  ".......",
  "..e....",
  "...##..",
  "....e.."
] as const;

const SYMBOL_TO_TILE: Record<string, TileType> = {
  ".": "floor",
  "#": "wall",
  e: "earthWall"
};

export function toTileKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

export function createDefaultBoardDefinition(): BoardDefinition {
  const tiles: TileDefinition[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      // Character lookup keeps the board editable without changing runtime code.
      const symbol = LAYOUT[y]?.[x] ?? ".";
      const type = SYMBOL_TO_TILE[symbol] ?? "floor";

      tiles.push({
        key: toTileKey({ x, y }),
        x,
        y,
        type,
        durability: type === "earthWall" ? 2 : 0
      });
    }
  }

  return {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    tiles
  };
}

export function getTile(board: BoardDefinition, position: GridPosition): TileDefinition | undefined {
  return board.tiles.find((tile) => tile.x === position.x && tile.y === position.y);
}

export function isWithinBoard(board: BoardDefinition, position: GridPosition): boolean {
  return (
    position.x >= 0 &&
    position.x < board.width &&
    position.y >= 0 &&
    position.y < board.height
  );
}
