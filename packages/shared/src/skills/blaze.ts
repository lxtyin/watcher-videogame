import { getPlayerTagBoolean, setPlayerTagValue } from "../playerTags";
import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const BLAZE_SKILL_ID = "blaze:prepare-bomb";
export const BLAZE_MODIFIER_ID = "blaze:prepare-bomb";
export const BLAZE_BOMB_PREPARED_TAG = "blaze:bomb-prepared";

export const BLAZE_SKILL_DEFINITION: SkillDefinition = {
  id: BLAZE_SKILL_ID,
  label: "炸弹准备",
  summary: "回合开始可准备炸弹，下个行动阶段获得投弹。",
  modifierIds: [BLAZE_MODIFIER_ID]
};

export const BLAZE_MODIFIER_DEFINITION: ModifierDefinition = {
  id: BLAZE_MODIFIER_ID,
  hooks: {
    onTurnActionStart: ({ tags }) =>
      getPlayerTagBoolean(tags, BLAZE_BOMB_PREPARED_TAG)
        ? {
            grantTools: [{ toolId: "bombThrow" }],
            nextTags: setPlayerTagValue(tags, BLAZE_BOMB_PREPARED_TAG, undefined)
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
