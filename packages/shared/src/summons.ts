import { SUMMON_REGISTRY } from "./content/summons";
import { rollToolDie } from "./dice";
import {
  isMovementDisposition,
  isMovementType
} from "./rules/displacement";
import { createRolledToolInstance } from "./tools";
import type {
  BoardPlayerState,
  BoardSummonState,
  CharacterId,
  GridPosition,
  MovementActor,
  MovementDescriptor,
  SummonId,
  SummonMutation,
  TriggeredSummonEffect,
  TurnToolSnapshot
} from "./types";

interface SummonTriggerTarget {
  characterId: CharacterId;
  id: string;
  movement: MovementDescriptor;
  path: GridPosition[];
  position: GridPosition;
  spawnPosition: GridPosition;
  startPosition: GridPosition;
}

interface SummonTriggerContext {
  activeTool: TurnToolSnapshot;
  movement: MovementDescriptor;
  player: SummonTriggerTarget;
  summon: BoardSummonState;
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
}

interface SummonTriggerResult {
  consumeSummon?: boolean;
  nextToolDieSeed?: number;
  nextTools?: TurnToolSnapshot[];
  triggeredSummonEffects: TriggeredSummonEffect[];
}

interface ApplyMovementSummonEffectsContext {
  activeTool: TurnToolSnapshot;
  actor: MovementActor;
  actorMovement: {
    movement: MovementDescriptor;
    path: GridPosition[];
    position: GridPosition;
  } | null;
  affectedPlayers: Array<{
    movement: MovementDescriptor;
    path: GridPosition[];
    playerId: string;
    startPosition: GridPosition;
    target: GridPosition;
  }>;
  players: BoardPlayerState[];
  summons: BoardSummonState[];
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
}

interface ApplyMovementSummonEffectsResolution {
  nextToolDieSeed: number;
  summonMutations: SummonMutation[];
  tools: TurnToolSnapshot[];
  triggeredSummonEffects: TriggeredSummonEffect[];
}

export interface SummonDefinition {
  description: string;
  id: SummonId;
  label: string;
  onPass?: (context: SummonTriggerContext) => SummonTriggerResult | null;
  onStart?: (context: SummonTriggerContext) => SummonTriggerResult | null;
  onStop?: (context: SummonTriggerContext) => SummonTriggerResult | null;
  triggerMode: "movement_trigger";
}

export const SUMMON_DEFINITIONS: Record<SummonId, SummonDefinition> = {
  wallet: {
    id: "wallet",
    ...SUMMON_REGISTRY.wallet,
    onPass: (context) => {
      if (!canWalletTrigger(context, ["translate", "drag"])) {
        return null;
      }

      return grantWalletReward(context);
    },
    onStop: (context) => {
      if (!canWalletTrigger(context, ["leap"])) {
        return null;
      }

      return grantWalletReward(context);
    }
  }
};

export function getSummonDefinition(summonId: SummonId): SummonDefinition {
  return SUMMON_DEFINITIONS[summonId];
}

function positionsEqual(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

function buildWalletRewardToolInstanceId(
  instanceId: string,
  grantedToolId: TurnToolSnapshot["toolId"]
): string {
  return `${instanceId}:pickup:${grantedToolId}`;
}

function canWalletTrigger(
  context: SummonTriggerContext,
  allowedMovementTypes: Array<MovementDescriptor["type"]>
): boolean {
  return (
    context.summon.ownerId === context.player.id &&
    context.player.characterId === "leader" &&
    isMovementDisposition(context.movement, "active") &&
    allowedMovementTypes.some((movementType) => isMovementType(context.movement, movementType))
  );
}

function grantWalletReward(context: SummonTriggerContext): SummonTriggerResult {
  const toolRoll = rollToolDie(context.toolDieSeed);
  const grantedTool = createRolledToolInstance(
    buildWalletRewardToolInstanceId(context.summon.instanceId, toolRoll.value.toolId),
    toolRoll.value
  );

  return {
    consumeSummon: true,
    nextToolDieSeed: toolRoll.nextSeed,
    nextTools: [...context.tools, grantedTool],
    triggeredSummonEffects: [
      {
        kind: "wallet_pickup",
        movement: context.movement,
        playerId: context.player.id,
        ownerId: context.summon.ownerId,
        position: context.summon.position,
        summonId: context.summon.summonId,
        summonInstanceId: context.summon.instanceId,
        grantedTool
      }
    ]
  };
}

function createSummonTriggerTarget(
  player: Pick<BoardPlayerState, "characterId" | "id" | "spawnPosition">,
  movement: MovementDescriptor,
  startPosition: GridPosition,
  path: GridPosition[],
  position: GridPosition
): SummonTriggerTarget {
  return {
    characterId: player.characterId,
    id: player.id,
    movement,
    path,
    position,
    spawnPosition: player.spawnPosition,
    startPosition
  };
}

// Trigger outcomes mutate shared simulator state through one path so summon rules stay declarative.
function applySummonTriggerResult(
  result: SummonTriggerResult,
  summon: BoardSummonState,
  remainingSummonIds: Set<string>,
  summonMutations: SummonMutation[],
  triggeredSummonEffects: TriggeredSummonEffect[]
): void {
  if (!result.consumeSummon || !remainingSummonIds.has(summon.instanceId)) {
    triggeredSummonEffects.push(...result.triggeredSummonEffects);
    return;
  }

  remainingSummonIds.delete(summon.instanceId);
  summonMutations.push({
    kind: "remove",
    instanceId: summon.instanceId
  });
  triggeredSummonEffects.push(...result.triggeredSummonEffects);
}

function collectSummonsAtPosition(
  summons: BoardSummonState[],
  remainingSummonIds: Set<string>,
  position: GridPosition
): BoardSummonState[] {
  return summons.filter(
    (summon) =>
      remainingSummonIds.has(summon.instanceId) && positionsEqual(summon.position, position)
  );
}

// Each phase checks the live summon set at one position and applies any matching summon hooks.
function runSummonPhase(
  phase: "onPass" | "onStart" | "onStop",
  position: GridPosition,
  target: SummonTriggerTarget,
  context: ApplyMovementSummonEffectsContext,
  remainingSummonIds: Set<string>,
  summonMutations: SummonMutation[],
  triggeredSummonEffects: TriggeredSummonEffect[],
  state: { nextToolDieSeed: number; tools: TurnToolSnapshot[] }
): void {
  const summonsAtPosition = collectSummonsAtPosition(
    context.summons,
    remainingSummonIds,
    position
  );

  for (const summon of summonsAtPosition) {
    const summonDefinition = getSummonDefinition(summon.summonId);
    const trigger = summonDefinition[phase];

    if (!trigger) {
      continue;
    }

    const result = trigger({
      activeTool: context.activeTool,
      movement: target.movement,
      player: {
        ...target,
        position
      },
      summon,
      toolDieSeed: state.nextToolDieSeed,
      tools: state.tools
    });

    if (!result) {
      continue;
    }

    if (result.nextTools) {
      state.tools = result.nextTools;
    }

    if (typeof result.nextToolDieSeed === "number") {
      state.nextToolDieSeed = result.nextToolDieSeed;
    }

    applySummonTriggerResult(
      result,
      summon,
      remainingSummonIds,
      summonMutations,
      triggeredSummonEffects
    );
  }
}

// Summon occupancy checks keep deployment validation shared between preview and authority.
export function hasSummonAtPosition(summons: BoardSummonState[], position: GridPosition): boolean {
  return summons.some((summon) => positionsEqual(summon.position, position));
}

export function createSummonUpsertMutation(
  instanceId: string,
  summonId: SummonId,
  ownerId: string,
  position: GridPosition
): SummonMutation {
  return {
    kind: "upsert",
    instanceId,
    summonId,
    ownerId,
    position
  };
}

// Summon trigger resolution now follows the same movement phases as terrain-aware displacement.
export function applyMovementSummonEffects(
  context: ApplyMovementSummonEffectsContext
): ApplyMovementSummonEffectsResolution {
  const playersById = new Map(context.players.map((player) => [player.id, player]));
  const remainingSummonIds = new Set(context.summons.map((summon) => summon.instanceId));
  const summonMutations: SummonMutation[] = [];
  const triggeredSummonEffects: TriggeredSummonEffect[] = [];
  const state = {
    nextToolDieSeed: context.toolDieSeed,
    tools: context.tools
  };

  const movementTargets: SummonTriggerTarget[] = [];

  if (context.actorMovement) {
    movementTargets.push(
      createSummonTriggerTarget(
        {
          characterId: context.actor.characterId,
          id: context.actor.id,
          spawnPosition: context.actor.spawnPosition
        },
        context.actorMovement.movement,
        context.actor.position,
        context.actorMovement.path,
        context.actorMovement.position
      )
    );
  }

  for (const affectedPlayer of context.affectedPlayers) {
    const player = playersById.get(affectedPlayer.playerId);

    if (!player) {
      continue;
    }

    movementTargets.push(
      createSummonTriggerTarget(
        player,
        affectedPlayer.movement,
        affectedPlayer.startPosition,
        affectedPlayer.path,
        affectedPlayer.target
      )
    );
  }

  for (const target of movementTargets) {
    runSummonPhase(
      "onStart",
      target.startPosition,
      target,
      context,
      remainingSummonIds,
      summonMutations,
      triggeredSummonEffects,
      state
    );

    for (const position of target.path) {
      runSummonPhase(
        "onPass",
        position,
        target,
        context,
        remainingSummonIds,
        summonMutations,
        triggeredSummonEffects,
        state
      );
    }

    runSummonPhase(
      "onStop",
      target.position,
      target,
      context,
      remainingSummonIds,
      summonMutations,
      triggeredSummonEffects,
      state
    );
  }

  return {
    tools: state.tools,
    nextToolDieSeed: state.nextToolDieSeed,
    summonMutations,
    triggeredSummonEffects
  };
}
