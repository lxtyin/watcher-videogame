import type { ModifierDefinition, SkillDefinition } from "../modifiers";

export const LATE_SKILL_ID = "late:brake-movement";
export const LATE_MODIFIER_ID = "late:brake-movement";

export const LATE_SKILL_DEFINITION: SkillDefinition = {
  id: LATE_SKILL_ID,
  label: "制动替换",
  summary: "将获得的移动改为等距离制动。",
  modifierIds: [LATE_MODIFIER_ID]
};

export const LATE_MODIFIER_DEFINITION: ModifierDefinition = {
  id: LATE_MODIFIER_ID,
  hooks: {
    onGetTool: ({ tool }) => {
      if (tool.toolId !== "movement") {
        return null;
      }

      return {
        tool: {
          ...tool,
          toolId: "brake",
          params: {
            ...tool.params,
            brakeRange: typeof tool.params.movePoints === "number" ? tool.params.movePoints : 0
          }
        }
      };
    }
  }
};
