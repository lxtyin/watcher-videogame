import {
  TOOL_DIE_FACES as TOOL_DIE_FACE_REGISTRY,
  TOOL_REGISTRY
} from "./content/tools";
import {
  isChoiceInteractionDefinition,
  isInstantInteractionDefinition,
  isPointerDrivenInteractionDefinition
} from "./toolInteraction";
import type {
  RolledToolId,
  TextDescription,
  ToolChoiceDefinition,
  ToolDefinition,
  ToolInteractionDefinition,
  ToolDieFaceDefinition,
  ToolId,
  ToolLoadoutDefinition,
  ToolParameterId,
  ToolParameterValueMap,
  TurnToolSnapshot
} from "./types";

function materializeToolDefinitions(): Record<ToolId, ToolDefinition> {
  return Object.fromEntries(
    Object.entries(TOOL_REGISTRY).map(([toolId, definition]) => [
      toolId,
      {
        id: toolId as ToolId,
        ...definition,
        phases: "phases" in definition ? (definition.phases ?? ["turn-action"]) : ["turn-action"],
        choices:
          "choices" in definition
            ? (definition.choices?.map((choice: ToolChoiceDefinition) => ({
                ...choice
              })) as readonly ToolChoiceDefinition[] | undefined)
            : undefined
      }
    ])
  ) as unknown as Record<ToolId, ToolDefinition>;
}

function materializeToolDieFaces(): readonly ToolDieFaceDefinition[] {
  return TOOL_DIE_FACE_REGISTRY.map((face) => ({
    ...face,
    toolId: face.toolId as RolledToolId
  })) as readonly ToolDieFaceDefinition[];
}

export const TOOL_DEFINITIONS = materializeToolDefinitions();
export const TOOL_DIE_FACES = materializeToolDieFaces();

function mergeToolParams(
  toolId: ToolId,
  overrides: ToolParameterValueMap | undefined
): ToolParameterValueMap {
  return {
    ...TOOL_DEFINITIONS[toolId].defaultParams,
    ...(overrides ?? {})
  };
}

// Tool definitions are the canonical metadata source for both rules and UI.
export function getToolDefinition(toolId: ToolId): ToolDefinition {
  return TOOL_DEFINITIONS[toolId];
}

export function canUseToolInPhase(toolId: ToolId, phase: ToolDefinition["phases"][number]): boolean {
  return TOOL_DEFINITIONS[toolId].phases.includes(phase);
}

export function getToolInteractionDefinition(toolId: ToolId): ToolInteractionDefinition {
  return TOOL_DEFINITIONS[toolId].interaction;
}

export function isDirectionalTool(toolId: ToolId): boolean {
  const stages = getToolInteractionDefinition(toolId).stages;

  return stages.length === 1 && stages[0]?.kind === "drag-direction-release";
}

export function isTileTargetTool(toolId: ToolId): boolean {
  const stages = getToolInteractionDefinition(toolId).stages;

  return stages.length === 1 && stages[0]?.kind === "drag-tile-release";
}

export function isChoiceTool(toolId: ToolId): boolean {
  return isChoiceInteractionDefinition(getToolInteractionDefinition(toolId));
}

export function isTileDirectionTool(toolId: ToolId): boolean {
  return getToolInteractionDefinition(toolId).stages.some(
    (stage) => stage.kind === "drag-axis-tile-release"
  );
}

export function isAimTool(toolId: ToolId): boolean {
  return isPointerDrivenInteractionDefinition(getToolInteractionDefinition(toolId));
}

export function isInstantTool(toolId: ToolId): boolean {
  return isInstantInteractionDefinition(getToolInteractionDefinition(toolId));
}

export function isCharacterSkillTool(tool: TurnToolSnapshot): boolean {
  return tool.source === "character_skill";
}

// Tool instances are built from one helper so rolls, debug grants, and spawned tools stay consistent.
export function createToolInstance(
  instanceId: string,
  toolId: ToolId,
  overrides: Omit<ToolLoadoutDefinition, "toolId"> = {}
): TurnToolSnapshot {
  const definition = TOOL_DEFINITIONS[toolId];

  return {
    instanceId,
    toolId,
    charges: overrides.charges ?? definition.defaultCharges,
    params: mergeToolParams(toolId, overrides.params),
    source: overrides.source ?? definition.source
  };
}

// Movement is still created through a helper because the movement die supplies its point value directly.
export function createMovementToolInstance(
  instanceId: string,
  movePoints: number
): TurnToolSnapshot {
  return createToolInstance(instanceId, "movement", {
    params: {
      movePoints
    }
  });
}

// Rolled tools use the configured die face payload so both type and base values stay configurable.
export function createRolledToolInstance(
  instanceId: string,
  face: ToolDieFaceDefinition
): TurnToolSnapshot {
  return createToolInstance(instanceId, face.toolId, face);
}

// Debug grants use the tool definition defaults unless the caller supplies an override later.
export function createDebugToolInstance(
  instanceId: string,
  toolId: ToolId
): TurnToolSnapshot {
  return createToolInstance(instanceId, toolId);
}

// Tool lookup is shared by the room, preview layer, and HUD selection flow.
export function findToolInstance(
  tools: TurnToolSnapshot[],
  instanceId: string
): TurnToolSnapshot | undefined {
  return tools.find((tool) => tool.instanceId === instanceId);
}

// Parameter access always falls back to the tool definition defaults.
export function getToolParam(tool: TurnToolSnapshot, paramId: ToolParameterId): number {
  return tool.params[paramId] ?? TOOL_DEFINITIONS[tool.toolId].defaultParams[paramId] ?? 0;
}

// Consuming a tool removes depleted instances while preserving multi-charge support.
export function consumeToolInstance(
  tools: TurnToolSnapshot[],
  instanceId: string
): TurnToolSnapshot[] {
  return tools.flatMap((tool) => {
    if (tool.instanceId !== instanceId) {
      return [tool];
    }

    if (tool.charges <= 1) {
      return [];
    }

    return [
      {
        ...tool,
        charges: tool.charges - 1
      }
    ];
  });
}

// Disabled messages combine tool-specific guidance with the current blocking reason.
export function getToolDisabledMessage(
  tool: TurnToolSnapshot,
  tools: TurnToolSnapshot[]
): string | null {
  const availability = TOOL_DEFINITIONS[tool.toolId].isAvailable({
    tool,
    tools
  });

  if (availability.usable) {
    return null;
  }

  const configuredHint = TOOL_DEFINITIONS[tool.toolId].disabledHint;

  if (!configuredHint) {
    return availability.reason ?? `${TOOL_DEFINITIONS[tool.toolId].label}当前不可用。`;
  }

  if (!availability.reason) {
    return configuredHint;
  }

  return `${configuredHint} 当前限制：${availability.reason}。`;
}

// Button labels derive from each tool's own display text instead of a shared parameter formatter.
export function describeToolButtonLabel(tool: TurnToolSnapshot): string {
  const textDescription = getToolTextDescription(tool);

  return tool.charges > 1 ? `${textDescription.title} x${tool.charges}` : textDescription.title;
}

export function getToolTextDescription(tool: TurnToolSnapshot): TextDescription {
  const definition = TOOL_DEFINITIONS[tool.toolId];

  return definition.getTextDescription({
    charges: tool.charges,
    params: tool.params
  });
}

export function getToolChoiceDefinitions(toolId: ToolId): readonly ToolChoiceDefinition[] {
  return TOOL_DEFINITIONS[toolId].choices ?? [];
}

// Debug menus list every tool that can be spawned directly in the current prototype.
export function getDebugGrantableToolIds(): ToolId[] {
  return (Object.values(TOOL_DEFINITIONS) as ToolDefinition[])
    .filter((definition) => definition.debugGrantable)
    .map((definition) => definition.id);
}

// Tool dice read from the configured face list instead of hardcoded ids.
export function getRollableToolIds(): RolledToolId[] {
  return TOOL_DIE_FACES.map((face) => face.toolId);
}
