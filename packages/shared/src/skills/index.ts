import { getCharacterDefinition } from "../characters";
import type {
  ModifierDiceRollHookResult,
  ModifierDefinition,
  ModifierMovementHookContext,
  ModifierPhaseHookResult,
  ModifierToolHookResult,
  SkillDefinition
} from "../modifiers";
import {
  cloneModifierIds,
  normalizeModifierIds
} from "../modifiers";
import { clonePlayerTags } from "../playerTags";
import {
  BONDAGE_MODIFIER_ID,
  BONDAGE_MODIFIER_DEFINITION,
  BONDAGE_STACKS_TAG,
  STUN_MODIFIER_DEFINITION,
  STUN_MODIFIER_ID
} from "../buffers";
import type {
  CharacterId,
  ModifierId,
  MovementDescriptor,
  MovementType,
  PlayerTagMap,
  SkillId,
  TextDescription,
  ToolLoadoutDefinition,
  TurnPhase,
  TurnToolSnapshot
} from "../types";
import {
  AWM_MODIFIER_DEFINITION,
  AWM_SKILL_DEFINITION
} from "./awm";
import {
  BLAZE_MODIFIER_DEFINITION,
  BLAZE_SKILL_DEFINITION
} from "./blaze";
import {
  CHAIN_MODIFIER_DEFINITION,
  CHAIN_SKILL_DEFINITION
} from "./chain";
import {
  EHH_MODIFIER_DEFINITION,
  EHH_SKILL_DEFINITION
} from "./ehh";
import {
  FARTHER_MODIFIER_DEFINITION,
  FARTHER_SKILL_DEFINITION
} from "./farther";
import {
  LATE_MODIFIER_DEFINITION,
  LATE_SKILL_DEFINITION
} from "./late";
import {
  LAMP_MODIFIER_DEFINITION,
  LAMP_SKILL_DEFINITION
} from "./lamp";
import {
  LEADER_MODIFIER_DEFINITION,
  LEADER_SKILL_DEFINITION
} from "./leader";
import {
  MOUNTAIN_MODIFIER_DEFINITION,
  MOUNTAIN_SKILL_DEFINITION
} from "./mountain";
import {
  VOLATY_MODIFIER_DEFINITION,
  VOLATY_SKILL_DEFINITION
} from "./volaty";

export {
  BLAZE_BOMB_PREPARED_TAG
} from "./blaze";
export {
  BONDAGE_MODIFIER_ID,
  BONDAGE_STACKS_TAG
} from "../buffers";
export {
  CHAIN_HOOK_READY_TAG,
  CHAIN_MOVED_OUT_OF_TURN_TAG
} from "./chain";
export {
  FARTHER_BANKED_MOVEMENT_TAG
} from "./farther";
export {
  VOLATY_LEAP_TURN_TAG
} from "./volaty";
export {
  STUN_MODIFIER_ID
} from "../buffers";

interface ModifierActorContext {
  id: string;
  modifiers: readonly ModifierId[];
  phase: TurnPhase;
  position: { x: number; y: number };
  tags: PlayerTagMap;
  tools: readonly TurnToolSnapshot[];
}

function defineSkillRegistry<const Registry extends Record<string, SkillDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

function defineModifierRegistry<const Registry extends Record<string, ModifierDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const SKILL_REGISTRY = defineSkillRegistry({
  [AWM_SKILL_DEFINITION.id]: AWM_SKILL_DEFINITION,
  [LATE_SKILL_DEFINITION.id]: LATE_SKILL_DEFINITION,
  [EHH_SKILL_DEFINITION.id]: EHH_SKILL_DEFINITION,
  [LAMP_SKILL_DEFINITION.id]: LAMP_SKILL_DEFINITION,
  [LEADER_SKILL_DEFINITION.id]: LEADER_SKILL_DEFINITION,
  [MOUNTAIN_SKILL_DEFINITION.id]: MOUNTAIN_SKILL_DEFINITION,
  [BLAZE_SKILL_DEFINITION.id]: BLAZE_SKILL_DEFINITION,
  [VOLATY_SKILL_DEFINITION.id]: VOLATY_SKILL_DEFINITION,
  [CHAIN_SKILL_DEFINITION.id]: CHAIN_SKILL_DEFINITION,
  [FARTHER_SKILL_DEFINITION.id]: FARTHER_SKILL_DEFINITION
} as const);

export const MODIFIER_REGISTRY = defineModifierRegistry({
  [AWM_MODIFIER_DEFINITION.id]: AWM_MODIFIER_DEFINITION,
  [BONDAGE_MODIFIER_DEFINITION.id]: BONDAGE_MODIFIER_DEFINITION,
  [LATE_MODIFIER_DEFINITION.id]: LATE_MODIFIER_DEFINITION,
  [EHH_MODIFIER_DEFINITION.id]: EHH_MODIFIER_DEFINITION,
  [LAMP_MODIFIER_DEFINITION.id]: LAMP_MODIFIER_DEFINITION,
  [LEADER_MODIFIER_DEFINITION.id]: LEADER_MODIFIER_DEFINITION,
  [MOUNTAIN_MODIFIER_DEFINITION.id]: MOUNTAIN_MODIFIER_DEFINITION,
  [BLAZE_MODIFIER_DEFINITION.id]: BLAZE_MODIFIER_DEFINITION,
  [VOLATY_MODIFIER_DEFINITION.id]: VOLATY_MODIFIER_DEFINITION,
  [CHAIN_MODIFIER_DEFINITION.id]: CHAIN_MODIFIER_DEFINITION,
  [FARTHER_MODIFIER_DEFINITION.id]: FARTHER_MODIFIER_DEFINITION,
  [STUN_MODIFIER_DEFINITION.id]: STUN_MODIFIER_DEFINITION
} as const);

export function getSkillTextDescription(skillId: SkillId): TextDescription | null {
  const skill = SKILL_REGISTRY[skillId];

  if (!skill) {
    return null;
  }

  return skill.getTextDescription();
}

function getCharacterModifiers(characterId: CharacterId): ModifierDefinition[] {
  return getCharacterDefinition(characterId).skillIds.flatMap((skillId) => {
    const skill = SKILL_REGISTRY[skillId];

    if (!skill) {
      return [];
    }

    return skill.modifierIds.flatMap((modifierId) => {
      const modifier = MODIFIER_REGISTRY[modifierId];

      return modifier ? [modifier] : [];
    });
  });
}

function getRuntimeModifiers(modifierIds: readonly ModifierId[]): ModifierDefinition[] {
  return normalizeModifierIds(modifierIds).flatMap((modifierId) => {
    const modifier = MODIFIER_REGISTRY[modifierId];

    return modifier ? [modifier] : [];
  });
}

function getPlayerModifiers(
  characterId: CharacterId,
  modifierIds: readonly ModifierId[]
): ModifierDefinition[] {
  const modifiersById = new Map<string, ModifierDefinition>();

  for (const modifier of getCharacterModifiers(characterId)) {
    modifiersById.set(modifier.id, modifier);
  }

  for (const modifier of getRuntimeModifiers(modifierIds)) {
    modifiersById.set(modifier.id, modifier);
  }

  return [...modifiersById.values()];
}

function mergePhaseResult(
  nextModifiers: ModifierId[],
  nextTags: PlayerTagMap,
  result: ModifierPhaseHookResult | null
): {
  grantTools: ToolLoadoutDefinition[];
  nextModifiers: ModifierId[];
  nextTags: PlayerTagMap;
  skipTurn: boolean;
} {
  return {
    grantTools: result?.grantTools ? [...result.grantTools] : [],
    nextModifiers: result?.nextModifiers ? cloneModifierIds(result.nextModifiers) : nextModifiers,
    nextTags: result?.nextTags ? clonePlayerTags(result.nextTags) : nextTags,
    skipTurn: result?.skipTurn ?? false
  };
}

function applyTurnHook(
  characterId: CharacterId,
  actor: ModifierActorContext,
  hookName: "onTurnActionStart" | "onTurnEnd" | "onTurnEndStart" | "onTurnStart"
): {
  grantTools: ToolLoadoutDefinition[];
  nextModifiers: ModifierId[];
  nextTags: PlayerTagMap;
  skipTurn: boolean;
} {
  let nextModifiers = cloneModifierIds(actor.modifiers);
  let nextTags = clonePlayerTags(actor.tags);
  const grantTools: ToolLoadoutDefinition[] = [];
  let skipTurn = false;

  for (const modifier of getPlayerModifiers(characterId, nextModifiers)) {
    const result = modifier.hooks[hookName]?.({
      actorId: actor.id,
      characterId,
      modifiers: nextModifiers,
      phase: actor.phase,
      position: actor.position,
      tags: nextTags,
      tools: actor.tools
    }) ?? null;
    const merged = mergePhaseResult(nextModifiers, nextTags, result);
    nextModifiers = merged.nextModifiers;
    nextTags = merged.nextTags;
    skipTurn = skipTurn || merged.skipTurn;
    grantTools.push(...merged.grantTools);
  }

  return {
    grantTools,
    nextModifiers,
    nextTags,
    skipTurn
  };
}

export function applyTurnActionStartModifiers(
  characterId: CharacterId,
  actor: ModifierActorContext
): {
  grantTools: ToolLoadoutDefinition[];
  nextModifiers: ModifierId[];
  nextTags: PlayerTagMap;
  skipTurn: boolean;
} {
  return applyTurnHook(characterId, actor, "onTurnActionStart");
}

export function applyTurnEndModifiers(
  characterId: CharacterId,
  actor: ModifierActorContext
): {
  grantTools: ToolLoadoutDefinition[];
  nextModifiers: ModifierId[];
  nextTags: PlayerTagMap;
  skipTurn: boolean;
} {
  return applyTurnHook(characterId, actor, "onTurnEnd");
}

export function applyTurnEndStartModifiers(
  characterId: CharacterId,
  actor: ModifierActorContext
): {
  grantTools: ToolLoadoutDefinition[];
  nextModifiers: ModifierId[];
  nextTags: PlayerTagMap;
  skipTurn: boolean;
} {
  return applyTurnHook(characterId, actor, "onTurnEndStart");
}

export function applyTurnStartModifiers(
  characterId: CharacterId,
  actor: ModifierActorContext
): {
  grantTools: ToolLoadoutDefinition[];
  nextModifiers: ModifierId[];
  nextTags: PlayerTagMap;
  skipTurn: boolean;
} {
  return applyTurnHook(characterId, actor, "onTurnStart");
}

export function applyDiceRollModifiers(
  characterId: CharacterId,
  actor: ModifierActorContext,
  movementRoll: number,
  rolledTool: ToolLoadoutDefinition | null
): {
  grantTools: ToolLoadoutDefinition[];
  movementRoll: number;
  nextModifiers: ModifierId[];
  nextTags: PlayerTagMap;
  rolledTool: ToolLoadoutDefinition | null;
} {
  let nextModifiers = cloneModifierIds(actor.modifiers);
  let nextTags = clonePlayerTags(actor.tags);
  let nextMovementRoll = movementRoll;
  let nextRolledTool = rolledTool;
  const grantTools: ToolLoadoutDefinition[] = [];

  for (const modifier of getPlayerModifiers(characterId, nextModifiers)) {
    const result: ModifierDiceRollHookResult | null =
      modifier.hooks.onDiceRoll?.({
        actorId: actor.id,
        characterId,
        modifiers: nextModifiers,
        phase: actor.phase,
        position: actor.position,
        tags: nextTags,
        tools: actor.tools,
        movementRoll: nextMovementRoll,
        rolledTool: nextRolledTool
      }) ?? null;

    if (!result) {
      continue;
    }

    if (result.movementRoll !== undefined) {
      nextMovementRoll = result.movementRoll;
    }

    if ("rolledTool" in result) {
      nextRolledTool = result.rolledTool ?? null;
    }

    if (result.nextModifiers) {
      nextModifiers = cloneModifierIds(result.nextModifiers);
    }

    if (result.nextTags) {
      nextTags = clonePlayerTags(result.nextTags);
    }

    if (result.grantTools) {
      grantTools.push(...result.grantTools);
    }
  }

  return {
    grantTools,
    movementRoll: nextMovementRoll,
    nextModifiers,
    nextTags,
    rolledTool: nextRolledTool
  };
}

export function applyOnGetToolModifiers(
  characterId: CharacterId,
  actor: ModifierActorContext,
  tools: readonly TurnToolSnapshot[]
): {
  nextModifiers: ModifierId[];
  nextTags: PlayerTagMap;
  tools: TurnToolSnapshot[];
} {
  let nextModifiers = cloneModifierIds(actor.modifiers);
  let nextTags = clonePlayerTags(actor.tags);
  const nextTools: TurnToolSnapshot[] = [];

  for (const tool of tools) {
    let nextTool: TurnToolSnapshot | null = {
      ...tool,
      params: {
        ...tool.params
      }
    };

    for (const modifier of getPlayerModifiers(characterId, nextModifiers)) {
      if (!nextTool) {
        break;
      }

      const result: ModifierToolHookResult | null = modifier.hooks.onGetTool?.({
        actorId: actor.id,
        characterId,
        modifiers: nextModifiers,
        phase: actor.phase,
        position: actor.position,
        tags: nextTags,
        tools: actor.tools,
        tool: nextTool
      }) ?? null;

      if (!result) {
        continue;
      }

      if (result.nextModifiers) {
        nextModifiers = cloneModifierIds(result.nextModifiers);
      }

      if (result.nextTags) {
        nextTags = clonePlayerTags(result.nextTags);
      }

      if (result.tool !== undefined) {
        nextTool = result.tool;
      }
    }

    if (nextTool) {
      nextTools.push(nextTool);
    }
  }

  return {
    nextModifiers,
    nextTags,
    tools: nextTools
  };
}

export function resolveToolMovementType(
  characterId: CharacterId,
  actor: ModifierActorContext,
  tool: TurnToolSnapshot,
  movementType: MovementType
): MovementType {
  let nextMovementType = movementType;

  for (const modifier of getPlayerModifiers(characterId, actor.modifiers)) {
    const overrideMovementType =
      modifier.hooks.getMovementType?.({
        actorId: actor.id,
        characterId,
        modifiers: actor.modifiers,
        phase: actor.phase,
        position: actor.position,
        tags: actor.tags,
        tools: actor.tools,
        tool,
        movementType: nextMovementType
      }) ?? null;

    if (overrideMovementType) {
      nextMovementType = overrideMovementType;
    }
  }

  return nextMovementType;
}

export function applyMovementResolvedModifiers(
  characterId: CharacterId,
  actor: ModifierActorContext,
  movement: MovementDescriptor,
  direction: "up" | "down" | "left" | "right" | null,
  path: readonly { x: number; y: number }[]
): {
  nextModifiers: ModifierId[];
  nextTags: PlayerTagMap;
} {
  let nextModifiers = cloneModifierIds(actor.modifiers);
  let nextTags = clonePlayerTags(actor.tags);

  for (const modifier of getPlayerModifiers(characterId, nextModifiers)) {
    const result: ModifierPhaseHookResult | null =
      modifier.hooks.onMovementResolved?.({
        actorId: actor.id,
        characterId,
        modifiers: nextModifiers,
        phase: actor.phase,
        position: actor.position,
        tags: nextTags,
        tools: actor.tools,
        movement,
        direction,
        path
      } satisfies ModifierMovementHookContext) ?? null;

    if (result?.nextModifiers) {
      nextModifiers = cloneModifierIds(result.nextModifiers);
    }

    if (result?.nextTags) {
      nextTags = clonePlayerTags(result.nextTags);
    }
  }

  return {
    nextModifiers,
    nextTags
  };
}
