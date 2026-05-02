import {
  createBoardDefinitionFromLayout,
  DEFAULT_BOARD_SYMBOLS,
  getDiceRewardVariants,
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
  const board = createBoardDefinitionFromLayout([`${symbol}\t.`]);
  const tile = board.tiles[0];

  if (!tile) {
    throw new Error(`Unknown terrain symbol "${symbol}".`);
  }

  return {
    ...tile,
    key: toTileKey({ x: 0, y: 0 }),
    x: 0,
    y: 0
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
  createTerrainThumbnailEntry("E2"),
  createTerrainThumbnailEntry("Box"),
  createTerrainThumbnailEntry("TowerW", ["TowerW", "TowerB"]),
  createTerrainThumbnailEntry("SpawnW", ["SpawnW", "SpawnB"]),
  createTerrainThumbnailEntry("CampW", ["CampW", "CampB"]),
  createTerrainThumbnailEntry("High"),
  createTerrainThumbnailEntry("Poison"),
  createTerrainThumbnailEntry("Pit"),
  createTerrainThumbnailEntry("L?", getDiceRewardVariants().map((variant) => variant.token)),
  createTerrainThumbnailEntry("Start"),
  createTerrainThumbnailEntry("Goal"),
  createTerrainThumbnailEntry("V^", ["V^", "V>", "Vv", "V<"]),
  createTerrainThumbnailEntry("C^", ["C^", "C>", "Cv", "C<"])
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

  return (
    (definition.direction ?? null) === tile.direction &&
    (definition.durability ?? 0) === tile.durability &&
    (definition.faction ?? null) === tile.faction &&
    stateMapsEqual(definition.state, tile.state)
  );
}

function stateMapsEqual(
  left: TileDefinition["state"] | undefined,
  right: TileDefinition["state"] | undefined
): boolean {
  const leftState = left ?? {};
  const rightState = right ?? {};
  const leftKeys = Object.keys(leftState);
  const rightKeys = Object.keys(rightState);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => leftState[key] === rightState[key]);
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
