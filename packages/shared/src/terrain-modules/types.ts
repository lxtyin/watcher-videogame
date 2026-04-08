import type { Direction, GridPosition, MovementActor, MovementDescriptor, TileDefinition } from "../types";
import type { ResolutionDraft } from "../rules/actionDraft";

export interface PassThroughTerrainState {
  direction: Direction | null;
  player: MovementActor;
  remainingMovePoints: number | null;
  shouldResolveStopTriggers: boolean;
}

export interface TerrainPassThroughContext {
  draft: ResolutionDraft;
  movement: MovementDescriptor;
  state: PassThroughTerrainState;
  tile: TileDefinition;
}

export interface TerrainStopContext {
  draft: ResolutionDraft;
  movement: MovementDescriptor | null;
  player: MovementActor;
  position: GridPosition;
  tile: TileDefinition;
}

export interface TerrainModule {
  blocksGroundMovement?: boolean;
  blocksLeapTraversal?: boolean;
  blocksProjectile?: boolean;
  onPassThrough?: (context: TerrainPassThroughContext) => void;
  onStop?: (context: TerrainStopContext) => void;
  type: TileDefinition["type"];
}
