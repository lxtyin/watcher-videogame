import type {
  Direction,
  GridPosition,
  MovementActor,
  MovementDescriptor,
  MovementTiming,
  PresentationProjectileType,
  BoardSummonState,
  TileDefinition
} from "../types";
import type { ResolutionDraft } from "../rules/actionDraft";
import type { TextDescription } from "../content/schema";

export interface PassThroughTerrainState {
  direction: Direction | null;
  player: MovementActor;
  remainingMovePoints: number | null;
}

export interface TerrainPassThroughContext {
  draft: ResolutionDraft;
  movement: MovementDescriptor;
  movementTiming: MovementTiming;
  startMs: number;
  state: PassThroughTerrainState;
  tile: TileDefinition;
}

export interface TerrainStopContext {
  draft: ResolutionDraft;
  movement: MovementDescriptor | null;
  movementTiming: MovementTiming;
  player: MovementActor;
  position: GridPosition;
  startMs: number;
  tile: TileDefinition;
}

export type TerrainImpactSource =
  | {
      kind: "player";
      movement: MovementDescriptor;
      player: MovementActor;
    }
  | {
      kind: "summon";
      movement: MovementDescriptor;
      summon: BoardSummonState;
    }
  | {
      kind: "projectile";
      ownerId: string | null;
      projectileType: PresentationProjectileType | "punch";
    };

export interface TerrainImpactContext {
  direction: Direction;
  draft: ResolutionDraft;
  position: GridPosition;
  source: TerrainImpactSource;
  startMs: number;
  strength: number;
  tile: TileDefinition;
}

export interface TerrainModule {
  accent: string;
  getTextDescription: (tile: TileDefinition) => TextDescription;
  label: string;
  onImpact?: (context: TerrainImpactContext) => void;
  onPassThrough?: (context: TerrainPassThroughContext) => void;
  onStop?: (context: TerrainStopContext) => void;
  type: TileDefinition["type"];
}
