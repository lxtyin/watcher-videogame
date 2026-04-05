import { getPlayerTagNumber } from "../playerTags";
import { setPlayerTagValue } from "../playerTags";
import type { ModifierDefinition } from "../modifiers";

export const BONDAGE_MODIFIER_ID = "basis:bondage";
export const BONDAGE_STACKS_TAG = "basis:bondage-stacks";

function reduceToolValue(currentValue: number, reduction: number): number {
  return Math.max(0, currentValue - reduction);
}

export const BONDAGE_MODIFIER_DEFINITION: ModifierDefinition = {
  id: BONDAGE_MODIFIER_ID,
  isActive: ({ tags }) => getPlayerTagNumber(tags, BONDAGE_STACKS_TAG) > 0,
  hooks: {
    onGetTool: ({ tags, tool }) => {
      const bondageStacks = getPlayerTagNumber(tags, BONDAGE_STACKS_TAG);

      if (bondageStacks < 1) {
        return null;
      }

      if (tool.toolId === "movement") {
        return {
          tool: {
            ...tool,
            params: {
              ...tool.params,
              movePoints: reduceToolValue(
                typeof tool.params.movePoints === "number" ? tool.params.movePoints : 0,
                bondageStacks
              )
            }
          }
        };
      }

      if (tool.toolId === "brake") {
        return {
          tool: {
            ...tool,
            params: {
              ...tool.params,
              brakeRange: reduceToolValue(
                typeof tool.params.brakeRange === "number" ? tool.params.brakeRange : 0,
                bondageStacks
              )
            }
          }
        };
      }

      return null;
    },
    onTurnEnd: ({ tags }) => ({
      nextTags: setPlayerTagValue(tags, BONDAGE_STACKS_TAG, undefined)
    })
  }
};
