import type { SummonContentDefinition } from "./schema";

function defineSummonRegistry<const Registry extends Record<string, SummonContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const SUMMON_REGISTRY = defineSummonRegistry({
  wallet: {
    label: "钱包",
    description: "领导经过自己放置的钱包时会拾取并获得一个额外工具骰结果。",
    triggerMode: "pass_through"
  }
} as const);
