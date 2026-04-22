import type { PresentationSoundCueContentDefinition } from "./schema";

function defineSoundCueRegistry<
  const Registry extends Record<string, PresentationSoundCueContentDefinition>
>(
  registry: Registry
): Registry {
  return registry;
}

export const SOUND_CUE_REGISTRY = defineSoundCueRegistry({
  footstep_soft: {
    label: "Footstep Soft",
    description: "Soft landing and walking contact used for grounded movement."
  },
  terrain_earth_wall_break: {
    label: "Earth Wall Break",
    description: "Break impact for earth wall destruction."
  },
  tool_buff: {
    label: "Tool Buff",
    description: "Activation cue for buff or setup style tools."
  },
  tool_build: {
    label: "Tool Build",
    description: "Construction or deploy cue for placeable tools."
  },
  tool_chain: {
    label: "Tool Chain",
    description: "Launch cue for chain or hook style tools."
  },
  tool_explosion: {
    label: "Tool Explosion",
    description: "Heavy explosion cue for blast tools."
  },
  tool_punch: {
    label: "Tool Punch",
    description: "Impact cue for punch style attacks."
  },
  tool_shot_bullet: {
    label: "Tool Shot Bullet",
    description: "Gunshot cue for bullet projectiles."
  },
  tool_shot_heavy: {
    label: "Tool Shot Heavy",
    description: "Heavy firing cue for rockets and similar launchers."
  },
  tool_teleport: {
    label: "Tool Teleport",
    description: "Teleport cue for instant reposition tools."
  },
  tool_throw: {
    label: "Tool Throw",
    description: "Throw or toss cue for launched objects."
  }
} as const);
