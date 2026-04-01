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
    turnStartActionIds: [],
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
    turnStartActionIds: [],
    activeSkillLoadout: [],
    toolTransforms: []
  },
  leader: {
    label: "领导",
    summary: "可以部署钱包，自己经过时拾取并获得一个工具骰。",
    passiveDescriptions: [],
    turnStartGrants: [],
    turnStartActionIds: [],
    activeSkillLoadout: [{ toolId: "deployWallet" }],
    toolTransforms: []
  },
  blaze: {
    label: "布拉泽",
    summary: "回合开始时可以进入投弹准备，并在下个回合获得<投弹>。",
    passiveDescriptions: ["回合开始时，你可以进入投弹准备并立即结束本回合。"],
    turnStartGrants: [],
    turnStartActionIds: ["blazePrepareBomb"],
    activeSkillLoadout: [],
    toolTransforms: []
  },
  volaty: {
    label: "芙兰迪",
    summary: "回合开始时可以放弃工具骰，并让本回合的移动按飞跃结算。",
    passiveDescriptions: ["回合开始时，你可以放弃本回合工具骰，本回合行动视为飞跃。"],
    turnStartGrants: [],
    turnStartActionIds: ["volatySkipToolDie"],
    activeSkillLoadout: [],
    toolTransforms: []
  },
  chain: {
    label: "常",
    summary: "若你在回合外未发生移动，本回合获得一个长度为 2 的小钩锁。",
    passiveDescriptions: ["若你在回合外未发生移动，本回合获得一个长度为 2 的小钩锁。"],
    turnStartGrants: [],
    turnStartActionIds: [],
    activeSkillLoadout: [],
    toolTransforms: []
  },
  farther: {
    label: "法真",
    summary: "每回合获得一个<制衡>，并能把本回合的移动转存到下回合。",
    passiveDescriptions: ["每回合获得一个<制衡>工具。"],
    turnStartGrants: [],
    turnStartActionIds: [],
    activeSkillLoadout: [],
    toolTransforms: []
  }
} as const);
