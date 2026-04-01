import { getTile, toTileKey } from "./board";
import { rollToolDie } from "./dice";
import { isMovementType } from "./rules/displacement";
import { createRolledToolInstance } from "./tools";
import type {
  AffectedPlayerMove,
  BoardDefinition,
  BoardPlayerState,
  Direction,
  GridPosition,
  MovementDescriptor,
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
  movement: MovementDescriptor;
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
  characterId: MovementActor["characterId"];
  id: string;
  isActor: boolean;
  movement: MovementDescriptor | null;
  position: GridPosition;
  spawnPosition: GridPosition;
  turnFlags: PlayerTurnFlag[];
}

interface TerrainStopContext {
  activeTool: TurnToolSnapshot;
  movement: MovementDescriptor | null;
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
  actorMovement: { movement: MovementDescriptor | null };
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

// Lucky rewards derive stable ids from the source action so previews stay reproducible.
function buildLuckyToolInstanceId(
  activeTool: TurnToolSnapshot,
  tileKey: string,
  grantedToolId: TurnToolSnapshot["toolId"]
): string {
  return `${activeTool.instanceId}:lucky:${tileKey}:${grantedToolId}`;
}

// Tile mutations are folded in before stop effects so terrain sees the post-action tile state.
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

      if (!isMovementType(context.movement, "translate")) {
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
        direction: context.tile.direction,
        remainingMovePoints: context.remainingMovePoints,
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
      reason: "pit",
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
        buildLuckyToolInstanceId(context.activeTool, context.tile.key, toolRoll.value.toolId),
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
  }
};

// Pass-through terrain only runs for grounded traversal tools such as Movement and Brake.
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

// Stop terrain resolves after tool mechanics so hazards and rewards share one landing pass.
export function applyStopTerrainEffects(
  context: StopTerrainResolutionContext
): StopTerrainResolution {
  const playersById = new Map(context.players.map((player) => [player.id, player]));
  const affectedPlayers = context.affectedPlayers.map((player) => ({ ...player }));
  const actorTarget: StopResolutionTarget = {
    characterId: context.actor.characterId,
    id: context.actor.id,
    isActor: true,
    movement: context.actorMovement.movement,
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
          characterId: sourcePlayer.characterId,
          id: player.playerId,
          isActor: false,
          movement: player.movement,
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
      movement: target.movement,
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

// The lucky flag marks that the current player already claimed this turn's reward tile.
export function isLuckyTurnFlag(flag: PlayerTurnFlag): boolean {
  return flag === LUCKY_TURN_FLAG;
}

// Terrain events reuse normal tile keys so logs and visuals refer to the same cell id.
export function getTerrainTileKey(position: GridPosition): string {
  return toTileKey(position);
}
