import type { PresentationEffectContentDefinition } from "./schema";

function defineEffectRegistry<const Registry extends Record<string, PresentationEffectContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const EFFECT_REGISTRY = defineEffectRegistry({
  earth_wall_break: {
    label: "土墙碎裂",
    description: "土墙被撞碎时的破裂表现。"
  },
  rocket_explosion: {
    label: "火箭爆炸",
    description: "火箭命中后的范围爆炸表现。"
  }
} as const);
