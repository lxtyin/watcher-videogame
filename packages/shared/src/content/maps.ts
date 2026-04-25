import type { GameMode } from "./schema";
import {
  DEFAULT_BOARD_LAYOUT,
  DEFAULT_BOARD_SYMBOLS,
  type LayoutSymbolDefinition
} from "./boards/defaultBoard";
import { BEDWARS_BOARD_LAYOUT, BEDWARS_BOARD_SYMBOLS } from "./boards/bedwarsBoard";
import { RACE_BOARD_LAYOUT, RACE_BOARD_SYMBOLS } from "./boards/raceBoard";
import { RACE_BOARD2_LAYOUT, RACE_BOARD2_SYMBOLS } from "./boards/raceBoard2";

interface MapGridPosition {
  x: number;
  y: number;
}

export interface GameMapContentDefinition {
  allowDebugTools: boolean;
  description: string;
  label: string;
  layout: readonly string[];
  mode: GameMode;
  spawnMode: "cycle" | "shared";
  spawnPositions: readonly MapGridPosition[];
  symbols?: Partial<Record<string, LayoutSymbolDefinition>>;
}

function defineGameMapRegistry<const Registry extends Record<string, GameMapContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const DEFAULT_GAME_MAP_ID = "free_default" as const;
export const RACE_GAME_MAP_ID = "race_sprint" as const;
export const RACE_GAME2_MAP_ID = "race_sprint2" as const;
export const BEDWARS_GAME_MAP_ID = "bedwars_test" as const;

export const GAME_MAP_REGISTRY = defineGameMapRegistry({
  [DEFAULT_GAME_MAP_ID]: {
    label: "自由模式默认地图",
    description: "保留调试入口的基础沙盒地图，适合自由试验工具、角色和地形联动。",
    mode: "free",
    allowDebugTools: true,
    layout: DEFAULT_BOARD_LAYOUT,
    symbols: DEFAULT_BOARD_SYMBOLS,
    spawnMode: "cycle",
    spawnPositions: [
      { x: 1, y: 1 },
      { x: 7, y: 7 },
      { x: 1, y: 7 },
      { x: 7, y: 1 }
    ]
  },
  [RACE_GAME_MAP_ID]: {
    label: "竞速模式测试地图",
    description: "所有玩家共享出生点，沿着加速带与机关冲向终点，先到先得。",
    mode: "race",
    allowDebugTools: false,
    layout: RACE_BOARD_LAYOUT,
    symbols: {
      ...DEFAULT_BOARD_SYMBOLS,
      ...RACE_BOARD_SYMBOLS
    },
    spawnMode: "shared",
    spawnPositions: [{ x: 2, y: 6 }]
  },
  [RACE_GAME2_MAP_ID]: {
    label: "竞速模式测试地图2",
    description: "所有玩家共享出生点，沿着加速带与机关冲向终点，先到先得。",
    mode: "race",
    allowDebugTools: false,
    layout: RACE_BOARD2_LAYOUT,
    symbols: {
      ...DEFAULT_BOARD_SYMBOLS,
      ...RACE_BOARD2_SYMBOLS
    },
    spawnMode: "shared",
    spawnPositions: [{ x: 2, y: 1 }]
  },
  [BEDWARS_GAME_MAP_ID]: {
    label: "起床战争测试图",
    description: "一个用于验证阵营出生点、塔、营地、复活与眩晕规则的小型对战地图。",
    mode: "bedwars",
    allowDebugTools: true,
    layout: BEDWARS_BOARD_LAYOUT,
    symbols: {
      ...DEFAULT_BOARD_SYMBOLS,
      ...BEDWARS_BOARD_SYMBOLS
    },
    spawnMode: "cycle",
    spawnPositions: [
      { x: 1, y: 1 },
      { x: 13, y: 1 }
    ]
  }
});

export type GameMapRegistry = typeof GAME_MAP_REGISTRY;

export function getGameMapIds(): Array<keyof GameMapRegistry> {
  return Object.keys(GAME_MAP_REGISTRY) as Array<keyof GameMapRegistry>;
}

// Invalid map ids fall back to the free board so direct URL edits stay safe.
export function resolveGameMapId(mapId?: string): keyof GameMapRegistry {
  if (mapId && mapId in GAME_MAP_REGISTRY) {
    return mapId as keyof GameMapRegistry;
  }

  return DEFAULT_GAME_MAP_ID;
}

export function getGameMapDefinition(mapId?: string): GameMapRegistry[keyof GameMapRegistry] {
  return GAME_MAP_REGISTRY[resolveGameMapId(mapId)];
}

export function getGameMapSpawnPosition(
  mapId: string | undefined,
  playerIndex: number
): MapGridPosition {
  const definition = getGameMapDefinition(mapId);
  const spawnIndex =
    definition.spawnMode === "shared"
      ? 0
      : playerIndex % Math.max(1, definition.spawnPositions.length);

  return definition.spawnPositions[spawnIndex] ?? definition.spawnPositions[0] ?? { x: 1, y: 1 };
}
