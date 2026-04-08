import {
  appendDraftPresentationEvents,
  applyResolvedPlayerStateToDraft,
  appendDraftTileMutations,
  appendDraftTriggeredTerrainEffects,
  setDraftToolDieSeed,
  setDraftToolInventory,
  type ResolutionDraft
} from "../rules/actionDraft";
import { createPlayerMotionEvent } from "../rules/actionPresentation";
import { applyOnGetToolModifiers } from "../skills";
import type {
  GridPosition,
  MovementActor,
  TileDefinition,
  TurnToolSnapshot,
  TriggeredTerrainEffect
} from "../types";

function clonePosition(position: GridPosition): GridPosition {
  return {
    x: position.x,
    y: position.y
  };
}

export function respawnPlayerOnTerrain(
  draft: ResolutionDraft,
  options: {
    eventId: string;
    motionStyle: "fall_side" | "spin_drop";
    player: MovementActor;
    startMs: number;
    triggerPosition: GridPosition;
  }
): void {
  const motionEvent = createPlayerMotionEvent(
    options.eventId,
    options.player.id,
    [clonePosition(options.triggerPosition), clonePosition(options.triggerPosition)],
    options.motionStyle,
    options.startMs
  );

  if (motionEvent) {
    appendDraftPresentationEvents(draft, [motionEvent]);
  }

  options.player.position = clonePosition(options.player.spawnPosition);
  applyResolvedPlayerStateToDraft(draft, options.player);
}

export function appendTerrainTrigger(
  draft: ResolutionDraft,
  effect: TriggeredTerrainEffect
): void {
  appendDraftTriggeredTerrainEffects(draft, [effect]);
}

export function mutateTerrainTile(
  draft: ResolutionDraft,
  tile: TileDefinition,
  nextType: TileDefinition["type"],
  nextDurability = tile.durability
): void {
  appendDraftTileMutations(draft, [
    {
      key: tile.key,
      nextDurability,
      nextType,
      position: clonePosition({
        x: tile.x,
        y: tile.y
      })
    }
  ]);
}

export function grantLuckyReward(
  draft: ResolutionDraft,
  player: MovementActor,
  rewardedTool: TurnToolSnapshot,
  nextToolDieSeed: number
): void {
  const normalizedReward = applyOnGetToolModifiers(
    player.characterId,
    {
      id: player.id,
      modifiers: [...player.modifiers],
      phase: "turn-action",
      position: clonePosition(player.position),
      tags: { ...player.tags },
      tools: [rewardedTool]
    },
    [rewardedTool]
  );

  player.modifiers = [...normalizedReward.nextModifiers];
  player.tags = { ...normalizedReward.nextTags };
  applyResolvedPlayerStateToDraft(draft, player);
  setDraftToolDieSeed(draft, nextToolDieSeed);
  setDraftToolInventory(draft, [...draft.tools, ...normalizedReward.tools]);
}
