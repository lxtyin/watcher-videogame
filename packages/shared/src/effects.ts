import { EFFECT_REGISTRY } from "./content/effects";
import type { PresentationEffectType } from "./types";

export interface PresentationEffectDefinition {
  description: string;
  id: PresentationEffectType;
  label: string;
}

export const PRESENTATION_EFFECT_DEFINITIONS: Record<
  PresentationEffectType,
  PresentationEffectDefinition
> = Object.fromEntries(
  Object.entries(EFFECT_REGISTRY).map(([effectId, definition]) => [
    effectId,
    {
      id: effectId as PresentationEffectType,
      ...definition
    }
  ])
) as Record<PresentationEffectType, PresentationEffectDefinition>;

export function getPresentationEffectDefinition(
  effectType: PresentationEffectType
): PresentationEffectDefinition {
  return PRESENTATION_EFFECT_DEFINITIONS[effectType];
}
