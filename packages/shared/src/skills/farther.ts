import { getPlayerTagNumber, setPlayerTagValue } from "../playerTags";
import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const FARTHER_SKILL_ID = "farther-balance";
export const FARTHER_MODIFIER_ID = "farther-balance";
export const FARTHER_BANKED_MOVEMENT_TAG = "farther:banked-movement";

export const FARTHER_SKILL_DEFINITION: SkillDefinition = {
  id: FARTHER_SKILL_ID,
  label: "制衡储存",
  getTextDescription: () => ({
    title: "制衡储存",
    description: "行动阶段获得制衡，并返还储存的移动。",
    details: ["行动阶段开始：获得制衡", "若有储存移动：返还为移动工具"]
  }),
  modifierIds: [FARTHER_MODIFIER_ID]
};

export const FARTHER_MODIFIER_DEFINITION: ModifierDefinition = {
  id: FARTHER_MODIFIER_ID,
  hooks: {
    onTurnActionStart: ({ tags }) => {
      const bankedMovement = getPlayerTagNumber(tags, FARTHER_BANKED_MOVEMENT_TAG);

      return {
        grantTools: [
          { toolId: "fartherBalance" },
          ...(bankedMovement > 0
            ? [
                {
                  toolId: "movement" as const,
                  params: {
                    movePoints: bankedMovement
                  }
                }
              ]
            : [])
        ],
        nextTags:
          bankedMovement > 0
            ? setPlayerTagValue(tags, FARTHER_BANKED_MOVEMENT_TAG, undefined)
            : tags
      };
    }
  }
};
