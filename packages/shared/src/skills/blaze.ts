import { getPlayerTagBoolean, setPlayerTagValue } from "../playerTags";
import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const BLAZE_SKILL_ID = "blaze:prepare-bomb";
export const BLAZE_MODIFIER_ID = "blaze:prepare-bomb";
export const BLAZE_BOMB_PREPARED_TAG = "blaze:bomb-prepared";

export const BLAZE_SKILL_DEFINITION: SkillDefinition = {
  id: BLAZE_SKILL_ID,
  label: "炸弹准备",
  getTextDescription: () => ({
    title: "炸弹准备",
    description: "回合开始可放弃移动骰，并在本回合行动阶段获得投弹。",
    details: ["回合开始：可使用备弹", "备弹后立即只投工具骰", "本回合行动阶段：获得投弹"]
  }),
  modifierIds: [BLAZE_MODIFIER_ID]
};

export const BLAZE_MODIFIER_DEFINITION: ModifierDefinition = {
  id: BLAZE_MODIFIER_ID,
  hooks: {
    onDiceRoll: ({ tags, rolledTool }) =>
      getPlayerTagBoolean(tags, BLAZE_BOMB_PREPARED_TAG)
        ? {
            grantTools: [{ toolId: "blazeBombThrow" }],
            movementRoll: 0,
            nextTags: setPlayerTagValue(tags, BLAZE_BOMB_PREPARED_TAG, undefined),
            rolledTool
          }
        : null,
    onTurnStart: ({ tags }) =>
      getPlayerTagBoolean(tags, BLAZE_BOMB_PREPARED_TAG)
        ? null
        : {
            grantTools: [{ toolId: "blazePrepareBomb" }]
          }
  }
};
