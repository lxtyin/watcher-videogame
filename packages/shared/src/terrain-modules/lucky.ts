import { rollToolDie } from "../dice";
import { createEffectEvent } from "../rules/actionPresentation";
import { appendDraftPresentationEvents } from "../rules/actionDraft";
import { createRolledToolInstance } from "../tools";
import {
  appendTerrainTrigger,
  grantLuckyReward,
  mutateTerrainTile
} from "./helpers";
import type { TerrainModule } from "./types";
import type { TurnToolSnapshot } from "../types";

const LUCKY_CLAIM_EFFECT_MS = 420;


function buildLuckyToolInstanceId(
  sourceId: string,
  tileKey: string,
  grantedToolId: TurnToolSnapshot["toolId"]
): string {
  return `${sourceId}:lucky:${tileKey}:${grantedToolId}`;
}

export const LUCKY_TERRAIN_MODULE: TerrainModule = {
  onStop: (context) => {
    if (context.player.id !== context.draft.actorId) {
      return;
    }

    const toolRoll = rollToolDie(context.draft.nextToolDieSeed);
    const rewardedTool = createRolledToolInstance(
      buildLuckyToolInstanceId(context.draft.sourceId, context.tile.key, toolRoll.value.toolId),
      toolRoll.value
    );

    grantLuckyReward(context.draft, context.player, rewardedTool, toolRoll.nextSeed);
    mutateTerrainTile(context.draft, context.tile, "emptyLucky");
    appendDraftPresentationEvents(context.draft, [
      createEffectEvent(
        `${context.draft.sourceId}:lucky:${context.tile.key}`,
        "lucky_claim",
        context.position,
        [context.position],
        context.startMs,
        LUCKY_CLAIM_EFFECT_MS
      )
    ]);
    appendTerrainTrigger(context.draft, {
      grantedTool: rewardedTool,
      kind: "lucky",
      movement: context.movement,
      playerId: context.player.id,
      position: context.player.position,
      tileKey: context.tile.key
    });
  },
  type: "lucky"
};
