import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const MOUNTAIN_SKILL_ID = "mountain:end-turn-build-wall";
export const MOUNTAIN_MODIFIER_ID = "mountain:end-turn-build-wall";

export const MOUNTAIN_SKILL_DEFINITION: SkillDefinition = {
  id: MOUNTAIN_SKILL_ID,
  label: "回合末砌墙",
  getTextDescription: () => ({
    title: "回合末砌墙",
    description: "回合结束阶段开始时，获得一个耐久 2 的砌墙。",
    details: ["回合结束阶段开始：获得耐久 2 的砌墙"]
  }),
  modifierIds: [MOUNTAIN_MODIFIER_ID]
};

export const MOUNTAIN_MODIFIER_DEFINITION: ModifierDefinition = {
  id: MOUNTAIN_MODIFIER_ID,
  hooks: {
    onTurnEndStart: () => ({
      grantTools: [
        {
          toolId: "buildWall",
          source: "character_skill",
          params: {
            wallDurability: 2
          }
        }
      ]
    })
  }
};
