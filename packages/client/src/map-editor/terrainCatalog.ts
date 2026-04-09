import {
  DEFAULT_BOARD_SYMBOLS,
  toTileKey,
  type TileDefinition
} from "@watcher/shared";

export interface TerrainLibraryEntry {
  label: string;
  selectableSymbols?: readonly string[];
  symbol: string;
  tile: TileDefinition;
}

export function createTerrainCatalogTile(symbol: string): TileDefinition {
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

function createTerrainLibraryEntry(
  symbol: string,
  label: string,
  selectableSymbols?: readonly string[]
): TerrainLibraryEntry {
  return {
    label,
    symbol,
    ...(selectableSymbols ? { selectableSymbols } : {}),
    tile: createTerrainCatalogTile(symbol)
  };
}

export const TERRAIN_LIBRARY_ENTRIES: TerrainLibraryEntry[] = [
  createTerrainLibraryEntry(".", "地板"),
  createTerrainLibraryEntry("#", "墙壁"),
  createTerrainLibraryEntry("e", "土墙"),
  createTerrainLibraryEntry("H", "高墙"),
  createTerrainLibraryEntry("p", "毒气"),
  createTerrainLibraryEntry("o", "坑洞"),
  createTerrainLibraryEntry("l", "幸运方块"),
  createTerrainLibraryEntry("x", "空幸运方块"),
  createTerrainLibraryEntry("s", "出生点"),
  createTerrainLibraryEntry("g", "终点"),
  createTerrainLibraryEntry("^", "传送带", ["^", ">", "v", "<"]),
  createTerrainLibraryEntry("U", "大炮", ["U", "R", "D", "L"])
];

export function findTerrainLibraryEntry(symbol: string | null): TerrainLibraryEntry | null {
  if (!symbol) {
    return null;
  }

  return (
    TERRAIN_LIBRARY_ENTRIES.find(
      (entry) => entry.symbol === symbol || entry.selectableSymbols?.includes(symbol)
    ) ?? null
  );
}

const CLOCKWISE_ROTATION: Readonly<Record<string, string>> = {
  "^": ">",
  ">": "v",
  v: "<",
  "<": "^",
  U: "R",
  R: "D",
  D: "L",
  L: "U"
};

export function rotateTerrainSymbolClockwise(symbol: string | null): string | null {
  if (!symbol) {
    return symbol;
  }

  return CLOCKWISE_ROTATION[symbol] ?? symbol;
}

export function resolveTerrainEntrySelectionSymbol(
  entry: TerrainLibraryEntry,
  currentSymbol: string | null
): string {
  if (entry.selectableSymbols?.includes(currentSymbol ?? "")) {
    return currentSymbol ?? entry.symbol;
  }

  return entry.symbol;
}

export function isTerrainEntrySelected(
  entry: TerrainLibraryEntry,
  currentSymbol: string | null
): boolean {
  if (!currentSymbol) {
    return false;
  }

  return entry.symbol === currentSymbol || entry.selectableSymbols?.includes(currentSymbol) === true;
}

export function resolveSelectedTerrain(symbol: string | null): TerrainLibraryEntry | null {
  const entry = findTerrainLibraryEntry(symbol);

  if (!entry || !symbol) {
    return null;
  }

  return {
    ...entry,
    symbol,
    tile: createTerrainCatalogTile(symbol)
  };
}

export function expandTerrainLibraryEntriesForCapture(
  entries: readonly TerrainLibraryEntry[]
): TerrainLibraryEntry[] {
  return entries.flatMap((entry) => {
    const symbols = entry.selectableSymbols ?? [entry.symbol];

    return symbols.map((symbol) => ({
      ...entry,
      symbol,
      tile: createTerrainCatalogTile(symbol)
    }));
  });
}
