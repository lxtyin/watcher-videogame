import { SOUND_CUE_REGISTRY } from "./content/sounds";
import type { PresentationSoundCueId } from "./types";

export interface PresentationSoundCueDefinition {
  description: string;
  id: PresentationSoundCueId;
  label: string;
}

export const PRESENTATION_SOUND_CUE_DEFINITIONS: Record<
  PresentationSoundCueId,
  PresentationSoundCueDefinition
> = Object.fromEntries(
  Object.entries(SOUND_CUE_REGISTRY).map(([cueId, definition]) => [
    cueId,
    {
      id: cueId as PresentationSoundCueId,
      ...definition
    }
  ])
) as Record<PresentationSoundCueId, PresentationSoundCueDefinition>;

export function getPresentationSoundCueDefinition(
  cueId: PresentationSoundCueId
): PresentationSoundCueDefinition {
  return PRESENTATION_SOUND_CUE_DEFINITIONS[cueId];
}
