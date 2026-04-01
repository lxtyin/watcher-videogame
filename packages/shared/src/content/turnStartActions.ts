import type { TurnStartActionContentDefinition } from "./schema";

function defineTurnStartActionRegistry<
  const Registry extends Record<string, TurnStartActionContentDefinition>
>(registry: Registry): Registry {
  return registry;
}

export const TURN_START_ACTION_REGISTRY = defineTurnStartActionRegistry({
  blazePrepareBomb: {
    label: "投弹准备",
    description: "立即结束本回合，并在你的下个回合开始时获得一个【投弹】工具。",
    color: "#d86a42"
  },
  volatySkipToolDie: {
    label: "弃骰飞跃",
    description: "放弃本回合工具骰，仅掷移动骰，并让本回合的移动行动按飞跃结算。",
    color: "#77b8ff"
  }
} as const);
