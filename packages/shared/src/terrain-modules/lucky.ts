import {
  getDiceRewardCode
} from "../diceReward";
import { createDiceRewardTool } from "../diceRewardTools";
import { createEffectEvent } from "../rules/actionPresentation";
import { appendDraftPresentationEvents } from "../rules/actionDraft";
import {
  appendTerrainTrigger,
  grantTerrainRewardTool
} from "./helpers";
import type { TerrainModule } from "./types";

const LUCKY_CLAIM_EFFECT_MS = 420;

function buildLuckyToolInstanceId(
  sourceId: string,
  tileKey: string,
  grantedToolId: string
): string {
  return `${sourceId}:lucky:${tileKey}:${grantedToolId}`;
}

export const LUCKY_TERRAIN_MODULE: TerrainModule = {
  accent: "#d6bf70",
  getTextDescription: () => ({
    title: "幸运方块",
    description: "在上方停留时，获得相应的奖励。",
    details: []
  }),
  label: "幸运方块",
  onStop: (context) => {
    if (context.movementTiming !== "in_turn") {
      return;
    }

    const rewardCode = getDiceRewardCode(context.tile.state);
    const reward = createDiceRewardTool(
      rewardCode,
      context.draft.nextToolDieSeed,
      (grantedToolId) =>
        buildLuckyToolInstanceId(context.draft.sourceId, context.tile.key, grantedToolId)
    );

    grantTerrainRewardTool(context.draft, context.player, reward.grantedTool, reward.nextToolDieSeed);
    appendDraftPresentationEvents(context.draft, [
      createEffectEvent(
        `${context.draft.sourceId}:lucky:${context.tile.key}`,
        "dice_reward_claim",
        context.position,
        [context.position],
        context.startMs,
        LUCKY_CLAIM_EFFECT_MS,
        { rewardCode }
      )
    ]);
    appendTerrainTrigger(context.draft, {
      grantedTool: reward.grantedTool,
      kind: "lucky",
      movement: context.movement,
      playerId: context.player.id,
      position: context.player.position,
      tileKey: context.tile.key
    });
  },
  type: "lucky"
};
