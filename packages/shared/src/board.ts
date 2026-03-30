import { BOARD_HEIGHT, BOARD_WIDTH } from "./constants";
import { DEFAULT_BOARD_LAYOUT, DEFAULT_BOARD_SYMBOLS } from "./content/defaultBoard";
import type {
  BoardDefinition,
  GridPosition,
  TileDefinition
} from "./types";

export function toTileKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

// The default board comes from a compact symbol layout so prototype maps stay easy to edit.
export function createDefaultBoardDefinition(): BoardDefinition {
  const tiles: TileDefinition[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      // Character lookup keeps the board editable without changing runtime code.
      const symbol = DEFAULT_BOARD_LAYOUT[y]?.[x] ?? ".";
      const tileConfig = DEFAULT_BOARD_SYMBOLS[symbol] ?? DEFAULT_BOARD_SYMBOLS["."]!;

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
