import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const AWM_SKILL_ID = "awm:grant-shot";
export const AWM_MODIFIER_ID = "awm:grant-shot";

export const AWM_SKILL_DEFINITION: SkillDefinition = {
  id: AWM_SKILL_ID,
  label: "AWM",
  summary: "行动阶段开始时获得一发狙击，可向命中的玩家施加束缚。",
  getTextDescription: () => ({
    title: "AWM",
    description: "行动阶段开始时获得一发狙击，可向命中的玩家施加束缚。",
    details: ["行动阶段开始：获得狙击"]
  }),
  modifierIds: [AWM_MODIFIER_ID]
};

export const AWM_MODIFIER_DEFINITION: ModifierDefinition = {
  id: AWM_MODIFIER_ID,
  hooks: {
    onTurnActionStart: () => ({
      grantTools: [{ toolId: "awmShoot" }]
    })
  }
};
