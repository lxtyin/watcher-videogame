import {
  DEFAULT_BOARD_SYMBOLS,
  type LayoutSymbolDefinition
} from "../content/boards/defaultBoard";
import type {
  BoardDefinition,
  GridPosition,
  TileDefinition
} from "../types";

function clonePosition(position: GridPosition): GridPosition {
  return {
    x: position.x,
    y: position.y
  };
}

function toTileKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

// Golden cases use the same compact symbol board format as the default game board.
export function buildGoldenLayoutSymbols(
  overrides: Partial<Record<string, LayoutSymbolDefinition>> = {}
): Record<string, LayoutSymbolDefinition> {
  return {
    ...DEFAULT_BOARD_SYMBOLS,
    ...overrides
  } as Record<string, LayoutSymbolDefinition>;
}

// Layout parsing keeps small scenario boards data-only and easy to diff in reviews.
export function createBoardDefinitionFromGoldenLayout(
  layout: readonly string[],
  symbolOverrides: Partial<Record<string, LayoutSymbolDefinition>> = {}
): BoardDefinition {
  if (!layout.length) {
    throw new Error("Golden layout must include at least one row.");
  }

  const width = layout[0]?.length ?? 0;

  if (!width) {
    throw new Error("Golden layout rows must not be empty.");
  }

  if (layout.some((row) => row.length !== width)) {
    throw new Error("Golden layout rows must all have the same width.");
  }

  const symbols = buildGoldenLayoutSymbols(symbolOverrides);
  const tiles: TileDefinition[] = [];

  layout.forEach((row, y) => {
    row.split("").forEach((symbol, x) => {
      const definition = symbols[symbol];

      if (!definition) {
        throw new Error(`Unknown golden layout symbol "${symbol}" at (${x}, ${y}).`);
      }

      const position = { x, y };
      tiles.push({
        key: toTileKey(position),
        x,
        y,
        type: definition.type,
        durability: definition.durability ?? 0,
        direction: definition.direction ?? null,
        faction: definition.faction ?? null
      });
    });
  });

  return {
    width,
    height: layout.length,
    tiles
  };
}

function symbolMatchesTile(
  symbolDefinition: LayoutSymbolDefinition,
  tile: Pick<TileDefinition, "direction" | "durability" | "faction" | "type">
): boolean {
  return (
    symbolDefinition.type === tile.type &&
    (symbolDefinition.durability ?? 0) === tile.durability &&
    (symbolDefinition.direction ?? null) === tile.direction &&
    (symbolDefinition.faction ?? null) === tile.faction
  );
}

// Board serialization reuses the case symbol legend so expected and actual maps stay compact.
export function serializeGoldenBoardLayout(
  board: BoardDefinition,
  symbolOverrides: Partial<Record<string, LayoutSymbolDefinition>> = {}
): string[] {
  const symbols = buildGoldenLayoutSymbols(symbolOverrides);
  const tilesByKey = new Map(
    board.tiles.map((tile) => [tile.key, tile] as const)
  );

  return Array.from({ length: board.height }, (_, y) =>
    Array.from({ length: board.width }, (_, x) => {
      const position = clonePosition({ x, y });
      const tile = tilesByKey.get(toTileKey(position));

      if (!tile) {
        return "?";
      }

      const matchingSymbol = Object.entries(symbols).find(([, symbolDefinition]) =>
        symbolMatchesTile(symbolDefinition, tile)
      );

      return matchingSymbol?.[0] ?? "?";
    }).join("")
  );
}
