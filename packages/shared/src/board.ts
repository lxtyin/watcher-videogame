import { DEFAULT_GAME_MAP_ID, getGameMapDefinition } from "./content/maps";
import type {
  BoardDefinition,
  GridPosition,
  TileDefinition
} from "./types";

export function toTileKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

function buildBoardFromLayout(
  layout: readonly string[],
  symbols: Record<
    string,
    {
      direction?: TileDefinition["direction"];
      durability?: number;
      type: TileDefinition["type"];
    }
  >
): BoardDefinition {
  if (!layout.length) {
    throw new Error("Board layout must include at least one row.");
  }

  const width = layout[0]?.length ?? 0;

  if (!width || layout.some((row) => row.length !== width)) {
    throw new Error("Board layout rows must all exist and share the same width.");
  }

  const tiles: TileDefinition[] = [];

  for (let y = 0; y < layout.length; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // Character lookup keeps the board editable without changing runtime code.
      const symbol = layout[y]?.[x] ?? ".";
      const tileConfig = symbols[symbol] ?? symbols["."]!;

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
    width,
    height: layout.length,
    tiles
  };
}

// Runtime board creation flows through the shared map registry so each map binds mode and spawn rules.
export function createBoardDefinition(mapId: string = DEFAULT_GAME_MAP_ID): BoardDefinition {
  const definition = getGameMapDefinition(mapId);

  return buildBoardFromLayout(
    definition.layout,
    definition.symbols as Record<
      string,
      {
        direction?: TileDefinition["direction"];
        durability?: number;
        type: TileDefinition["type"];
      }
    >
  );
}

// Existing callers still treat the free-mode map as the default board.
export function createDefaultBoardDefinition(): BoardDefinition {
  return createBoardDefinition(DEFAULT_GAME_MAP_ID);
}

// Tile lookup stays centralized so movement and terrain code share one access path.
export function getTile(board: BoardDefinition, position: GridPosition): TileDefinition | undefined {
  return board.tiles.find((tile) => tile.x === position.x && tile.y === position.y);
}

export function getTilesByType(board: BoardDefinition, type: TileDefinition["type"]): TileDefinition[] {
  return board.tiles.filter((tile) => tile.type === type);
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
