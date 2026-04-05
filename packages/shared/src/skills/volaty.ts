import { getPlayerTagBoolean, setPlayerTagValue } from "../playerTags";
import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const VOLATY_SKILL_ID = "volaty:leap-roll";
export const VOLATY_MODIFIER_ID = "volaty:leap-roll";
export const VOLATY_LEAP_PENDING_TAG = "volaty:leap-pending";
export const VOLATY_LEAP_TURN_TAG = "volaty:leap-turn";

export const VOLATY_SKILL_DEFINITION: SkillDefinition = {
  id: VOLATY_SKILL_ID,
  label: "飞跃开局",
  summary: "回合开始可跳过工具骰，并把本回合平移改成飞跃。",
  modifierIds: [VOLATY_MODIFIER_ID]
};

export const VOLATY_MODIFIER_DEFINITION: ModifierDefinition = {
  id: VOLATY_MODIFIER_ID,
  hooks: {
    getMovementType: ({ movementType, tags }) =>
      movementType === "translate" && getPlayerTagBoolean(tags, VOLATY_LEAP_TURN_TAG)
        ? "leap"
        : null,
    onDiceRoll: ({ tags }) =>
      getPlayerTagBoolean(tags, VOLATY_LEAP_PENDING_TAG)
        ? {
            nextTags: setPlayerTagValue(
              setPlayerTagValue(tags, VOLATY_LEAP_PENDING_TAG, undefined),
              VOLATY_LEAP_TURN_TAG,
              true
            )
          }
        : null,
    onTurnEnd: ({ tags }) => ({
      nextTags: setPlayerTagValue(
        setPlayerTagValue(tags, VOLATY_LEAP_PENDING_TAG, undefined),
        VOLATY_LEAP_TURN_TAG,
        undefined
      )
    }),
    onTurnStart: ({ tags }) => ({
      grantTools: [{ toolId: "volatySkipToolDie" }],
      nextTags: setPlayerTagValue(
        setPlayerTagValue(tags, VOLATY_LEAP_PENDING_TAG, undefined),
        VOLATY_LEAP_TURN_TAG,
        undefined
      )
    })
  }
};
