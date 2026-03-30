import { rollToolDie } from "./dice";
import { createRolledToolInstance } from "./tools";
import type {
  BoardSummonState,
  GridPosition,
  MovementActor,
  SummonId,
  SummonMutation,
  TriggeredSummonEffect,
  TurnToolSnapshot
} from "./types";

interface PassThroughSummonResolutionContext {
  actor: MovementActor;
  path: GridPosition[];
  summons: BoardSummonState[];
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
}

interface PassThroughSummonResolution {
  nextToolDieSeed: number;
  summonMutations: SummonMutation[];
  tools: TurnToolSnapshot[];
  triggeredSummonEffects: TriggeredSummonEffect[];
}

function positionsEqual(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

function buildWalletRewardToolInstanceId(instanceId: string, grantedToolId: TurnToolSnapshot["toolId"]): string {
  return `${instanceId}:pickup:${grantedToolId}`;
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

// Wallet pickup is resolved on the traversed path so it composes with any ground movement tool.
export function applyPassThroughSummonEffects(
  context: PassThroughSummonResolutionContext
): PassThroughSummonResolution {
  let nextToolDieSeed = context.toolDieSeed;
  let tools = context.tools;
  const remainingSummonIds = new Set(context.summons.map((summon) => summon.instanceId));
  const summonMutations: SummonMutation[] = [];
  const triggeredSummonEffects: TriggeredSummonEffect[] = [];

  for (const position of context.path) {
    const wallet = context.summons.find(
      (summon) =>
        remainingSummonIds.has(summon.instanceId) &&
        summon.summonId === "wallet" &&
        summon.ownerId === context.actor.id &&
        positionsEqual(summon.position, position) &&
        context.actor.characterId === "leader"
    );

    if (!wallet) {
      continue;
    }

    const toolRoll = rollToolDie(nextToolDieSeed);
    const grantedTool = createRolledToolInstance(
      buildWalletRewardToolInstanceId(wallet.instanceId, toolRoll.value.toolId),
      toolRoll.value
    );

    nextToolDieSeed = toolRoll.nextSeed;
    tools = [...tools, grantedTool];
    remainingSummonIds.delete(wallet.instanceId);
    summonMutations.push({
      kind: "remove",
      instanceId: wallet.instanceId
    });
    triggeredSummonEffects.push({
      kind: "wallet_pickup",
      playerId: context.actor.id,
      ownerId: wallet.ownerId,
      position: wallet.position,
      summonId: wallet.summonId,
      summonInstanceId: wallet.instanceId,
      grantedTool
    });
  }

  return {
    tools,
    nextToolDieSeed,
    summonMutations,
    triggeredSummonEffects
  };
}
