import type {
  CharacterId,
  Direction,
  GridPosition,
  MovementDescriptor,
  MovementType,
  PlayerTagMap,
  ToolLoadoutDefinition,
  TurnPhase,
  TurnToolSnapshot
} from "./types";

export type SkillId = string;
export type ModifierId = string;

export interface SkillDefinition {
  id: SkillId;
  label: string;
  modifierIds: readonly ModifierId[];
  summary: string;
}

export interface ModifierActivationContext {
  characterId: CharacterId;
  tags: PlayerTagMap;
}

export interface ModifierContextBase {
  actorId: string;
  characterId: CharacterId;
  phase: TurnPhase;
  position: GridPosition;
  tags: PlayerTagMap;
  tools: readonly TurnToolSnapshot[];
}

export interface ModifierPhaseHookContext extends ModifierContextBase {}

export interface ModifierToolHookContext extends ModifierContextBase {
  tool: TurnToolSnapshot;
}

export interface ModifierDiceRollHookContext extends ModifierContextBase {
  movementRoll: number;
  rolledTool: ToolLoadoutDefinition | null;
}

export interface ModifierMovementHookContext extends ModifierContextBase {
  direction: Direction | null;
  movement: MovementDescriptor;
  path: readonly GridPosition[];
}

export interface ModifierPhaseHookResult {
  grantTools?: readonly ToolLoadoutDefinition[];
  nextTags?: PlayerTagMap;
}

export interface ModifierToolHookResult extends ModifierPhaseHookResult {
  tool?: TurnToolSnapshot | null;
}

export interface ModifierDiceRollHookResult extends ModifierPhaseHookResult {
  movementRoll?: number;
  rolledTool?: ToolLoadoutDefinition | null;
}

export interface ModifierMovementTypeHookContext extends ModifierToolHookContext {
  movementType: MovementType;
}

export interface ModifierHooks {
  getMovementType?: (context: ModifierMovementTypeHookContext) => MovementType | null;
  onDiceRoll?: (context: ModifierDiceRollHookContext) => ModifierDiceRollHookResult | null;
  onGetTool?: (context: ModifierToolHookContext) => ModifierToolHookResult | null;
  onMovementResolved?: (context: ModifierMovementHookContext) => ModifierPhaseHookResult | null;
  onToolUsed?: (context: ModifierToolHookContext) => ModifierPhaseHookResult | null;
  onTurnActionStart?: (context: ModifierPhaseHookContext) => ModifierPhaseHookResult | null;
  onTurnEnd?: (context: ModifierPhaseHookContext) => ModifierPhaseHookResult | null;
  onTurnStart?: (context: ModifierPhaseHookContext) => ModifierPhaseHookResult | null;
}

export interface ModifierDefinition {
  hooks: ModifierHooks;
  id: ModifierId;
  isActive?: (context: ModifierActivationContext) => boolean;
}
