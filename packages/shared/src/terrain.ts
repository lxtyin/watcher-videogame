import { toTileKey } from "./board";
import { rollToolDie } from "./dice";
import { isMovementType } from "./rules/displacement";
import { createRolledToolInstance } from "./tools";
import type {
  BoardDefinition,
  Direction,
  GridPosition,
  MovementActor,
  MovementDescriptor,
  PlayerTagMap,
  PlayerTurnFlag,
  TileDefinition,
  TriggeredTerrainEffect,
  TurnToolSnapshot
} from "./types";

interface TerrainPassThroughContext {
  direction?: Direction;
  movement: MovementDescriptor;
  playerId: string;
  position: GridPosition;
  remainingMovePoints?: number;
  tile: TileDefinition;
}

interface TerrainPassThroughResult {
  nextDirection?: Direction;
  nextRemainingMovePoints?: number;
  nextTags?: PlayerTagMap;
  nextToolDieSeed?: number;
  nextTools?: TurnToolSnapshot[];
  nextTurnFlags?: PlayerTurnFlag[];
  triggeredTerrainEffects: TriggeredTerrainEffect[];
}

interface StopResolutionTarget {
  characterId: MovementActor["characterId"];
  id: string;
  isActor: boolean;
  position: GridPosition;
  spawnPosition: GridPosition;
  tags: PlayerTagMap;
  turnFlags: PlayerTurnFlag[];
}

interface TerrainStopContext {
  movement: MovementDescriptor | null;
  player: StopResolutionTarget;
  sourceId: string;
  tile: TileDefinition;
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
}

interface TerrainStopResult {
  nextPosition?: GridPosition;
  nextTags?: PlayerTagMap;
  nextToolDieSeed?: number;
  nextTools?: TurnToolSnapshot[];
  nextTurnFlags?: PlayerTurnFlag[];
  triggeredTerrainEffects: TriggeredTerrainEffect[];
}

interface TerrainDefinition {
  onPassThrough?: (context: TerrainPassThroughContext) => TerrainPassThroughResult;
  onStop?: (context: TerrainStopContext) => TerrainStopResult | null;
}

const LUCKY_TURN_FLAG: PlayerTurnFlag = "lucky_tile_claimed";

// Lucky rewards derive stable ids from the source trigger so previews stay reproducible.
function buildLuckyToolInstanceId(
  sourceId: string,
  tileKey: string,
  grantedToolId: TurnToolSnapshot["toolId"]
): string {
  return `${sourceId}:lucky:${tileKey}:${grantedToolId}`;
}

// Terrain effects live in one registry so new board rules can hook pass-through or stop phases declaratively.
const TERRAIN_DEFINITIONS: Partial<Record<TileDefinition["type"], TerrainDefinition>> = {
  conveyor: {
    onPassThrough: (context) => {
      if (
        !context.tile.direction ||
        !context.direction ||
        typeof context.remainingMovePoints !== "number" ||
        !isMovementType(context.movement, "translate")
      ) {
        return {
          triggeredTerrainEffects: []
        };
      }

      if (context.direction === context.tile.direction) {
        return {
          nextRemainingMovePoints: context.remainingMovePoints + 2,
          triggeredTerrainEffects: [
            {
              kind: "conveyor_boost",
              movement: context.movement,
              playerId: context.playerId,
              tileKey: context.tile.key,
              position: context.position,
              direction: context.direction,
              bonusMovePoints: 2
            }
          ]
        };
      }

      return {
        nextDirection: context.tile.direction,
        triggeredTerrainEffects: [
          {
            kind: "conveyor_turn",
            movement: context.movement,
            playerId: context.playerId,
            tileKey: context.tile.key,
            position: context.position,
            fromDirection: context.direction,
            toDirection: context.tile.direction
          }
        ]
      };
    }
  },
  pit: {
    onStop: (context) => ({
      nextPosition: context.player.spawnPosition,
      triggeredTerrainEffects: [
        {
          kind: "pit",
          movement: context.movement,
          playerId: context.player.id,
          tileKey: context.tile.key,
          position: context.player.position,
          respawnPosition: context.player.spawnPosition
        }
      ]
    })
  },
  lucky: {
    onStop: (context) => {
      if (!context.player.isActor || context.player.turnFlags.includes(LUCKY_TURN_FLAG)) {
        return null;
      }

      const toolRoll = rollToolDie(context.toolDieSeed);
      const rewardedTool = createRolledToolInstance(
        buildLuckyToolInstanceId(context.sourceId, context.tile.key, toolRoll.value.toolId),
        toolRoll.value
      );

      return {
        nextToolDieSeed: toolRoll.nextSeed,
        nextTools: [...context.tools, rewardedTool],
        nextTurnFlags: [...context.player.turnFlags, LUCKY_TURN_FLAG],
        triggeredTerrainEffects: [
          {
            kind: "lucky",
            movement: context.movement,
            playerId: context.player.id,
            tileKey: context.tile.key,
            position: context.player.position,
            grantedTool: rewardedTool
          }
        ]
      };
    }
  },
  goal: {
    onStop: (context) => {
      if (!context.player.isActor) {
        return null;
      }

      return {
        triggeredTerrainEffects: [
          {
            kind: "goal",
            movement: context.movement,
            playerId: context.player.id,
            tileKey: context.tile.key,
            position: context.player.position
          }
        ]
      };
    }
  }
};

// Pass-through terrain runs during displacement, so remaining move points and direction can change immediately.
export function resolvePassThroughTerrainEffect(
  context: TerrainPassThroughContext
): TerrainPassThroughResult {
  const terrainDefinition = TERRAIN_DEFINITIONS[context.tile.type];

  if (!terrainDefinition?.onPassThrough) {
    return {
      triggeredTerrainEffects: []
    };
  }

  return terrainDefinition.onPassThrough(context);
}

// Stop terrain resolves when a displacement ends or when a new turn starts on a tile.
export function resolveStopTerrainEffect(
  context: TerrainStopContext
): TerrainStopResult | null {
  const terrainDefinition = TERRAIN_DEFINITIONS[context.tile.type];

  if (!terrainDefinition?.onStop) {
    return null;
  }

  return terrainDefinition.onStop(context);
}

// The lucky flag marks that the current player already claimed this turn's reward tile.
export function isLuckyTurnFlag(flag: PlayerTurnFlag): boolean {
  return flag === LUCKY_TURN_FLAG;
}

// Terrain events reuse normal tile keys so logs and visuals refer to the same cell id.
export function getTerrainTileKey(position: GridPosition): string {
  return toTileKey(position);
}

export function createTerrainStopTarget(
  actor: MovementActor,
  position: GridPosition,
  isActor: boolean
): StopResolutionTarget {
  return {
    characterId: actor.characterId,
    id: actor.id,
    isActor,
    position,
    spawnPosition: actor.spawnPosition,
    tags: actor.tags,
    turnFlags: [...actor.turnFlags]
  };
}

export type { TerrainPassThroughResult, TerrainStopResult, StopResolutionTarget, TerrainStopContext };
