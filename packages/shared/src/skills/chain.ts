import { getPlayerTagBoolean, setPlayerTagValue } from "../playerTags";
import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const CHAIN_SKILL_ID = "chain:hook-if-still";
export const CHAIN_MODIFIER_ID = "chain:hook-if-still";
export const CHAIN_MOVED_OUT_OF_TURN_TAG = "chain:moved-out-of-turn";
export const CHAIN_HOOK_READY_TAG = "chain:hook-ready";

export const CHAIN_SKILL_DEFINITION: SkillDefinition = {
  id: CHAIN_SKILL_ID,
  label: "静止钩锁",
  summary: "若回合外没有被移动，下个行动阶段获得短钩锁。",
  getTextDescription: () => ({
    title: "静止钩锁",
    description: "若回合外没有被移动，下个行动阶段获得短钩锁。",
    details: ["回合外未被移动：下个行动阶段获得长度 3 的钩锁"]
  }),
  modifierIds: [CHAIN_MODIFIER_ID]
};

export const CHAIN_MODIFIER_DEFINITION: ModifierDefinition = {
  id: CHAIN_MODIFIER_ID,
  hooks: {
    onMovementResolved: ({ movement, tags }) => {
      if (movement.timing !== "out_of_turn") {
        return null;
      }

      return {
        nextTags: setPlayerTagValue(
          setPlayerTagValue(tags, CHAIN_HOOK_READY_TAG, undefined),
          CHAIN_MOVED_OUT_OF_TURN_TAG,
          true
        )
      };
    },
    onTurnActionStart: ({ tags }) =>
      getPlayerTagBoolean(tags, CHAIN_HOOK_READY_TAG)
        ? {
            grantTools: [
              {
                toolId: "hookshot",
                params: {
                  hookLength: 3
                }
              }
            ],
            nextTags: setPlayerTagValue(tags, CHAIN_HOOK_READY_TAG, undefined)
          }
        : null,
    onTurnStart: ({ tags }) => {
      const wasMovedOutOfTurn = getPlayerTagBoolean(tags, CHAIN_MOVED_OUT_OF_TURN_TAG);

      return {
        nextTags: setPlayerTagValue(
          setPlayerTagValue(tags, CHAIN_MOVED_OUT_OF_TURN_TAG, undefined),
          CHAIN_HOOK_READY_TAG,
          wasMovedOutOfTurn ? undefined : true
        )
      };
    }
  }
};
