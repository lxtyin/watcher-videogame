import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const EHH_SKILL_ID = "ehh:extra-basketball";
export const EHH_MODIFIER_ID = "ehh:extra-basketball";

export const EHH_SKILL_DEFINITION: SkillDefinition = {
  id: EHH_SKILL_ID,
  label: "额外篮球",
  getTextDescription: () => ({
    title: "额外篮球",
    description: "行动阶段开始时获得一个篮球。",
    details: ["行动阶段开始：获得篮球"]
  }),
  modifierIds: [EHH_MODIFIER_ID]
};

export const EHH_MODIFIER_DEFINITION: ModifierDefinition = {
  id: EHH_MODIFIER_ID,
  hooks: {
    onTurnActionStart: () => ({
      grantTools: [{ toolId: "basketball" }]
    })
  }
};
