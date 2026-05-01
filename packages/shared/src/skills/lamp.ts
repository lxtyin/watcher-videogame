import {
  LAMP_COPY_HISTORY_INDEX_TAG,
  LAMP_LAST_TURN_END_TAG,
  getLampCopyHistoryIndex,
  toLampCopiedToolLoadout
} from "../lamp-copy";
import { setPlayerTagValue } from "../playerTags";
import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const LAMP_SKILL_ID = "lamp:copy-roll";
export const LAMP_MODIFIER_ID = "lamp:copy-roll";
export const LAMP_COPY_ROLL_READY_TAG = "lamp:copy-roll-ready";

export {
  LAMP_COPY_HISTORY_INDEX_TAG,
  LAMP_LAST_TURN_END_TAG
} from "../lamp-copy";

export const LAMP_SKILL_DEFINITION: SkillDefinition = {
  id: LAMP_SKILL_ID,
  label: "复制筹划",
  getTextDescription: () => ({
    title: "复制筹划",
    description: "回合开始时获得【复制】。使用后放弃本回合工具骰，并在行动阶段获得一个可复制工具。",
    details: ["复制候选取自自己上回合结束后到本回合开始前，其他玩家使用过的工具记录。"]
  }),
  modifierIds: [LAMP_MODIFIER_ID]
};

export const LAMP_MODIFIER_DEFINITION: ModifierDefinition = {
  id: LAMP_MODIFIER_ID,
  hooks: {
    onTurnActionStart: ({ actorId, tags, toolHistory, turnNumber }) => {
      const historyIndex = getLampCopyHistoryIndex(tags);

      if (historyIndex === null) {
        return null;
      }

      const historyEntry = toolHistory[historyIndex] ?? null;
      const candidate =
        historyEntry &&
        historyEntry.playerId !== actorId &&
        historyEntry.toolId !== "lampCopy" &&
        historyEntry.turnNumber < turnNumber
          ? {
              historyEntry,
              historyIndex
            }
          : null;

      return {
        grantTools: candidate ? [toLampCopiedToolLoadout(candidate)] : [],
        nextTags: setPlayerTagValue(tags, LAMP_COPY_HISTORY_INDEX_TAG, undefined)
      };
    },
    onTurnEnd: ({ tags, turnNumber }) => ({
      nextTags: setPlayerTagValue(tags, LAMP_LAST_TURN_END_TAG, turnNumber)
    }),
    onTurnStart: () => ({
      grantTools: [{ toolId: "lampCopy" }]
    })
  }
};
