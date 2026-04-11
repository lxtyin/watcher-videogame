import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const LEADER_SKILL_ID = "leader:deploy-wallet";
export const LEADER_MODIFIER_ID = "leader:deploy-wallet";

export const LEADER_SKILL_DEFINITION: SkillDefinition = {
  id: LEADER_SKILL_ID,
  label: "部署钱包",
  summary: "行动阶段开始时获得一个放置钱包。",
  getTextDescription: () => ({
    title: "部署钱包",
    description: "行动阶段开始时获得一个放置钱包。",
    details: ["行动阶段开始：获得放置钱包"]
  }),
  modifierIds: [LEADER_MODIFIER_ID]
};

export const LEADER_MODIFIER_DEFINITION: ModifierDefinition = {
  id: LEADER_MODIFIER_ID,
  hooks: {
    onTurnActionStart: () => ({
      grantTools: [{ toolId: "deployWallet" }]
    })
  }
};
