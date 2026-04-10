import type { TileDefinition } from "../types";
import { CANNON_TERRAIN_MODULE } from "./cannon";
import { CONVEYOR_TERRAIN_MODULE } from "./conveyor";
import { EARTH_WALL_TERRAIN_MODULE } from "./earth-wall";
import { EMPTY_LUCKY_TERRAIN_MODULE } from "./empty-lucky";
import { FLOOR_TERRAIN_MODULE } from "./floor";
import { GOAL_TERRAIN_MODULE } from "./goal";
import { HIGHWALL_TERRAIN_MODULE } from "./highwall";
import { LUCKY_TERRAIN_MODULE } from "./lucky";
import { PIT_TERRAIN_MODULE } from "./pit";
import { POISON_TERRAIN_MODULE } from "./poison";
import { START_TERRAIN_MODULE } from "./start";
import type { TerrainModule } from "./types";
import { WALL_TERRAIN_MODULE } from "./wall";

function defineTerrainModules<const Modules extends readonly TerrainModule[]>(modules: Modules): Modules {
  return modules;
}

export const TERRAIN_MODULES = defineTerrainModules([
  FLOOR_TERRAIN_MODULE,
  WALL_TERRAIN_MODULE,
  EARTH_WALL_TERRAIN_MODULE,
  POISON_TERRAIN_MODULE,
  PIT_TERRAIN_MODULE,
  CANNON_TERRAIN_MODULE,
  LUCKY_TERRAIN_MODULE,
  EMPTY_LUCKY_TERRAIN_MODULE,
  CONVEYOR_TERRAIN_MODULE,
  START_TERRAIN_MODULE,
  GOAL_TERRAIN_MODULE,
  HIGHWALL_TERRAIN_MODULE
] as const);

export const TERRAIN_REGISTRY = Object.fromEntries(
  TERRAIN_MODULES.map((module) => [module.type, module] as const)
) as unknown as Record<(typeof TERRAIN_MODULES)[number]["type"], TerrainModule>;

export function getTerrainModule(tileType: TileDefinition["type"]): TerrainModule {
  return TERRAIN_REGISTRY[tileType];
}
