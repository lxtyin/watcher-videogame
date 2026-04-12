import type { Direction, GridPosition, MovementActor, MovementDescriptor, TileDefinition } from "../types";
import type { ResolutionDraft } from "../rules/actionDraft";
import type { TextDescription } from "../content/schema";

export interface PassThroughTerrainState {
  direction: Direction | null;
  player: MovementActor;
  remainingMovePoints: number | null;
  shouldResolveStopTriggers: boolean;
}

export interface TerrainPassThroughContext {
  draft: ResolutionDraft;
  movement: MovementDescriptor;
  startMs: number;
  state: PassThroughTerrainState;
  tile: TileDefinition;
}

export interface TerrainStopContext {
  draft: ResolutionDraft;
  movement: MovementDescriptor | null;
  player: MovementActor;
  position: GridPosition;
  startMs: number;
  tile: TileDefinition;
}

export interface TerrainModule {
  accent: string;
  getTextDescription: (tile: TileDefinition) => TextDescription;
  label: string;
  onPassThrough?: (context: TerrainPassThroughContext) => void;
  onStop?: (context: TerrainStopContext) => void;
  type: TileDefinition["type"];
}
