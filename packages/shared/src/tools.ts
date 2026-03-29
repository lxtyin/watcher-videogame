import type { ToolDefinition, ToolId } from "./types";

export const TOOL_DIE_FACES: readonly ToolId[] = ["jump", "hookshot", "pivot", "dash"];

export const TOOL_DEFINITIONS: Record<ToolId, ToolDefinition> = {
  jump: {
    id: "jump",
    label: "Jump",
    description: "Leap up to 2 tiles and ignore obstacles in between.",
    targetMode: "direction",
    chargesPerRoll: 1,
    color: "#85c772"
  },
  hookshot: {
    id: "hookshot",
    label: "Hookshot",
    description: "Hook a wall within 3 tiles or pull a player toward you.",
    targetMode: "direction",
    chargesPerRoll: 1,
    color: "#6ca7d9"
  },
  pivot: {
    id: "pivot",
    label: "Pivot",
    description: "Gain one extra movement segment this turn.",
    targetMode: "instant",
    chargesPerRoll: 1,
    color: "#c89cf1"
  },
  dash: {
    id: "dash",
    label: "Dash",
    description: "Gain 2 extra move points this turn.",
    targetMode: "instant",
    chargesPerRoll: 1,
    color: "#f0ad4e"
  }
};

export function getToolDefinition(toolId: ToolId): ToolDefinition {
  return TOOL_DEFINITIONS[toolId];
}

export function isDirectionalTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode === "direction";
}
