import type { SummonContentDefinition } from "./schema";

function defineSummonRegistry<const Registry extends Record<string, SummonContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const SUMMON_REGISTRY = defineSummonRegistry({
  wallet: {
    label: "钱包",
    description: "玩家主动经过、落在或在回合开始时踩在钱包上时，会拾取并获得一个额外工具骰结果。",
    triggerMode: "movement_trigger"
  }
} as const);
