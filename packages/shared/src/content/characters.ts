import type { CharacterContentDefinition } from "./schema";

function defineCharacterRegistry<const Registry extends Record<string, CharacterContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const CHARACTER_REGISTRY = defineCharacterRegistry({
  villager: {
    flavorText: "朴素的白板。",
    label: "Villager",
    nativeName: "村民",
    portraitId: "villager",
    summary: "没有任何技能。",
    skillIds: []
  },
  late: {
    flavorText: "迟来的艺术。",
    label: "Late",
    nativeName: "罗素",
    portraitId: "late",
    summary: "将获得的移动改为等距离的【制动】。",
    skillIds: ["late:brake-movement"]
  },
  ehh: {
    flavorText: "e~",
    label: "Ehh",
    nativeName: "鹅哈哈",
    portraitId: "ehh",
    summary: "行动阶段，额外获得一个【篮球】。",
    skillIds: ["ehh:extra-basketball"]
  },
  lamp: {
    flavorText: "到此一游",
    label: "Lamp",
    nativeName: "兰彭",
    portraitId: "lamp",
    summary: "回合开始时，可选择放弃工具骰，复制上回合其他玩家用过的一件工具。",
    skillIds: ["lamp:copy-roll"]
  },
  leader: {
    flavorText: "可别再弄丢了",
    label: "Leader",
    nativeName: "领导",
    portraitId: "leader",
    summary: "回合结束阶段，可以放置一个钱包，捡到时获得随机工具",
    skillIds: ["leader-deploy-wallet"]
  },
  blaze: {
    flavorText: "可不要离我太近。",
    label: "Blaze",
    nativeName: "布拉泽",
    portraitId: "blaze",
    summary: "回合开始时，可选择放弃移动骰，行动阶段获得【投弹】。",
    skillIds: ["blaze:prepare-bomb"]
  },
  volaty: {
    flavorText: "致我们最初的梦想。",
    label: "Volaty",
    nativeName: "芙兰迪",
    portraitId: "volaty",
    summary: "回合开始时，可选择放弃工具骰，将点数骰获得的移动改为【飞跃】。",
    skillIds: ["volaty:leap-roll"]
  },
  chain: {
    flavorText: "我不会有所隐瞒。",
    label: "Chain",
    nativeName: "常",
    portraitId: "chain",
    summary: "若回合外没有发生移动，下个行动阶段获得一个长度为3的【钩锁】。",
    skillIds: ["chain:hook-if-still"]
  },
  farther: {
    flavorText: "还能再快一点。",
    label: "Farther",
    nativeName: "法真",
    portraitId: "farther",
    summary: "行动阶段，可以使用一次【制衡】：可扣除至多一半移动点数，并在下回合取回等量移动。",
    skillIds: ["farther-balance"]
  },
  mountain: {
    flavorText: "到此一游",
    label: "Mountain",
    nativeName: "莫汀",
    portraitId: "mountain",
    summary: "行动阶段，额外获得一个【砌墙】。",
    skillIds: ["mountain:end-turn-build-wall"]
  },
  awm: {
    flavorText: "到此一游",
    label: "AWM",
    nativeName: "AWM",
    portraitId: "awm",
    summary: "可消耗未使用移动点数充能，行动阶段，可以消耗充能使用【子弹】，推动并束缚命中的玩家。",
    skillIds: ["awm:grant-shot"]
  }
} as const);
