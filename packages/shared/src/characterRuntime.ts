import { buildCharacterTurnLoadout, getCharacterTurnStartActionIds } from "./characters";
import type {
  CharacterId,
  CharacterStateMap,
  MovementType,
  ToolLoadoutDefinition,
  TurnStartActionId,
  TurnToolSnapshot
} from "./types";

export const BLAZE_BOMB_PREPARED_STATE_KEY = "blazeBombPrepared";
export const VOLATY_LEAP_TURN_STATE_KEY = "volatyLeapTurn";
export const CHAIN_MOVED_OUT_OF_TURN_STATE_KEY = "chainMovedOutOfTurn";
export const CHAIN_HOOK_READY_STATE_KEY = "chainHookReady";
export const FARTHER_PENDING_MOVE_BONUS_STATE_KEY = "fartherPendingMoveBonus";

export interface CharacterTurnStartResolution {
  nextCharacterState: CharacterStateMap;
  turnStartActions: TurnStartActionId[];
}

export interface CharacterTurnLoadoutResolution {
  loadout: ToolLoadoutDefinition[];
  nextCharacterState: CharacterStateMap;
}

export interface CharacterTurnStartActionResolution {
  endTurn: boolean;
  nextCharacterState: CharacterStateMap;
  skipToolDie: boolean;
}

function normalizeCharacterState(characterState: CharacterStateMap): CharacterStateMap {
  return Object.fromEntries(
    Object.entries(characterState).filter(([, value]) => value !== undefined)
  );
}

export function cloneCharacterState(characterState: CharacterStateMap): CharacterStateMap {
  return {
    ...characterState
  };
}

export function getCharacterStateBoolean(
  characterState: CharacterStateMap,
  key: string
): boolean {
  return characterState[key] === true;
}

export function getCharacterStateNumber(characterState: CharacterStateMap, key: string): number {
  const value = characterState[key];

  return typeof value === "number" ? value : 0;
}

export function setCharacterStateValue(
  characterState: CharacterStateMap,
  key: string,
  value: boolean | number | string | undefined
): CharacterStateMap {
  const nextCharacterState = {
    ...characterState
  };

  if (value === undefined) {
    delete nextCharacterState[key];
  } else {
    nextCharacterState[key] = value;
  }

  return normalizeCharacterState(nextCharacterState);
}

// Turn-start preprocessing converts long-lived role memory into the next roll-phase options.
export function prepareCharacterTurnStart(
  characterId: CharacterId,
  characterState: CharacterStateMap
): CharacterTurnStartResolution {
  let nextCharacterState = normalizeCharacterState({
    ...characterState
  });

  if (characterId === "chain") {
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      CHAIN_HOOK_READY_STATE_KEY,
      !getCharacterStateBoolean(nextCharacterState, CHAIN_MOVED_OUT_OF_TURN_STATE_KEY)
    );
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      CHAIN_MOVED_OUT_OF_TURN_STATE_KEY,
      false
    );
  }

  nextCharacterState = setCharacterStateValue(
    nextCharacterState,
    VOLATY_LEAP_TURN_STATE_KEY,
    undefined
  );

  return {
    nextCharacterState,
    turnStartActions: [...getCharacterTurnStartActionIds(characterId)]
  };
}

// Turn loadouts combine static character entries with runtime grants driven by saved role state.
export function buildCharacterTurnLoadoutRuntime(
  characterId: CharacterId,
  characterState: CharacterStateMap
): CharacterTurnLoadoutResolution {
  const baseLoadout = [...buildCharacterTurnLoadout(characterId)];
  let nextCharacterState = normalizeCharacterState({
    ...characterState
  });

  if (characterId === "blaze" && getCharacterStateBoolean(nextCharacterState, BLAZE_BOMB_PREPARED_STATE_KEY)) {
    baseLoadout.push({
      toolId: "bombThrow"
    });
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      BLAZE_BOMB_PREPARED_STATE_KEY,
      undefined
    );
  }

  if (characterId === "chain" && getCharacterStateBoolean(nextCharacterState, CHAIN_HOOK_READY_STATE_KEY)) {
    baseLoadout.push({
      toolId: "hookshot",
      params: {
        hookLength: 2
      }
    });
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      CHAIN_HOOK_READY_STATE_KEY,
      undefined
    );
  }

  if (characterId === "farther") {
    baseLoadout.push({
      toolId: "balance"
    });

    const pendingBonus = getCharacterStateNumber(
      nextCharacterState,
      FARTHER_PENDING_MOVE_BONUS_STATE_KEY
    );

    if (pendingBonus > 0) {
      baseLoadout.push({
        toolId: "movement",
        params: {
          movePoints: pendingBonus
        }
      });
      nextCharacterState = setCharacterStateValue(
        nextCharacterState,
        FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
        undefined
      );
    }
  }

  return {
    loadout: baseLoadout,
    nextCharacterState
  };
}

// Role-owned roll actions resolve to generic turn-flow instructions that the engine or room can apply.
export function resolveCharacterTurnStartAction(
  characterId: CharacterId,
  characterState: CharacterStateMap,
  actionId: TurnStartActionId
): CharacterTurnStartActionResolution | null {
  let nextCharacterState = normalizeCharacterState({
    ...characterState
  });

  if (characterId === "blaze" && actionId === "blazePrepareBomb") {
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      BLAZE_BOMB_PREPARED_STATE_KEY,
      true
    );

    return {
      endTurn: true,
      nextCharacterState,
      skipToolDie: false
    };
  }

  if (characterId === "volaty" && actionId === "volatySkipToolDie") {
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      VOLATY_LEAP_TURN_STATE_KEY,
      true
    );

    return {
      endTurn: false,
      nextCharacterState,
      skipToolDie: true
    };
  }

  return null;
}

export function getCharacterMovementOverrideType(
  characterId: CharacterId,
  characterState: CharacterStateMap
): MovementType | null {
  if (characterId === "volaty" && getCharacterStateBoolean(characterState, VOLATY_LEAP_TURN_STATE_KEY)) {
    return "leap";
  }

  return null;
}

export function markCharacterMovedOutOfTurn(
  characterId: CharacterId,
  characterState: CharacterStateMap
): CharacterStateMap {
  if (characterId !== "chain") {
    return normalizeCharacterState({
      ...characterState
    });
  }

  return setCharacterStateValue(characterState, CHAIN_MOVED_OUT_OF_TURN_STATE_KEY, true);
}

export function applyCharacterTurnEndCleanup(
  characterId: CharacterId,
  characterState: CharacterStateMap
): CharacterStateMap {
  if (characterId !== "volaty") {
    return normalizeCharacterState({
      ...characterState
    });
  }

  return setCharacterStateValue(characterState, VOLATY_LEAP_TURN_STATE_KEY, undefined);
}

export function getTotalMovementPoints(tools: TurnToolSnapshot[]): number {
  return tools.reduce((total, tool) => {
    if (tool.toolId !== "movement") {
      return total;
    }

    return total + (typeof tool.params.movePoints === "number" ? tool.params.movePoints : 0);
  }, 0);
}

// Movement point deltas are distributed across movement tools so later systems can keep using tool lists.
export function adjustMovementTools(
  tools: TurnToolSnapshot[],
  delta: number
): TurnToolSnapshot[] {
  if (!delta) {
    return tools;
  }

  if (delta > 0) {
    return tools.map((tool, index) =>
      tool.toolId === "movement" && index === tools.findIndex((entry) => entry.toolId === "movement")
        ? {
            ...tool,
            params: {
              ...tool.params,
              movePoints:
                (typeof tool.params.movePoints === "number" ? tool.params.movePoints : 0) + delta
            }
          }
        : tool
    );
  }

  let remainingReduction = Math.abs(delta);

  return tools.map((tool) => {
    if (tool.toolId !== "movement" || remainingReduction < 1) {
      return tool;
    }

    const currentPoints = typeof tool.params.movePoints === "number" ? tool.params.movePoints : 0;
    const appliedReduction = Math.min(currentPoints, remainingReduction);
    remainingReduction -= appliedReduction;

    return {
      ...tool,
      params: {
        ...tool.params,
        movePoints: Math.max(0, currentPoints - appliedReduction)
      }
    };
  });
}

export function clearMovementTools(tools: TurnToolSnapshot[]): TurnToolSnapshot[] {
  return tools.map((tool) =>
    tool.toolId === "movement"
      ? {
          ...tool,
          params: {
            ...tool.params,
            movePoints: 0
          }
        }
      : tool
  );
}
