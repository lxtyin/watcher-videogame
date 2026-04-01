import { TURN_START_ACTION_REGISTRY } from "./content/turnStartActions";
import type { CharacterId, TurnStartActionId, TurnStartActionSnapshot } from "./types";

export interface TurnStartActionDefinition {
  color: string;
  description: string;
  id: TurnStartActionId;
  label: string;
}

function materializeTurnStartActionDefinitions(): Record<
  TurnStartActionId,
  TurnStartActionDefinition
> {
  return Object.fromEntries(
    Object.entries(TURN_START_ACTION_REGISTRY).map(([actionId, definition]) => [
      actionId,
      {
        id: actionId as TurnStartActionId,
        ...definition
      }
    ])
  ) as Record<TurnStartActionId, TurnStartActionDefinition>;
}

export const TURN_START_ACTION_DEFINITIONS = materializeTurnStartActionDefinitions();

export function getTurnStartActionDefinition(
  actionId: TurnStartActionId
): TurnStartActionDefinition {
  return TURN_START_ACTION_DEFINITIONS[actionId];
}

export function createTurnStartActionSnapshot(
  actionId: TurnStartActionId,
  characterId: CharacterId
): TurnStartActionSnapshot {
  return {
    actionId,
    characterId
  };
}
