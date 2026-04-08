import { detachModifier, type ModifierDefinition } from "../modifiers";
import { getPlayerTagNumber, setPlayerTagValue } from "../playerTags";

export const BONDAGE_MODIFIER_ID = "basis:bondage";
export const BONDAGE_STACKS_TAG = "basis:bondage-stacks";

function reduceToolValue(currentValue: number, reduction: number): number {
  return Math.max(0, currentValue - reduction);
}


export const BONDAGE_MODIFIER_DEFINITION: ModifierDefinition = {
  id: BONDAGE_MODIFIER_ID,

  hooks: {
    onGetTool: ({ tags, tool }) => {
      const bondageStacks = getPlayerTagNumber(tags, BONDAGE_STACKS_TAG);

      if (bondageStacks < 1) {
        return null;
      }

      if (tool.toolId === "movement" || tool.toolId === "brake") {
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

      return null;
    },
    onTurnEnd: ({ modifiers, tags }) => ({
      nextModifiers: detachModifier(modifiers, BONDAGE_MODIFIER_ID),
      nextTags: setPlayerTagValue(tags, BONDAGE_STACKS_TAG, undefined)
    })
  }
};
