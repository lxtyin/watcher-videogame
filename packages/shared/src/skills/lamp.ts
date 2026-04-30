import { getPlayerTagBoolean, setPlayerTagValue } from "../playerTags";
import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const LAMP_SKILL_ID = "lamp:copy-roll";
export const LAMP_MODIFIER_ID = "lamp:copy-roll";
export const LAMP_COPY_ROLL_READY_TAG = "lamp:copy-roll-ready";

export const LAMP_SKILL_DEFINITION: SkillDefinition = {
  id: LAMP_SKILL_ID,
  label: "复制筹划",
  getTextDescription: () => ({
    title: "复制筹划",
    description: "回合开始时获得【复制】。使用后放弃本回合工具骰，并在行动阶段获得可选择的复制工具。",
    details: ["行动阶段的复制工具会列出本轮其他玩家已使用过的工具"]
  }),
  modifierIds: [LAMP_MODIFIER_ID]
};

export const LAMP_MODIFIER_DEFINITION: ModifierDefinition = {
  id: LAMP_MODIFIER_ID,
  hooks: {
    onDiceRoll: ({ tags }) =>
      getPlayerTagBoolean(tags, LAMP_COPY_ROLL_READY_TAG)
        ? {
            grantTools: [{ toolId: "lampCopy" }],
            nextTags: setPlayerTagValue(tags, LAMP_COPY_ROLL_READY_TAG, undefined),
            rolledTool: null
          }
        : null,
    onTurnStart: () => ({
      grantTools: [{ toolId: "lampPrepareCopy" }]
    })
  }
};
