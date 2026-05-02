import { rollToolDie } from "../dice";
import { createEffectEvent } from "../rules/actionPresentation";
import { appendDraftPresentationEvents } from "../rules/actionDraft";
import { createRolledToolInstance } from "../tools";
import {
  appendTerrainTrigger,
  grantTerrainRewardTool
} from "./helpers";
import type { TerrainModule } from "./types";
import type { TurnToolSnapshot } from "../types";

const TEAM_CAMP_EFFECT_MS = 420;

function buildTeamCampToolInstanceId(
  sourceId: string,
  tileKey: string,
  grantedToolId: TurnToolSnapshot["toolId"]
): string {
  return `${sourceId}:team-camp:${tileKey}:${grantedToolId}`;
}

export const TEAM_CAMP_TERRAIN_MODULE: TerrainModule = {
  accent: "#ccb37b",
  getTextDescription: (tile) => ({
    title: tile.faction === "black" ? "黑队营地" : "白队营地",
    description: "仅己方角色停留时，获得随机工具。",
    details: []
  }),
  label: "阵营营地",
  onStop: (context) => {
    if (
      context.player.id !== context.draft.actorId ||
      context.movementTiming !== "in_turn" ||
      !context.tile.faction ||
      context.player.teamId !== context.tile.faction
    ) {
      return;
    }

    const toolRoll = rollToolDie(context.draft.nextToolDieSeed);
    const rewardedTool = createRolledToolInstance(
      buildTeamCampToolInstanceId(context.draft.sourceId, context.tile.key, toolRoll.value.toolId),
      toolRoll.value
    );

    grantTerrainRewardTool(context.draft, context.player, rewardedTool, toolRoll.nextSeed);
    appendDraftPresentationEvents(context.draft, [
      createEffectEvent(
        `${context.draft.sourceId}:team-camp:${context.tile.key}`,
        "lucky_claim",
        context.position,
        [context.position],
        context.startMs,
        TEAM_CAMP_EFFECT_MS
      )
    ]);
    appendTerrainTrigger(context.draft, {
      grantedTool: rewardedTool,
      kind: "team_camp",
      playerId: context.player.id,
      position: context.position,
      teamId: context.tile.faction,
      tileKey: context.tile.key
    });
  },
  type: "teamCamp"
};

