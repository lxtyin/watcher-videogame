import type { CharacterContentDefinition } from "./schema";

function defineCharacterRegistry<const Registry extends Record<string, CharacterContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const CHARACTER_REGISTRY = defineCharacterRegistry({
  late: {
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
    label: "鹅哈哈",
    summary: "每回合额外获得一颗<篮球>。",
    passiveDescriptions: ["每回合额外获得一颗<篮球>。"],
    turnStartGrants: [{ toolId: "basketball" }],
    activeSkillLoadout: [],
    toolTransforms: []
  },
  leader: {
    label: "领导",
    summary: "可部署钱包，自己经过时拾取并获得一个工具骰子。",
    passiveDescriptions: [],
    turnStartGrants: [],
    activeSkillLoadout: [{ toolId: "deployWallet" }],
    toolTransforms: []
  }
} as const);
