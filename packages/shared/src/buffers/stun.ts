import { detachModifier, type ModifierDefinition } from "../modifiers";

export const STUN_MODIFIER_ID = "basis:stun";

export const STUN_MODIFIER_DEFINITION: ModifierDefinition = {
  id: STUN_MODIFIER_ID,
  hooks: {
    onTurnStart: ({ modifiers }) => ({
      nextModifiers: detachModifier(modifiers, STUN_MODIFIER_ID),
      skipTurn: true
    })
  }
};
