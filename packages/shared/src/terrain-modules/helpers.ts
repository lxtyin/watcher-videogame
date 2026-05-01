import {
  appendDraftPresentationEvents,
  applyResolvedPlayerStateToDraft,
  appendDraftPreviewHighlightTiles,
  appendDraftTileMutations,
  appendDraftTriggeredTerrainEffects,
  setDraftPlayerVisibility,
  setDraftToolDieSeed,
  setDraftToolInventory,
  type ResolutionDraft
} from "../rules/actionDraft";
import { createPlayerMotionEvent, createStateTransitionEvent } from "../rules/actionPresentation";
import { getTileAfterMutations } from "../rules/spatial";
import { STUN_MODIFIER_ID } from "../buffers";
import { attachModifier } from "../modifiers";
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

function teamHasStandingTower(draft: ResolutionDraft, teamId: MovementActor["teamId"]): boolean {
  if (!teamId) {
    return false;
  }

  return draft.board.tiles.some((baseTile) => {
    const tile = getTileAfterMutations(draft.board, draft.tileMutations, baseTile);
    return tile?.type === "tower" && tile.faction === teamId;
  });
}

function canRespawnPlayer(draft: ResolutionDraft, player: MovementActor): boolean {
  if (draft.mode !== "bedwars") {
    return true;
  }

  return teamHasStandingTower(draft, player.teamId);
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

  const respawnAllowed = canRespawnPlayer(draft, options.player);

  if (!respawnAllowed) {
    const hideEvent = createStateTransitionEvent(
      `${options.eventId}:hide`,
      [],
      [],
      [
        {
          playerId: options.player.id,
          before: {
            boardVisible: true,
            playerId: options.player.id
          },
          after: {
            boardVisible: false,
            playerId: options.player.id
          }
        }
      ],
      motionEvent ? motionEvent.startMs + motionEvent.durationMs : options.startMs
    );

    if (hideEvent) {
      appendDraftPresentationEvents(draft, [hideEvent]);
    }

    setDraftPlayerVisibility(draft, options.player.id, false);
    return;
  }

  options.player.position = clonePosition(options.player.spawnPosition);
  if (draft.mode === "bedwars") {
    options.player.modifiers = attachModifier(options.player.modifiers, STUN_MODIFIER_ID);
  }
  applyResolvedPlayerStateToDraft(draft, options.player);
}

export function appendTerrainTrigger(
  draft: ResolutionDraft,
  effect: TriggeredTerrainEffect
): void {
  appendDraftTriggeredTerrainEffects(draft, [effect]);
}

export function appendTerrainPreviewHighlight(
  draft: ResolutionDraft,
  position: GridPosition
): void {
  appendDraftPreviewHighlightTiles(draft, [position]);
}

export function mutateTerrainTile(
  draft: ResolutionDraft,
  tile: TileDefinition,
  nextType: TileDefinition["type"],
  nextDurability = tile.durability,
  presentationStartMs?: number
): void {
  appendDraftTileMutations(draft, [
    {
      key: tile.key,
      nextDurability,
      nextType,
      ...(presentationStartMs === undefined ? {} : { presentationStartMs }),
      position: clonePosition({
        x: tile.x,
        y: tile.y
      })
    }
  ]);
}

export function grantTerrainRewardTool(
  draft: ResolutionDraft,
  player: MovementActor,
  rewardedTool: TurnToolSnapshot,
  nextToolDieSeed?: number
): void {
  const normalizedReward = applyOnGetToolModifiers(
    player.characterId,
    {
      id: player.id,
      modifiers: [...player.modifiers],
      phase: "turn-action",
      position: clonePosition(player.position),
      tags: { ...player.tags },
      toolHistory: [],
      turnNumber: 0,
      tools: [rewardedTool]
    },
    [rewardedTool]
  );

  player.modifiers = [...normalizedReward.nextModifiers];
  player.tags = { ...normalizedReward.nextTags };
  applyResolvedPlayerStateToDraft(draft, player);
  if (typeof nextToolDieSeed === "number") {
    setDraftToolDieSeed(draft, nextToolDieSeed);
  }
  setDraftToolInventory(draft, [...draft.tools, ...normalizedReward.tools]);
}
