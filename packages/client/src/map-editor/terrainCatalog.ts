import {
  createTerrainThumbnailTile,
  expandTerrainThumbnailEntriesForCapture,
  findTerrainThumbnailEntry,
  TERRAIN_THUMBNAIL_ENTRIES,
  type TerrainThumbnailEntry
} from "../game/assets/board/terrainThumbnailCatalog";

export type TerrainLibraryEntry = TerrainThumbnailEntry;

export const createTerrainCatalogTile = createTerrainThumbnailTile;

export const TERRAIN_LIBRARY_ENTRIES: TerrainLibraryEntry[] = TERRAIN_THUMBNAIL_ENTRIES;

export function findTerrainLibraryEntry(symbol: string | null): TerrainLibraryEntry | null {
  return findTerrainThumbnailEntry(symbol);
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
  return expandTerrainThumbnailEntriesForCapture(entries);
}
