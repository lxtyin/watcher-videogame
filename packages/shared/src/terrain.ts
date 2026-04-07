import { toTileKey } from "./board";
import { rollToolDie } from "./dice";
import type {
  Direction,
  GridPosition,
  MovementActor,
  MovementDescriptor,
  PlayerTurnFlag,
  TileDefinition,
  TurnToolSnapshot
} from "./types";
import type { ResolutionDraft } from "./rules/actionDraft";
import {
  appendDraftTriggeredTerrainEffects,
  applyResolvedPlayerStateToDraft,
  setDraftToolDieSeed,
  setDraftToolInventory
} from "./rules/actionDraft";
import { isMovementType } from "./rules/displacement";
import { resolveRocketCore } from "./tool-modules/rocket";
import { createRolledToolInstance } from "./tools";

interface PassThroughTerrainState {
  direction: Direction | null;
  player: MovementActor;
  remainingMovePoints: number | null;
}

interface TerrainPassThroughContext {
  draft: ResolutionDraft;
  movement: MovementDescriptor;
  state: PassThroughTerrainState;
  tile: TileDefinition;
}

interface TerrainStopContext {
  draft: ResolutionDraft;
  movement: MovementDescriptor | null;
  player: MovementActor;
  position: GridPosition;
  tile: TileDefinition;
}

interface TerrainDefinition {
  onPassThrough?: (context: TerrainPassThroughContext) => void;
  onStop?: (context: TerrainStopContext) => void;
}

const LUCKY_TURN_FLAG: PlayerTurnFlag = "lucky_tile_claimed";
const CANNON_PROJECTILE_RANGE = 999;
const CANNON_BLAST_LEAP_DISTANCE = 3;
const CANNON_SPLASH_PUSH_DISTANCE = 1;

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
        !context.state.direction ||
        typeof context.state.remainingMovePoints !== "number" ||
        !isMovementType(context.movement, "translate")
      ) {
        return;
      }

      if (context.state.direction === context.tile.direction) {
        context.state.remainingMovePoints += 2;
        appendDraftTriggeredTerrainEffects(context.draft, [
          {
            kind: "conveyor_boost",
            movement: context.movement,
            playerId: context.state.player.id,
            tileKey: context.tile.key,
            position: context.state.player.position,
            direction: context.state.direction,
            bonusMovePoints: 2
          }
        ]);
        return;
      }

      appendDraftTriggeredTerrainEffects(context.draft, [
        {
          kind: "conveyor_turn",
          movement: context.movement,
          playerId: context.state.player.id,
          tileKey: context.tile.key,
          position: context.state.player.position,
          fromDirection: context.state.direction,
          toDirection: context.tile.direction
        }
      ]);
      context.state.direction = context.tile.direction;
    }
  },
  pit: {
    onStop: (context) => {
      context.player.position = {
        x: context.player.spawnPosition.x,
        y: context.player.spawnPosition.y
      };
      applyResolvedPlayerStateToDraft(context.draft, context.player);
      appendDraftTriggeredTerrainEffects(context.draft, [
        {
          kind: "pit",
          movement: context.movement,
          playerId: context.player.id,
          tileKey: context.tile.key,
          position: context.position,
          respawnPosition: context.player.spawnPosition
        }
      ]);
    }
  },
  cannon: {
    onStop: (context) => {
      if (!context.tile.direction) {
        return;
      }

      appendDraftTriggeredTerrainEffects(context.draft, [
        {
          direction: context.tile.direction,
          kind: "cannon",
          movement: context.movement,
          playerId: context.player.id,
          position: context.player.position,
          tileKey: context.tile.key
        }
      ]);
      resolveRocketCore(context.draft, {
        blastLeapDistance: CANNON_BLAST_LEAP_DISTANCE,
        direction: context.tile.direction,
        eventIdPrefix: `${context.draft.sourceId}:cannon:${context.tile.key}`,
        originPosition: context.player.position,
        projectileOwnerId: null,
        projectileRange: CANNON_PROJECTILE_RANGE,
        splashPushDistance: CANNON_SPLASH_PUSH_DISTANCE,
        tagBase: `terrain:${context.tile.type}`
      });
    }
  },
  lucky: {
    onStop: (context) => {
      if (
        context.player.id !== context.draft.actorId ||
        context.player.turnFlags.includes(LUCKY_TURN_FLAG)
      ) {
        return;
      }

      const toolRoll = rollToolDie(context.draft.nextToolDieSeed);
      const rewardedTool = createRolledToolInstance(
        buildLuckyToolInstanceId(context.draft.sourceId, context.tile.key, toolRoll.value.toolId),
        toolRoll.value
      );

      context.player.turnFlags = [...context.player.turnFlags, LUCKY_TURN_FLAG];
      applyResolvedPlayerStateToDraft(context.draft, context.player);
      setDraftToolDieSeed(context.draft, toolRoll.nextSeed);
      setDraftToolInventory(context.draft, [...context.draft.tools, rewardedTool]);
      appendDraftTriggeredTerrainEffects(context.draft, [
        {
          kind: "lucky",
          movement: context.movement,
          playerId: context.player.id,
          tileKey: context.tile.key,
          position: context.player.position,
          grantedTool: rewardedTool
        }
      ]);
    }
  },
  goal: {
    onStop: (context) => {
      if (context.player.id !== context.draft.actorId) {
        return;
      }

      appendDraftTriggeredTerrainEffects(context.draft, [
        {
          kind: "goal",
          movement: context.movement,
          playerId: context.player.id,
          tileKey: context.tile.key,
          position: context.player.position
        }
      ]);
    }
  }
};

// Pass-through terrain runs during displacement, so remaining move points and direction can change immediately.
export function resolvePassThroughTerrainEffect(
  draft: ResolutionDraft,
  context: {
    movement: MovementDescriptor;
    state: PassThroughTerrainState;
    tile: TileDefinition;
  }
): void {
  const terrainDefinition = TERRAIN_DEFINITIONS[context.tile.type];

  if (!terrainDefinition?.onPassThrough) {
    return;
  }

  terrainDefinition.onPassThrough({
    draft,
    movement: context.movement,
    state: context.state,
    tile: context.tile
  });
}

// Stop terrain resolves when a displacement ends or when a new turn starts on a tile.
export function resolveStopTerrainEffect(
  draft: ResolutionDraft,
  context: {
    movement: MovementDescriptor | null;
    player: MovementActor;
    position: GridPosition;
    tile: TileDefinition;
  }
): void {
  const terrainDefinition = TERRAIN_DEFINITIONS[context.tile.type];

  if (!terrainDefinition?.onStop) {
    return;
  }

  terrainDefinition.onStop({
    draft,
    movement: context.movement,
    player: context.player,
    position: context.position,
    tile: context.tile
  });
}

// The lucky flag marks that the current player already claimed this turn's reward tile.
export function isLuckyTurnFlag(flag: PlayerTurnFlag): boolean {
  return flag === LUCKY_TURN_FLAG;
}

// Terrain events reuse normal tile keys so logs and visuals refer to the same cell id.
export function getTerrainTileKey(position: GridPosition): string {
  return toTileKey(position);
}
