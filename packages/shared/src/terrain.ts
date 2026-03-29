import { getTile, toTileKey } from "./board";
import { rollToolDie } from "./dice";
import { createRolledToolInstance } from "./tools";
import type {
  AffectedPlayerMove,
  BoardDefinition,
  BoardPlayerState,
  Direction,
  GridPosition,
  MovementActor,
  PlayerTurnFlag,
  ResolvedActorState,
  TileDefinition,
  TileMutation,
  TriggeredTerrainEffect,
  TurnToolSnapshot
} from "./types";

interface TerrainPassThroughContext {
  direction: Direction;
  playerId: string;
  position: GridPosition;
  remainingMovePoints: number;
  tile: TileDefinition;
}

interface TerrainPassThroughResult {
  direction: Direction;
  remainingMovePoints: number;
  triggeredTerrainEffects: TriggeredTerrainEffect[];
}

interface StopResolutionTarget {
  id: string;
  isActor: boolean;
  position: GridPosition;
  spawnPosition: GridPosition;
  turnFlags: PlayerTurnFlag[];
}

interface TerrainStopContext {
  activeTool: TurnToolSnapshot;
  player: StopResolutionTarget;
  tile: TileDefinition;
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
}

interface TerrainStopResult {
  nextPosition?: GridPosition;
  nextToolDieSeed?: number;
  nextTools?: TurnToolSnapshot[];
  nextTurnFlags?: PlayerTurnFlag[];
  reason?: string;
  triggeredTerrainEffects: TriggeredTerrainEffect[];
}

interface TerrainDefinition {
  onPassThrough?: (context: TerrainPassThroughContext) => TerrainPassThroughResult;
  onStop?: (context: TerrainStopContext) => TerrainStopResult | null;
}

interface StopTerrainResolutionContext {
  activeTool: TurnToolSnapshot;
  actor: MovementActor;
  actorPosition: GridPosition;
  affectedPlayers: AffectedPlayerMove[];
  board: BoardDefinition;
  players: BoardPlayerState[];
  tileMutations: TileMutation[];
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
}

interface StopTerrainResolution {
  actor: ResolvedActorState;
  affectedPlayers: AffectedPlayerMove[];
  nextToolDieSeed: number;
  tools: TurnToolSnapshot[];
  triggeredTerrainEffects: TriggeredTerrainEffect[];
}

const LUCKY_TURN_FLAG: PlayerTurnFlag = "lucky_tile_claimed";

function buildLuckyToolInstanceId(
  activeTool: TurnToolSnapshot,
  tileKey: string,
  grantedToolId: TurnToolSnapshot["toolId"]
): string {
  return `${activeTool.instanceId}:lucky:${tileKey}:${grantedToolId}`;
}

function getTileAfterMutations(
  board: BoardDefinition,
  tileMutations: TileMutation[],
  position: GridPosition
): TileDefinition | undefined {
  const tile = getTile(board, position);

  if (!tile) {
    return undefined;
  }

  const matchingMutation = tileMutations.find((entry) => entry.key === tile.key);

  if (!matchingMutation) {
    return tile;
  }

  return {
    ...tile,
    type: matchingMutation.nextType,
    durability: matchingMutation.nextDurability
  };
}

// Terrain effects live in one registry so new board rules can hook either
// movement-path passes or end-of-tool stops without touching every tool executor.
const TERRAIN_DEFINITIONS: Partial<Record<TileDefinition["type"], TerrainDefinition>> = {
  conveyor: {
    onPassThrough: (context) => {
      if (!context.tile.direction) {
        return {
          direction: context.direction,
          remainingMovePoints: context.remainingMovePoints,
          triggeredTerrainEffects: []
        };
      }

      if (context.direction === context.tile.direction) {
        return {
          direction: context.direction,
          remainingMovePoints: context.remainingMovePoints + 2,
          triggeredTerrainEffects: [
            {
              kind: "conveyor_boost",
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
        direction: context.tile.direction,
        remainingMovePoints: context.remainingMovePoints,
        triggeredTerrainEffects: [
          {
            kind: "conveyor_turn",
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
      reason: "pit",
      triggeredTerrainEffects: [
        {
          kind: "pit",
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
        buildLuckyToolInstanceId(context.activeTool, context.tile.key, toolRoll.value),
        toolRoll.value
      );

      return {
        nextToolDieSeed: toolRoll.nextSeed,
        nextTools: [...context.tools, rewardedTool],
        nextTurnFlags: [...context.player.turnFlags, LUCKY_TURN_FLAG],
        triggeredTerrainEffects: [
          {
            kind: "lucky",
            playerId: context.player.id,
            tileKey: context.tile.key,
            position: context.player.position,
            grantedTool: rewardedTool
          }
        ]
      };
    }
  }
};

export function resolvePassThroughTerrainEffect(
  context: TerrainPassThroughContext
): TerrainPassThroughResult {
  const terrainDefinition = TERRAIN_DEFINITIONS[context.tile.type];

  if (!terrainDefinition?.onPassThrough) {
    return {
      direction: context.direction,
      remainingMovePoints: context.remainingMovePoints,
      triggeredTerrainEffects: []
    };
  }

  return terrainDefinition.onPassThrough(context);
}

export function applyStopTerrainEffects(
  context: StopTerrainResolutionContext
): StopTerrainResolution {
  const playersById = new Map(context.players.map((player) => [player.id, player]));
  const affectedPlayers = context.affectedPlayers.map((player) => ({ ...player }));
  const actorTarget: StopResolutionTarget = {
    id: context.actor.id,
    isActor: true,
    position: context.actorPosition,
    spawnPosition: context.actor.spawnPosition,
    turnFlags: [...context.actor.turnFlags]
  };
  let nextTools = context.tools;
  let nextToolDieSeed = context.toolDieSeed;
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];

  const targets: StopResolutionTarget[] = [
    actorTarget,
    ...affectedPlayers.flatMap((player) => {
      const sourcePlayer = playersById.get(player.playerId);

      if (!sourcePlayer) {
        return [];
      }

      return [
        {
          id: player.playerId,
          isActor: false,
          position: player.target,
          spawnPosition: sourcePlayer.spawnPosition,
          turnFlags: [...sourcePlayer.turnFlags]
        }
      ];
    })
  ];

  for (const target of targets) {
    const tile = getTileAfterMutations(context.board, context.tileMutations, target.position);

    if (!tile) {
      continue;
    }

    const terrainDefinition = TERRAIN_DEFINITIONS[tile.type];

    if (!terrainDefinition?.onStop) {
      continue;
    }

    const result = terrainDefinition.onStop({
      activeTool: context.activeTool,
      player: target,
      tile,
      toolDieSeed: nextToolDieSeed,
      tools: nextTools
    });

    if (!result) {
      continue;
    }

    if (result.nextPosition) {
      target.position = result.nextPosition;
    }

    if (result.nextTurnFlags) {
      target.turnFlags = result.nextTurnFlags;
    }

    if (result.nextTools) {
      nextTools = result.nextTools;
    }

    if (typeof result.nextToolDieSeed === "number") {
      nextToolDieSeed = result.nextToolDieSeed;
    }

    triggeredTerrainEffects.push(...result.triggeredTerrainEffects);

    if (!target.isActor) {
      const affectedPlayer = affectedPlayers.find((player) => player.playerId === target.id);

      if (affectedPlayer) {
        affectedPlayer.target = target.position;
        affectedPlayer.reason = result.reason ?? affectedPlayer.reason;
      }
    }
  }

  return {
    actor: {
      position: actorTarget.position,
      turnFlags: actorTarget.turnFlags
    },
    affectedPlayers,
    nextToolDieSeed,
    tools: nextTools,
    triggeredTerrainEffects
  };
}

export function isLuckyTurnFlag(flag: PlayerTurnFlag): boolean {
  return flag === LUCKY_TURN_FLAG;
}

export function getTerrainTileKey(position: GridPosition): string {
  return toTileKey(position);
}
