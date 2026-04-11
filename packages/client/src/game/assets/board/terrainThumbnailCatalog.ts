import {
  DEFAULT_BOARD_SYMBOLS,
  getTerrainTextDescription,
  toTileKey,
  type TileDefinition
} from "@watcher/shared";

export interface TerrainThumbnailEntry {
  label: string;
  selectableSymbols?: readonly string[];
  symbol: string;
  tile: TileDefinition;
}

export function createTerrainThumbnailTile(symbol: string): TileDefinition {
  const definition = DEFAULT_BOARD_SYMBOLS[symbol];

  if (!definition) {
    throw new Error(`Unknown terrain symbol "${symbol}".`);
  }

  const position = { x: 0, y: 0 };

  return {
    key: toTileKey(position),
    x: position.x,
    y: position.y,
    type: definition.type,
    durability: definition.durability ?? 0,
    direction: definition.direction ?? null
  };
}

function createTerrainThumbnailEntry(
  symbol: string,
  selectableSymbols?: readonly string[]
): TerrainThumbnailEntry {
  const tile = createTerrainThumbnailTile(symbol);

  return {
    label: getTerrainTextDescription(tile).title,
    symbol,
    ...(selectableSymbols ? { selectableSymbols } : {}),
    tile
  };
}

export const TERRAIN_THUMBNAIL_ENTRIES: TerrainThumbnailEntry[] = [
  createTerrainThumbnailEntry("."),
  createTerrainThumbnailEntry("#"),
  createTerrainThumbnailEntry("e"),
  createTerrainThumbnailEntry("H"),
  createTerrainThumbnailEntry("p"),
  createTerrainThumbnailEntry("o"),
  createTerrainThumbnailEntry("l"),
  createTerrainThumbnailEntry("x"),
  createTerrainThumbnailEntry("s"),
  createTerrainThumbnailEntry("g"),
  createTerrainThumbnailEntry("^", ["^", ">", "v", "<"]),
  createTerrainThumbnailEntry("U", ["U", "R", "D", "L"])
];

export function findTerrainThumbnailEntry(symbol: string | null): TerrainThumbnailEntry | null {
  if (!symbol) {
    return null;
  }

  return (
    TERRAIN_THUMBNAIL_ENTRIES.find(
      (entry) => entry.symbol === symbol || entry.selectableSymbols?.includes(symbol)
    ) ?? null
  );
}

export function expandTerrainThumbnailEntriesForCapture(
  entries: readonly TerrainThumbnailEntry[]
): TerrainThumbnailEntry[] {
  return entries.flatMap((entry) => {
    const symbols = entry.selectableSymbols ?? [entry.symbol];

    return symbols.map((symbol) => {
      const tile = createTerrainThumbnailTile(symbol);

      return {
        ...entry,
        label: getTerrainTextDescription(tile).title,
        symbol,
        tile
      };
    });
  });
}

function matchesTileSymbol(symbol: string, tile: TileDefinition): boolean {
  const definition = DEFAULT_BOARD_SYMBOLS[symbol];

  if (!definition || definition.type !== tile.type) {
    return false;
  }

  return (definition.direction ?? null) === tile.direction;
}

export function resolveTerrainThumbnailSymbol(tile: TileDefinition): string | null {
  const symbol = Object.keys(DEFAULT_BOARD_SYMBOLS).find((candidate) => matchesTileSymbol(candidate, tile));

  return symbol ?? null;
}

export function createTerrainThumbnailEntryForTile(tile: TileDefinition): TerrainThumbnailEntry {
  const symbol = resolveTerrainThumbnailSymbol(tile) ?? tile.type;
  const label = getTerrainTextDescription(tile).title;

  return {
    label,
    symbol,
    tile: {
      ...tile,
      key: toTileKey({ x: 0, y: 0 }),
      x: 0,
      y: 0
    }
  };
}
