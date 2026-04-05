import { getCharacterDefinition } from "../characters";
import { clonePlayerTags } from "../playerTags";
import type {
  ModifierActivationContext,
  ModifierDiceRollHookResult,
  ModifierDefinition,
  ModifierMovementHookContext,
  ModifierPhaseHookResult,
  ModifierToolHookResult,
  SkillDefinition
} from "../modifiers";
import type {
  CharacterId,
  MovementDescriptor,
  MovementType,
  PlayerTagMap,
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
  BONDAGE_MODIFIER_DEFINITION,
  BONDAGE_STACKS_TAG
} from "./bondage";
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
  LEADER_MODIFIER_DEFINITION,
  LEADER_SKILL_DEFINITION
} from "./leader";
import {
  VOLATY_MODIFIER_DEFINITION,
  VOLATY_SKILL_DEFINITION
} from "./volaty";

export {
  BLAZE_BOMB_PREPARED_TAG
} from "./blaze";
export {
  BONDAGE_STACKS_TAG
} from "./bondage";
export {
  CHAIN_HOOK_READY_TAG,
  CHAIN_MOVED_OUT_OF_TURN_TAG
} from "./chain";
export {
  FARTHER_BANKED_MOVEMENT_TAG
} from "./farther";
export {
  VOLATY_LEAP_PENDING_TAG,
  VOLATY_LEAP_TURN_TAG
} from "./volaty";

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
  [LEADER_SKILL_DEFINITION.id]: LEADER_SKILL_DEFINITION,
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
  [LEADER_MODIFIER_DEFINITION.id]: LEADER_MODIFIER_DEFINITION,
  [BLAZE_MODIFIER_DEFINITION.id]: BLAZE_MODIFIER_DEFINITION,
  [VOLATY_MODIFIER_DEFINITION.id]: VOLATY_MODIFIER_DEFINITION,
  [CHAIN_MODIFIER_DEFINITION.id]: CHAIN_MODIFIER_DEFINITION,
  [FARTHER_MODIFIER_DEFINITION.id]: FARTHER_MODIFIER_DEFINITION
} as const);

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

function isRuntimeModifierActive(
  modifier: ModifierDefinition,
  context: ModifierActivationContext
): boolean {
  return modifier.isActive?.(context) ?? false;
}

function getPlayerModifiers(characterId: CharacterId, tags: PlayerTagMap): ModifierDefinition[] {
  const modifiersById = new Map<string, ModifierDefinition>();

  for (const modifier of getCharacterModifiers(characterId)) {
    modifiersById.set(modifier.id, modifier);
  }

  for (const modifier of Object.values(MODIFIER_REGISTRY)) {
    if (isRuntimeModifierActive(modifier, { characterId, tags })) {
      modifiersById.set(modifier.id, modifier);
    }
  }

  return [...modifiersById.values()];
}

function mergePhaseResult(
  nextTags: PlayerTagMap,
  result: ModifierPhaseHookResult | null
): {
  grantTools: ToolLoadoutDefinition[];
  nextTags: PlayerTagMap;
} {
  return {
    grantTools: result?.grantTools ? [...result.grantTools] : [],
    nextTags: result?.nextTags ? clonePlayerTags(result.nextTags) : nextTags
  };
}

function applyTurnHook(
  characterId: CharacterId,
  actor: {
    id: string;
    phase: TurnPhase;
    position: { x: number; y: number };
    tags: PlayerTagMap;
    tools: readonly TurnToolSnapshot[];
  },
  hookName: "onTurnActionStart" | "onTurnEnd" | "onTurnStart"
): {
  grantTools: ToolLoadoutDefinition[];
  nextTags: PlayerTagMap;
} {
  let nextTags = clonePlayerTags(actor.tags);
  const grantTools: ToolLoadoutDefinition[] = [];

  for (const modifier of getPlayerModifiers(characterId, nextTags)) {
    const result = modifier.hooks[hookName]?.({
      actorId: actor.id,
      characterId,
      phase: actor.phase,
      position: actor.position,
      tags: nextTags,
      tools: actor.tools
    }) ?? null;
    const merged = mergePhaseResult(nextTags, result);
    nextTags = merged.nextTags;
    grantTools.push(...merged.grantTools);
  }

  return {
    grantTools,
    nextTags
  };
}

export function applyTurnActionStartModifiers(
  characterId: CharacterId,
  actor: {
    id: string;
    phase: TurnPhase;
    position: { x: number; y: number };
    tags: PlayerTagMap;
    tools: readonly TurnToolSnapshot[];
  }
): {
  grantTools: ToolLoadoutDefinition[];
  nextTags: PlayerTagMap;
} {
  return applyTurnHook(characterId, actor, "onTurnActionStart");
}

export function applyTurnEndModifiers(
  characterId: CharacterId,
  actor: {
    id: string;
    phase: TurnPhase;
    position: { x: number; y: number };
    tags: PlayerTagMap;
    tools: readonly TurnToolSnapshot[];
  }
): {
  grantTools: ToolLoadoutDefinition[];
  nextTags: PlayerTagMap;
} {
  return applyTurnHook(characterId, actor, "onTurnEnd");
}

export function applyTurnStartModifiers(
  characterId: CharacterId,
  actor: {
    id: string;
    phase: TurnPhase;
    position: { x: number; y: number };
    tags: PlayerTagMap;
    tools: readonly TurnToolSnapshot[];
  }
): {
  grantTools: ToolLoadoutDefinition[];
  nextTags: PlayerTagMap;
} {
  return applyTurnHook(characterId, actor, "onTurnStart");
}

export function applyDiceRollModifiers(
  characterId: CharacterId,
  actor: {
    id: string;
    phase: TurnPhase;
    position: { x: number; y: number };
    tags: PlayerTagMap;
    tools: readonly TurnToolSnapshot[];
  },
  movementRoll: number,
  rolledTool: ToolLoadoutDefinition | null
): {
  grantTools: ToolLoadoutDefinition[];
  movementRoll: number;
  nextTags: PlayerTagMap;
  rolledTool: ToolLoadoutDefinition | null;
} {
  let nextTags = clonePlayerTags(actor.tags);
  let nextMovementRoll = movementRoll;
  let nextRolledTool = rolledTool;
  const grantTools: ToolLoadoutDefinition[] = [];

  for (const modifier of getPlayerModifiers(characterId, nextTags)) {
    const result: ModifierDiceRollHookResult | null =
      modifier.hooks.onDiceRoll?.({
        actorId: actor.id,
        characterId,
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
    nextTags,
    rolledTool: nextRolledTool
  };
}

export function applyOnGetToolModifiers(
  characterId: CharacterId,
  actor: {
    id: string;
    phase: TurnPhase;
    position: { x: number; y: number };
    tags: PlayerTagMap;
    tools: readonly TurnToolSnapshot[];
  },
  tools: readonly TurnToolSnapshot[]
): TurnToolSnapshot[] {
  return tools.flatMap((tool) => {
    let nextTool: TurnToolSnapshot | null = {
      ...tool,
      params: {
        ...tool.params
      }
    };

    for (const modifier of getPlayerModifiers(characterId, actor.tags)) {
      if (!nextTool) {
        break;
      }

      const result: ModifierToolHookResult | null = modifier.hooks.onGetTool?.({
        actorId: actor.id,
        characterId,
        phase: actor.phase,
        position: actor.position,
        tags: actor.tags,
        tools: actor.tools,
        tool: nextTool
      }) ?? null;

      if (!result || result.tool === undefined) {
        continue;
      }

      nextTool = result.tool;
    }

    return nextTool ? [nextTool] : [];
  });
}

export function resolveToolMovementType(
  characterId: CharacterId,
  actor: {
    id: string;
    phase: TurnPhase;
    position: { x: number; y: number };
    tags: PlayerTagMap;
    tools: readonly TurnToolSnapshot[];
  },
  tool: TurnToolSnapshot,
  movementType: MovementType
): MovementType {
  let nextMovementType = movementType;

  for (const modifier of getPlayerModifiers(characterId, actor.tags)) {
    const overrideMovementType =
      modifier.hooks.getMovementType?.({
        actorId: actor.id,
        characterId,
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
  actor: {
    id: string;
    phase: TurnPhase;
    position: { x: number; y: number };
    tags: PlayerTagMap;
    tools: readonly TurnToolSnapshot[];
  },
  movement: MovementDescriptor,
  direction: "up" | "down" | "left" | "right" | null,
  path: readonly { x: number; y: number }[]
): PlayerTagMap {
  let nextTags = clonePlayerTags(actor.tags);

  for (const modifier of getPlayerModifiers(characterId, nextTags)) {
    const result: ModifierPhaseHookResult | null =
      modifier.hooks.onMovementResolved?.({
        actorId: actor.id,
        characterId,
        phase: actor.phase,
        position: actor.position,
        tags: nextTags,
        tools: actor.tools,
        movement,
        direction,
        path
      } satisfies ModifierMovementHookContext) ?? null;

    if (result?.nextTags) {
      nextTags = clonePlayerTags(result.nextTags);
    }
  }

  return nextTags;
}
