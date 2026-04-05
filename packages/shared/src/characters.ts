import { CHARACTER_REGISTRY } from "./content/characters";
import type { CharacterId } from "./types";

export interface CharacterDefinition {
  id: CharacterId;
  label: string;
  skillIds: readonly string[];
  summary: string;
}

function materializeCharacterDefinitions(): Record<CharacterId, CharacterDefinition> {
  return Object.fromEntries(
    Object.entries(CHARACTER_REGISTRY).map(([characterId, definition]) => [
      characterId,
      {
        id: characterId as CharacterId,
        label: definition.label,
        summary: definition.summary,
        skillIds: [...definition.skillIds]
      }
    ])
  ) as unknown as Record<CharacterId, CharacterDefinition>;
}

export const CHARACTER_DEFINITIONS = materializeCharacterDefinitions();

export function getCharacterDefinition(characterId: CharacterId): CharacterDefinition {
  return CHARACTER_DEFINITIONS[characterId];
}

export function getCharacterIds(): CharacterId[] {
  return Object.keys(CHARACTER_DEFINITIONS) as CharacterId[];
}

export function getNextCharacterId(characterId: CharacterId): CharacterId {
  const characterIds = getCharacterIds();
  const currentIndex = characterIds.indexOf(characterId);

  if (currentIndex < 0) {
    return characterIds[0] ?? "late";
  }

  return characterIds[(currentIndex + 1) % characterIds.length] ?? characterId;
}
