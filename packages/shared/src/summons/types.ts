import type { TextDescription } from "../content/schema";
import type { ResolutionDraft } from "../rules/actionDraft";
import type {
  CharacterId,
  Direction,
  GridPosition,
  ModifierId,
  MovementActor,
  MovementDescriptor,
  MovementTiming,
  PlayerTagMap,
  PlayerTurnFlag,
  SummonId,
  TurnPhase
} from "../types";

export interface SummonTriggerTarget {
  characterId: CharacterId;
  id: string;
  modifiers: ModifierId[];
  position: GridPosition;
  spawnPosition: GridPosition;
  tags: PlayerTagMap;
  teamId: MovementActor["teamId"];
  turnFlags: PlayerTurnFlag[];
}

export interface SummonTriggerContext {
  direction?: Direction;
  draft: ResolutionDraft;
  movement: MovementDescriptor | null;
  movementTiming: MovementTiming;
  phase: TurnPhase | null;
  player: SummonTriggerTarget;
  position: GridPosition;
  remainingMovePoints?: number;
  startMs: number;
  summon: import("../types").BoardSummonState;
}

export interface SummonPhaseContext {
  direction?: Direction;
  movement: MovementDescriptor | null;
  phase: TurnPhase | null;
  player: MovementActor;
  position: GridPosition;
  remainingMovePoints?: number;
  startMs: number;
}

export interface SummonDefinition {
  description: string;
  id: SummonId;
  label: string;
  onPassThrough?: (context: SummonTriggerContext) => void;
  onStop?: (context: SummonTriggerContext) => void;
  triggerMode: "movement_trigger";
}

export type SummonTextDescription = TextDescription;
