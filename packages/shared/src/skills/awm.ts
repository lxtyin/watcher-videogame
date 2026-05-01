import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const AWM_SKILL_ID = "awm:grant-shot";
export const AWM_MODIFIER_ID = "awm:grant-shot";

export const AWM_SKILL_DEFINITION: SkillDefinition = {
  id: AWM_SKILL_ID,
  label: "AWM",
  getTextDescription: () => ({
    title: "AWM",
    description: "行动阶段开始时获得一发子弹，可消耗未使用的移动点数为其充能。",
    details: ["行动阶段开始：获得子弹", "发射时消耗全部剩余移动点数"]
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
