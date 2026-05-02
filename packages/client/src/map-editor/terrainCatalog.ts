import {
  getDiceRewardVariants,
  getDicePigCarryVariants,
  getToolDefinition
} from "@watcher/shared";
import {
  createTerrainThumbnailTile,
  expandTerrainThumbnailEntriesForCapture,
  findTerrainThumbnailEntry,
  TERRAIN_THUMBNAIL_ENTRIES,
  type TerrainThumbnailEntry
} from "../game/assets/board/terrainThumbnailCatalog";

export type TerrainLibraryEntry = TerrainThumbnailEntry;

export const createTerrainCatalogTile = createTerrainThumbnailTile;

function getDicePigVariantLabel(code: ReturnType<typeof getDicePigCarryVariants>[number]["code"]): string {
  if (code === "none") {
    return "骰子猪 无奖励";
  }

  if (code === "random_tool") {
    return "骰子猪 随机工具";
  }

  if (code.startsWith("point:")) {
    return `骰子猪 移动${code.slice("point:".length)}`;
  }

  return `骰子猪 ${getToolDefinition(code.slice("tool:".length) as Parameters<typeof getToolDefinition>[0]).label}`;
}

function getLuckyVariantLabel(code: ReturnType<typeof getDiceRewardVariants>[number]["code"]): string {
  if (code === "random_tool") {
    return "幸运方块 随机工具";
  }

  if (code.startsWith("point:")) {
    return `幸运方块 移动${code.slice("point:".length)}`;
  }

  return `幸运方块 ${getToolDefinition(code.slice("tool:".length) as Parameters<typeof getToolDefinition>[0]).label}`;
}

const DICE_PIG_SYMBOLS = getDicePigCarryVariants().map((variant) => `.|${variant.token}`);

const DICE_PIG_LIBRARY_ENTRY: TerrainLibraryEntry = {
  label: "骰子猪",
  selectableSymbols: DICE_PIG_SYMBOLS,
  symbol: DICE_PIG_SYMBOLS[0] ?? ".|p1",
  tile: createTerrainCatalogTile(DICE_PIG_SYMBOLS[0] ?? ".|p1")
};

const DICE_PIG_VARIANT_LABELS = Object.fromEntries(
  getDicePigCarryVariants().map((variant) => [
    `.|${variant.token}`,
    getDicePigVariantLabel(variant.code)
  ])
) as Record<string, string>;

const LUCKY_VARIANT_LABELS = Object.fromEntries(
  getDiceRewardVariants().map((variant) => [
    variant.token,
    getLuckyVariantLabel(variant.code)
  ])
) as Record<string, string>;

export const TERRAIN_LIBRARY_ENTRIES: TerrainLibraryEntry[] = [
  ...TERRAIN_THUMBNAIL_ENTRIES,
  DICE_PIG_LIBRARY_ENTRY
];

export function findTerrainLibraryEntry(symbol: string | null): TerrainLibraryEntry | null {
  if (!symbol) {
    return null;
  }

  return (
    TERRAIN_LIBRARY_ENTRIES.find(
      (entry) => entry.symbol === symbol || entry.selectableSymbols?.includes(symbol)
    ) ??
    findTerrainThumbnailEntry(symbol)
  );
}

export function cycleTerrainSymbolVariant(symbol: string | null): string | null {
  const entry = findTerrainLibraryEntry(symbol);
  const variants = entry?.selectableSymbols ?? (entry ? [entry.symbol] : []);

  if (!symbol || variants.length <= 1) {
    return symbol;
  }

  const currentIndex = variants.indexOf(symbol);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % variants.length;

  return variants[nextIndex] ?? symbol;
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
    label: DICE_PIG_VARIANT_LABELS[symbol] ?? LUCKY_VARIANT_LABELS[symbol] ?? entry.label,
    symbol,
    tile: createTerrainCatalogTile(symbol)
  };
}

export function expandTerrainLibraryEntriesForCapture(
  entries: readonly TerrainLibraryEntry[]
): TerrainLibraryEntry[] {
  return expandTerrainThumbnailEntriesForCapture(entries);
}
