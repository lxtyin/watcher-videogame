import { DEFAULT_BOARD_SYMBOLS, type LayoutSymbolDefinition } from "./content/boards/defaultBoard";
import { DEFAULT_GAME_MAP_ID, getGameMapDefinition, NEWBIE_VILLAGE_MAP_ID } from "./content/maps";
import { createDiceRewardState, parseLuckyRewardToken } from "./diceReward";
import { createDicePigState, parseDicePigCarryToken } from "./dicePig";
import { cloneSummonState } from "./summonState";
import { cloneTileState, isTileStateEmpty } from "./tileState";
import type {
  BoardDefinition,
  BoardSummonState,
  GameMode,
  GridPosition,
  TeamId,
  TileDefinition
} from "./types";

export function toTileKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

interface ParsedLayoutCell {
  descriptor: string;
  featureSymbols: string[];
  tileSymbol: string;
}

interface ResolvedInitialSummon {
  ownerId: string;
  state: BoardSummonState["state"];
  summonId: BoardSummonState["summonId"];
}

interface ResolvedLayoutCell {
  initialSummons: ResolvedInitialSummon[];
  tile: LayoutSymbolDefinition;
}

type LayoutSymbolMap = Record<string, LayoutSymbolDefinition>;

function normalizeLayoutDescriptor(descriptor: string): string {
  return descriptor.trim() || ".";
}

export function splitLayoutRow(row: string): string[] {
  if (row.includes("\t")) {
    return row.split("\t").map(normalizeLayoutDescriptor);
  }

  if (/\s/.test(row)) {
    return row.trim().split(/\s+/).map(normalizeLayoutDescriptor);
  }

  return row.split("").map(normalizeLayoutDescriptor);
}

export function joinLayoutRow(descriptors: readonly string[]): string {
  return descriptors.map(normalizeLayoutDescriptor).join("\t");
}

export function getLayoutWidth(layout: readonly string[]): number {
  return splitLayoutRow(layout[0] ?? "").length;
}

export function getLayoutCellDescriptor(
  layout: readonly string[],
  position: GridPosition
): string {
  return splitLayoutRow(layout[position.y] ?? "")[position.x] ?? ".";
}

export function setLayoutCellDescriptor(
  layout: readonly string[],
  position: GridPosition,
  descriptor: string
): string[] {
  return layout.map((row, rowIndex) => {
    if (rowIndex !== position.y) {
      return row;
    }

    const descriptors = splitLayoutRow(row);
    descriptors[position.x] = normalizeLayoutDescriptor(descriptor);
    return joinLayoutRow(descriptors);
  });
}

function parseLayoutCellDescriptor(descriptor: string): ParsedLayoutCell {
  const normalizedDescriptor = normalizeLayoutDescriptor(descriptor);
  const [tileSymbol = ".", ...featureSymbols] = normalizedDescriptor
    .split("|")
    .map(normalizeLayoutDescriptor);

  return {
    descriptor: normalizedDescriptor,
    featureSymbols,
    tileSymbol
  };
}

function resolveInitialSummonFromSymbol(
  symbolDefinition: LayoutSymbolDefinition | undefined
): ResolvedInitialSummon | null {
  const initialSummon = symbolDefinition?.initialSummon;

  if (!initialSummon) {
    return null;
  }

  return {
    ownerId: initialSummon.ownerId ?? "",
    state: cloneSummonState(initialSummon.state),
    summonId: initialSummon.summonId
  };
}

function resolveInitialSummonFromFeature(featureSymbol: string): ResolvedInitialSummon | null {
  const dicePigCarry = parseDicePigCarryToken(featureSymbol);

  if (!dicePigCarry) {
    return null;
  }

  return {
    ownerId: "",
    state: createDicePigState(dicePigCarry),
    summonId: "dicePig"
  };
}

function resolveLayoutCell(
  descriptor: string,
  symbols: LayoutSymbolMap
): ResolvedLayoutCell {
  const directDefinition = symbols[normalizeLayoutDescriptor(descriptor)];

  if (directDefinition) {
    return {
      initialSummons: [
        resolveInitialSummonFromSymbol(directDefinition)
      ].filter((summon): summon is ResolvedInitialSummon => summon !== null),
      tile: directDefinition
    };
  }

  const parsedCell = parseLayoutCellDescriptor(descriptor);
  const luckyReward = parseLuckyRewardToken(parsedCell.tileSymbol);
  const tileDefinition =
    symbols[parsedCell.tileSymbol] ??
    (luckyReward ? { type: "lucky", state: createDiceRewardState(luckyReward) } : undefined) ??
    (parseDicePigCarryToken(parsedCell.tileSymbol) ? symbols["."] : undefined);

  if (!tileDefinition) {
    throw new Error(`Unknown board layout symbol "${parsedCell.tileSymbol}".`);
  }

  const featureSymbols = [
    ...(parseDicePigCarryToken(parsedCell.tileSymbol) ? [parsedCell.tileSymbol] : []),
    ...parsedCell.featureSymbols
  ];
  const initialSummons = [
    resolveInitialSummonFromSymbol(tileDefinition),
    ...featureSymbols.map((featureSymbol) =>
      resolveInitialSummonFromSymbol(symbols[featureSymbol]) ??
      resolveInitialSummonFromFeature(featureSymbol)
    )
  ].filter((summon): summon is ResolvedInitialSummon => summon !== null);

  return {
    initialSummons,
    tile: tileDefinition
  };
}

function buildBoardFromLayout(
  layout: readonly string[],
  symbols: LayoutSymbolMap
): BoardDefinition {
  if (!layout.length) {
    throw new Error("Board layout must include at least one row.");
  }

  const rows = layout.map(splitLayoutRow);
  const width = rows[0]?.length ?? 0;

  if (!width || rows.some((row) => row.length !== width)) {
    throw new Error("Board layout rows must all exist and share the same width.");
  }

  const tiles: TileDefinition[] = [];

  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const descriptor = rows[y]?.[x] ?? ".";
      const tileConfig = resolveLayoutCell(descriptor, symbols).tile;

      tiles.push({
        key: toTileKey({ x, y }),
        x,
        y,
        type: tileConfig.type,
        durability: tileConfig.durability ?? 0,
        direction: tileConfig.direction ?? null,
        faction: tileConfig.faction ?? null,
        ...(
          isTileStateEmpty(tileConfig.state)
            ? {}
            : { state: cloneTileState(tileConfig.state) }
        )
      });
    }
  }

  return {
    width,
    height: rows.length,
    tiles
  };
}

export function createBoardDefinitionFromLayout(
  layout: readonly string[],
  symbols: Partial<Record<string, LayoutSymbolDefinition>> = {}
): BoardDefinition {
  return buildBoardFromLayout(
    layout,
    {
      ...DEFAULT_BOARD_SYMBOLS,
      ...symbols
    } as LayoutSymbolMap
  );
}

export function createInitialSummonsFromLayout(
  layout: readonly string[],
  symbols: Partial<Record<string, LayoutSymbolDefinition>> = {}
): BoardSummonState[] {
  const normalizedSymbols = {
    ...DEFAULT_BOARD_SYMBOLS,
    ...symbols
  } as LayoutSymbolMap;
  const summons: BoardSummonState[] = [];

  for (let y = 0; y < layout.length; y += 1) {
    const row = splitLayoutRow(layout[y] ?? "");

    for (let x = 0; x < row.length; x += 1) {
      const descriptor = row[x] ?? ".";
      const initialSummons = resolveLayoutCell(descriptor, normalizedSymbols).initialSummons;

      for (const initialSummon of initialSummons) {
        summons.push({
          instanceId: `layout:${initialSummon.summonId}:${x},${y}:${summons.length + 1}`,
          ownerId: initialSummon.ownerId,
          position: { x, y },
          state: cloneSummonState(initialSummon.state),
          summonId: initialSummon.summonId
        });
      }
    }
  }

  return summons;
}

export function layoutCellHasInitialSummon(
  descriptor: string,
  symbols: Partial<Record<string, LayoutSymbolDefinition>> = {}
): boolean {
  const normalizedSymbols = {
    ...DEFAULT_BOARD_SYMBOLS,
    ...symbols
  } as LayoutSymbolMap;

  return resolveLayoutCell(descriptor, normalizedSymbols).initialSummons.length > 0;
}

// Runtime board creation flows through the shared map registry so each map binds mode and spawn rules.
export function createBoardDefinition(mapId: string = NEWBIE_VILLAGE_MAP_ID): BoardDefinition {
  const definition = getGameMapDefinition(mapId);

  return createBoardDefinitionFromLayout(definition.layout, definition.symbols);
}

export function createInitialSummons(mapId: string = NEWBIE_VILLAGE_MAP_ID): BoardSummonState[] {
  const definition = getGameMapDefinition(mapId);

  return createInitialSummonsFromLayout(definition.layout, definition.symbols);
}

// Existing callers still treat the free-mode map as the default board.
export function createDefaultBoardDefinition(): BoardDefinition {
  return createBoardDefinition(NEWBIE_VILLAGE_MAP_ID);
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
    const sourceRow = splitLayoutRow(layout[y] ?? "");
    const resizedRow = Array.from(
      { length: nextWidth },
      (_unusedColumn, x) => sourceRow[x] ?? fillSymbol
    );
    return joinLayoutRow(resizedRow);
  });
}

export function getBoardSpawnPositions(board: BoardDefinition): GridPosition[] {
  return getTilesByType(board, "start").map((tile) => ({
    x: tile.x,
    y: tile.y
  }));
}

export function getBoardTeamSpawnPositions(
  board: BoardDefinition,
  teamId: TeamId
): GridPosition[] {
  return board.tiles
    .filter((tile) => tile.type === "teamSpawn" && tile.faction === teamId)
    .map((tile) => ({
      x: tile.x,
      y: tile.y
    }));
}

export function getBoardSpawnPosition(
  board: BoardDefinition,
  mode: GameMode,
  playerIndex: number,
  teamId: TeamId | null = null
): GridPosition {
  if (mode === "bedwars" && teamId) {
    const teamSpawns = getBoardTeamSpawnPositions(board, teamId);

    if (teamSpawns.length) {
      return teamSpawns[playerIndex % teamSpawns.length] ?? teamSpawns[0] ?? { x: 1, y: 1 };
    }
  }

  const spawnPositions = getBoardSpawnPositions(board);

  if (!spawnPositions.length) {
    return { x: 1, y: 1 };
  }

  if (mode === "race") {
    return spawnPositions[0] ?? { x: 1, y: 1 };
  }

  return spawnPositions[playerIndex % spawnPositions.length] ?? spawnPositions[0] ?? { x: 1, y: 1 };
}
