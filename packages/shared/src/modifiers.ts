import type {
  CharacterId,
  Direction,
  GridPosition,
  ModifierId,
  MovementDescriptor,
  MovementType,
  PlayerTagMap,
  SkillId,
  ToolLoadoutDefinition,
  TurnPhase,
  TurnToolSnapshot
} from "./types";
import type { TextDescription } from "./content/schema";

export interface SkillDefinition {
  getTextDescription: () => TextDescription;
  id: SkillId;
  label: string;
  modifierIds: readonly ModifierId[];
}

export interface ModifierContextBase {
  actorId: string;
  characterId: CharacterId;
  modifiers: readonly ModifierId[];
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
  nextModifiers?: readonly ModifierId[];
  nextTags?: PlayerTagMap;
  skipTurn?: boolean;
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
}

export function cloneModifierIds(modifiers: readonly ModifierId[]): ModifierId[] {
  return [...modifiers];
}

export function normalizeModifierIds(modifiers: readonly ModifierId[]): ModifierId[] {
  return [...new Set(modifiers)];
}

export function hasModifier(modifiers: readonly ModifierId[], modifierId: ModifierId): boolean {
  return modifiers.includes(modifierId);
}

export function attachModifier(
  modifiers: readonly ModifierId[],
  modifierId: ModifierId
): ModifierId[] {
  return hasModifier(modifiers, modifierId)
    ? cloneModifierIds(modifiers)
    : [...modifiers, modifierId];
}

export function detachModifier(
  modifiers: readonly ModifierId[],
  modifierId: ModifierId
): ModifierId[] {
  return modifiers.filter((candidate) => candidate !== modifierId);
}
