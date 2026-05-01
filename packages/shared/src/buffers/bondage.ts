import { getToolDefinition } from "../tools";
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
    onToolPrepare: ({ tags, tool }) => {
      const bondageStacks = getPlayerTagNumber(tags, BONDAGE_STACKS_TAG);
      const toolDefinition = getToolDefinition(tool.toolId);

      if (
        bondageStacks < 1 ||
        toolDefinition.actorMovement?.disposition !== "active" ||
        typeof tool.params.movePoints !== "number"
      ) {
        return null;
      }
      
      return {
        tool: {
          ...tool,
          params: {
            ...tool.params,
            movePoints: reduceToolValue(tool.params.movePoints, bondageStacks)
          }
        }
      };
    }, 
    onTurnEnd: ({ modifiers, tags }) => ({
      nextModifiers: detachModifier(modifiers, BONDAGE_MODIFIER_ID),
      nextTags: setPlayerTagValue(tags, BONDAGE_STACKS_TAG, undefined)
    })
  }
};
