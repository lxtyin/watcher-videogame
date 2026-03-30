import { TOOL_DEFINITIONS } from "./tools";
import type {
  CharacterId,
  ToolId,
  ToolLoadoutDefinition,
  ToolParameterId,
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
  turnStartGrants: ToolLoadoutDefinition[];
}

export const CHARACTER_DEFINITIONS: Record<CharacterId, CharacterDefinition> = {
  late: {
    id: "late",
    label: "罗素的关门弟子",
    summary: "你的所有<移动>变为<制动>。",
    passiveDescriptions: ["你的所有<移动>变为<制动>。"],
    turnStartGrants: [],
    activeSkillLoadout: [],
    toolTransforms: [
      {
        fromToolId: "movement",
        toToolId: "brake",
        paramMappings: [
          {
            fromParamId: "movePoints",
            toParamId: "brakeRange"
          }
        ]
      }
    ]
  },
  ehh: {
    id: "ehh",
    label: "鹅哈哈",
    summary: "每回合额外获得一颗<篮球>。",
    passiveDescriptions: ["每回合额外获得一颗<篮球>。"],
    turnStartGrants: [{ toolId: "basketball" }],
    activeSkillLoadout: [],
    toolTransforms: []
  },
  leader: {
    id: "leader",
    label: "领导",
    summary: "可部署钱包，自己经过时拾取并获得一个工具骰子。",
    passiveDescriptions: [],
    turnStartGrants: [],
    activeSkillLoadout: [{ toolId: "deployWallet" }],
    toolTransforms: []
  }
};

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
