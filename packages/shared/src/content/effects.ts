import type { PresentationEffectContentDefinition } from "./schema";

function defineEffectRegistry<const Registry extends Record<string, PresentationEffectContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const EFFECT_REGISTRY = defineEffectRegistry({
  rocket_explosion: {
    label: "火箭爆炸",
    description: "火箭命中后的范围爆炸表现。"
  }
} as const);
