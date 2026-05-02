import { createEffectEvent, createNumberPopupReactionEvent } from "../rules/actionPresentation";
import { appendDraftPresentationEvents } from "../rules/actionDraft";
import { getMovementTimingForPlayer } from "../rules/displacement";
import { createToolInstance } from "../tools";
import {
  appendTerrainTrigger,
  grantTerrainRewardTool
} from "./helpers";
import type { TerrainModule } from "./types";

const BOXING_BALL_HIT_EFFECT_MS = 540;
const BOXING_BALL_NUMBER_POPUP_MS = 640;

function buildBoxingBallPunchInstanceId(sourceId: string, tileKey: string, impactStrength: number): string {
  return `${sourceId}:boxing-ball:${tileKey}:punch:${impactStrength}`;
}

export const BOXING_BALL_TERRAIN_MODULE: TerrainModule = {
  accent: "#cf5151",
  getTextDescription: () => ({
    title: "拳击球",
    description: "会阻挡移动和投射物。被撞击时会摇摆；若由当前回合玩家以平移撞击，则奖励一个同等力度的拳击。",
    details: []
  }),
  label: "拳击球",
  onImpact: (context) => {
    appendDraftPresentationEvents(context.draft, [
      createEffectEvent(
        `${context.draft.sourceId}:boxing-ball-hit:${context.tile.key}`,
        "boxing_ball_hit",
        context.position,
        [context.position],
        context.startMs,
        BOXING_BALL_HIT_EFFECT_MS
      )
    ]);

    if (
      context.source.kind !== "player" ||
      context.source.player.id !== context.draft.actorId ||
      getMovementTimingForPlayer(context.draft.actorId, context.source.player.id) !== "in_turn"
    ) {
      return;
    }

    const rewardedTool = createToolInstance(
      buildBoxingBallPunchInstanceId(context.draft.sourceId, context.tile.key, context.strength),
      "punch",
      {
        params: {
          projectilePushDistance: context.strength
        }
      }
    );

    grantTerrainRewardTool(context.draft, context.source.player, rewardedTool);
    appendDraftPresentationEvents(context.draft, [
      createNumberPopupReactionEvent(
        `${context.draft.sourceId}:boxing-ball-popup:${context.tile.key}`,
        context.position,
        context.strength,
        context.startMs,
        BOXING_BALL_NUMBER_POPUP_MS
      )
    ]);
    appendTerrainTrigger(context.draft, {
      grantedTool: rewardedTool,
      impactStrength: context.strength,
      kind: "boxing_ball",
      movement: context.source.movement,
      playerId: context.source.player.id,
      position: context.position,
      tileKey: context.tile.key
    });
  },
  type: "boxingBall"
};
