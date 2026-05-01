import type { CharacterContentDefinition } from "./schema";

function defineCharacterRegistry<const Registry extends Record<string, CharacterContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const CHARACTER_REGISTRY = defineCharacterRegistry({
  late: {
    flavorText: "迟来的艺术。",
    label: "Late",
    nativeName: "罗素",
    portraitId: "late",
    summary: "将获得的移动改为等距离制动。",
    skillIds: ["late:brake-movement"]
  },
  ehh: {
    flavorText: "e~",
    label: "Ehh",
    nativeName: "鹅哈哈",
    portraitId: "ehh",
    summary: "每个行动阶段额外获得一个篮球。",
    skillIds: ["ehh:extra-basketball"]
  },
  lamp: {
    flavorText: "到此一游",
    label: "Lamp",
    nativeName: "兰彭",
    portraitId: "lamp",
    summary: "回合开始可放弃本回合工具骰，并在行动阶段复制自己上回合结束后其他玩家用过的一件工具。",
    skillIds: ["lamp:copy-roll"]
  },
  leader: {
    flavorText: "可别再弄丢了",
    label: "Leader",
    nativeName: "领导",
    portraitId: "leader",
    summary: "每个回合结束阶段获得一个放置钱包。",
    skillIds: ["leader-deploy-wallet"]
  },
  blaze: {
    flavorText: "可不要离我太近。",
    label: "Blaze",
    nativeName: "布拉泽",
    portraitId: "blaze",
    summary: "回合开始可放弃移动骰，并在本回合行动阶段获得投弹。",
    skillIds: ["blaze:prepare-bomb"]
  },
  volaty: {
    flavorText: "致我们最初的梦想。",
    label: "Volaty",
    nativeName: "芙兰迪",
    portraitId: "volaty",
    summary: "回合开始可跳过工具骰，立刻投掷移动骰，并把本回合平移改成飞跃。",
    skillIds: ["volaty:leap-roll"]
  },
  chain: {
    flavorText: "我不会有所隐瞒。",
    label: "Chain",
    nativeName: "常",
    portraitId: "chain",
    summary: "若回合外没有被移动，下个行动阶段获得短钩锁。",
    skillIds: ["chain:hook-if-still"]
  },
  farther: {
    flavorText: "还能再快一点。",
    label: "Farther",
    nativeName: "法真",
    portraitId: "farther",
    summary: "每个行动阶段获得制衡，可扣除至多一半移动点，并在下回合取回等量移动。",
    skillIds: ["farther-balance"]
  },
  mountain: {
    flavorText: "到此一游",
    label: "Mountain",
    nativeName: "莫汀",
    portraitId: "mountain",
    summary: "每个行动阶段获得一个耐久 2 的砌墙。",
    skillIds: ["mountain:end-turn-build-wall"]
  },
  awm: {
    flavorText: "到此一游",
    label: "AWM",
    nativeName: "AWM",
    portraitId: "awm",
    summary: "行动阶段开始时获得一发子弹，可消耗未使用移动点数充能，推动并束缚命中的玩家。",
    skillIds: ["awm:grant-shot"]
  }
} as const);
