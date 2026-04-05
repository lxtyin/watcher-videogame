import type { CharacterContentDefinition } from "./schema";

function defineCharacterRegistry<const Registry extends Record<string, CharacterContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const CHARACTER_REGISTRY = defineCharacterRegistry({
  late: {
    label: "Late",
    summary: "将获得的移动改为等距离制动。",
    skillIds: ["late:brake-movement"]
  },
  ehh: {
    label: "Ehh",
    summary: "每个行动阶段额外获得一个篮球。",
    skillIds: ["ehh:extra-basketball"]
  },
  leader: {
    label: "Leader",
    summary: "每个行动阶段获得一个放置钱包。",
    skillIds: ["leader:deploy-wallet"]
  },
  blaze: {
    label: "Blaze",
    summary: "回合开始可准备炸弹，并在下个行动阶段获得投弹。",
    skillIds: ["blaze:prepare-bomb"]
  },
  volaty: {
    label: "Volaty",
    summary: "回合开始可跳过工具骰，并把本回合平移改成飞跃。",
    skillIds: ["volaty:leap-roll"]
  },
  chain: {
    label: "Chain",
    summary: "若回合外没有被移动，下个行动阶段获得短钩锁。",
    skillIds: ["chain:hook-if-still"]
  },
  farther: {
    label: "Farther",
    summary: "每个行动阶段获得制衡，并可把移动储存到下回合。",
    skillIds: ["farther:balance-bank"]
  },
  awm: {
    label: "AWM",
    summary: "行动阶段开始时获得一发狙击，命中的玩家会获得束缚。",
    skillIds: ["awm:grant-shot"]
  }
} as const);
