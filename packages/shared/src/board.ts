import { DEFAULT_BOARD_SYMBOLS, type LayoutSymbolDefinition } from "./content/boards/defaultBoard";
import { DEFAULT_GAME_MAP_ID, getGameMapDefinition } from "./content/maps";
import type {
  BoardDefinition,
  GameMode,
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

export function createBoardDefinitionFromLayout(
  layout: readonly string[],
  symbols: Partial<Record<string, LayoutSymbolDefinition>> = DEFAULT_BOARD_SYMBOLS
): BoardDefinition {
  return buildBoardFromLayout(
    layout,
    symbols as Record<
      string,
      {
        direction?: TileDefinition["direction"];
        durability?: number;
        type: TileDefinition["type"];
      }
    >
  );
}

// Runtime board creation flows through the shared map registry so each map binds mode and spawn rules.
export function createBoardDefinition(mapId: string = DEFAULT_GAME_MAP_ID): BoardDefinition {
  const definition = getGameMapDefinition(mapId);

  return createBoardDefinitionFromLayout(definition.layout, definition.symbols);
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

export function resizeBoardLayout(
  layout: readonly string[],
  nextWidth: number,
  nextHeight: number,
  fillSymbol = "."
): string[] {
  if (nextWidth < 1 || nextHeight < 1) {
    throw new Error("Board size must stay positive.");
  }

  return Array.from({ length: nextHeight }, (_unused, y) => {
    const sourceRow = layout[y] ?? "";
    const resizedRow = Array.from({ length: nextWidth }, (_unusedColumn, x) => sourceRow[x] ?? fillSymbol);
    return resizedRow.join("");
  });
}

export function getBoardSpawnPositions(board: BoardDefinition): GridPosition[] {
  return getTilesByType(board, "start").map((tile) => ({
    x: tile.x,
    y: tile.y
  }));
}

export function getBoardSpawnPosition(
  board: BoardDefinition,
  mode: GameMode,
  playerIndex: number
): GridPosition {
  const spawnPositions = getBoardSpawnPositions(board);

  if (!spawnPositions.length) {
    return { x: 1, y: 1 };
  }

  if (mode === "race") {
    return spawnPositions[0] ?? { x: 1, y: 1 };
  }

  return spawnPositions[playerIndex % spawnPositions.length] ?? spawnPositions[0] ?? { x: 1, y: 1 };
}
