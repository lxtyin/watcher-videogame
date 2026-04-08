import type { TileDefinition } from "../types";

interface TerrainTraversalProfile {
  blocksGroundMovement: boolean;
  blocksLeapTraversal: boolean;
  blocksProjectile: boolean;
}

const TERRAIN_TRAVERSAL_PROFILES: Record<TileDefinition["type"], TerrainTraversalProfile> = {
  floor: {
    blocksGroundMovement: false,
    blocksLeapTraversal: false,
    blocksProjectile: false
  },
  wall: {
    blocksGroundMovement: true,
    blocksLeapTraversal: false,
    blocksProjectile: true
  },
  earthWall: {
    blocksGroundMovement: false,
    blocksLeapTraversal: false,
    blocksProjectile: true
  },
  highwall: {
    blocksGroundMovement: true,
    blocksLeapTraversal: true,
    blocksProjectile: true
  },
  poison: {
    blocksGroundMovement: false,
    blocksLeapTraversal: false,
    blocksProjectile: false
  },
  pit: {
    blocksGroundMovement: false,
    blocksLeapTraversal: false,
    blocksProjectile: false
  },
  cannon: {
    blocksGroundMovement: false,
    blocksLeapTraversal: false,
    blocksProjectile: false
  },
  lucky: {
    blocksGroundMovement: false,
    blocksLeapTraversal: false,
    blocksProjectile: false
  },
  emptyLucky: {
    blocksGroundMovement: false,
    blocksLeapTraversal: false,
    blocksProjectile: false
  },
  conveyor: {
    blocksGroundMovement: false,
    blocksLeapTraversal: false,
    blocksProjectile: false
  },
  start: {
    blocksGroundMovement: false,
    blocksLeapTraversal: false,
    blocksProjectile: false
  },
  goal: {
    blocksGroundMovement: false,
    blocksLeapTraversal: false,
    blocksProjectile: false
  }
};

export function blocksGroundMovementForTileType(tileType: TileDefinition["type"]): boolean {
  return TERRAIN_TRAVERSAL_PROFILES[tileType].blocksGroundMovement;
}

export function blocksProjectileForTileType(tileType: TileDefinition["type"]): boolean {
  return TERRAIN_TRAVERSAL_PROFILES[tileType].blocksProjectile;
}

export function blocksLeapTraversalForTileType(tileType: TileDefinition["type"]): boolean {
  return TERRAIN_TRAVERSAL_PROFILES[tileType].blocksLeapTraversal;
}
