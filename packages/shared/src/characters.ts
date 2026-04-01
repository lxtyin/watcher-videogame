import { CHARACTER_REGISTRY } from "./content/characters";
import { TOOL_DEFINITIONS } from "./tools";
import type {
  CharacterId,
  ToolId,
  ToolLoadoutDefinition,
  ToolParameterId,
  TurnStartActionId,
  TurnToolSnapshot
} from "./types";

interface CharacterToolTransformDefinition {
  fromToolId: ToolId;
  paramMappings: Array<{
    fromParamId: ToolParameterId;
    toParamId: ToolParameterId;
  }>;
  toToolId: ToolId;
}

export interface CharacterDefinition {
  activeSkillLoadout: ToolLoadoutDefinition[];
  id: CharacterId;
  label: string;
  passiveDescriptions: string[];
  summary: string;
  toolTransforms: CharacterToolTransformDefinition[];
  turnStartActionIds: readonly TurnStartActionId[];
  turnStartGrants: ToolLoadoutDefinition[];
}

function materializeCharacterDefinitions(): Record<CharacterId, CharacterDefinition> {
  return Object.fromEntries(
    Object.entries(CHARACTER_REGISTRY).map(([characterId, definition]) => [
      characterId,
      {
        id: characterId as CharacterId,
        ...definition,
        activeSkillLoadout: definition.activeSkillLoadout.map((loadout) => ({
          ...loadout,
          toolId: loadout.toolId as ToolId
        })),
        turnStartActionIds: definition.turnStartActionIds.map(
          (actionId) => actionId as TurnStartActionId
        ),
        turnStartGrants: definition.turnStartGrants.map((loadout) => ({
          ...loadout,
          toolId: loadout.toolId as ToolId
        })),
        toolTransforms: definition.toolTransforms.map((transform) => ({
          ...transform,
          fromToolId: transform.fromToolId as ToolId,
          toToolId: transform.toToolId as ToolId
        }))
      }
    ])
  ) as unknown as Record<CharacterId, CharacterDefinition>;
}

export const CHARACTER_DEFINITIONS = materializeCharacterDefinitions();

function transformTool(
  tool: TurnToolSnapshot,
  transform: CharacterToolTransformDefinition
): TurnToolSnapshot {
  const nextParams = {
    ...TOOL_DEFINITIONS[transform.toToolId].defaultParams
  };

  for (const mapping of transform.paramMappings) {
    const value = tool.params[mapping.fromParamId];

    if (typeof value === "number") {
      nextParams[mapping.toParamId] = value;
    }
  }

  return {
    ...tool,
    toolId: transform.toToolId,
    params: nextParams
  };
}

// Character definitions live in one registry so switching roles never needs room-side branching.
export function getCharacterDefinition(characterId: CharacterId): CharacterDefinition {
  return CHARACTER_DEFINITIONS[characterId];
}

export function getCharacterIds(): CharacterId[] {
  return Object.keys(CHARACTER_DEFINITIONS) as CharacterId[];
}

export function getNextCharacterId(characterId: CharacterId): CharacterId {
  const characterIds = getCharacterIds();
  const currentIndex = characterIds.indexOf(characterId);

  if (currentIndex < 0) {
    return characterIds[0] ?? "late";
  }

  return characterIds[(currentIndex + 1) % characterIds.length] ?? characterId;
}

// Turn-start grants and active skills are modeled as role-owned loadout entries.
export function buildCharacterTurnLoadout(characterId: CharacterId): ToolLoadoutDefinition[] {
  const definition = getCharacterDefinition(characterId);

  return [...definition.turnStartGrants, ...definition.activeSkillLoadout];
}

export function getCharacterActiveSkillToolIds(characterId: CharacterId): ToolId[] {
  return getCharacterDefinition(characterId).activeSkillLoadout.map((entry) => entry.toolId);
}

export function getCharacterTurnStartActionIds(characterId: CharacterId): readonly TurnStartActionId[] {
  return getCharacterDefinition(characterId).turnStartActionIds;
}

// Passive tool transforms are applied after any inventory change so later rewards stay role-aware.
export function applyCharacterToolTransforms(
  characterId: CharacterId,
  tools: TurnToolSnapshot[]
): TurnToolSnapshot[] {
  const transforms = getCharacterDefinition(characterId).toolTransforms;

  if (!transforms.length) {
    return tools;
  }

  return tools.map((tool) => {
    const matchingTransform = transforms.find((transform) => transform.fromToolId === tool.toolId);

    return matchingTransform ? transformTool(tool, matchingTransform) : tool;
  });
}
