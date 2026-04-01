import {
  TOOL_DIE_FACES as TOOL_DIE_FACE_REGISTRY,
  TOOL_PARAMETER_LABELS,
  TOOL_REGISTRY
} from "./content/tools";
import type {
  RolledToolId,
  ToolAvailability,
  ToolChoiceDefinition,
  ToolCondition,
  ToolDefinition,
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
        choices:
          "choices" in definition
            ? (definition.choices?.map((choice: ToolChoiceDefinition) => ({
                ...choice
              })) as readonly ToolChoiceDefinition[] | undefined)
            : undefined,
        conditions: definition.conditions.map((condition) => ({
          ...condition,
          toolId: condition.toolId as ToolId
        }))
      }
    ])
  ) as Record<ToolId, ToolDefinition>;
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

// Directional tools need a cardinal input before they can execute.
export function isDirectionalTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode === "direction";
}

// Tile-target tools aim at a snapped board cell instead of a plain direction.
export function isTileTargetTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode === "tile";
}

export function isChoiceTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode === "choice";
}

export function isTileDirectionTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode === "tile_direction";
}

// Aim tools share the same press-drag-release interaction path in the client.
export function isAimTool(toolId: ToolId): boolean {
  const targetMode = TOOL_DEFINITIONS[toolId].targetMode;

  return targetMode === "direction" || targetMode === "tile" || targetMode === "tile_direction";
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

// Tool conditions return a reusable availability object instead of scattering checks.
function satisfiesCondition(
  condition: ToolCondition,
  currentTool: TurnToolSnapshot,
  tools: TurnToolSnapshot[]
): ToolAvailability {
  switch (condition.kind) {
    case "tool_present": {
      const hasMatchingTool = tools.some(
        (candidate) =>
          candidate.instanceId !== currentTool.instanceId &&
          candidate.toolId === condition.toolId &&
          (condition.toolId !== "movement" || getToolParam(candidate, "movePoints") > 0)
      );

      return hasMatchingTool
        ? { usable: true, reason: null }
        : {
            usable: false,
            reason: `需要保留一个可用的${TOOL_DEFINITIONS[condition.toolId].label}`
          };
    }
  }
}

// Availability checks centralize all runtime use requirements for tool instances.
export function getToolAvailability(
  tool: TurnToolSnapshot,
  tools: TurnToolSnapshot[]
): ToolAvailability {
  if (tool.charges < 1) {
    return {
      usable: false,
      reason: "没有剩余次数"
    };
  }

  if (tool.toolId === "movement" && getToolParam(tool, "movePoints") < 1) {
    return {
      usable: false,
      reason: "没有剩余点数"
    };
  }

  if (tool.toolId === "brake" && getToolParam(tool, "brakeRange") < 1) {
    return {
      usable: false,
      reason: "没有剩余距离"
    };
  }

  if (tool.toolId === "bombThrow" && getToolParam(tool, "pushDistance") < 1) {
    return {
      usable: false,
      reason: "没有可用的投弹位移距离"
    };
  }

  for (const condition of TOOL_DEFINITIONS[tool.toolId].conditions) {
    const result = satisfiesCondition(condition, tool, tools);

    if (!result.usable) {
      return result;
    }
  }

  return {
    usable: true,
    reason: null
  };
}

// Disabled messages combine tool-specific guidance with the current blocking reason.
export function getToolDisabledMessage(
  tool: TurnToolSnapshot,
  tools: TurnToolSnapshot[]
): string | null {
  const availability = getToolAvailability(tool, tools);

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

function formatToolButtonValue(unit: "point" | "tile", value: number): string {
  return unit === "point" ? `${value}` : `${value}`;
}

function formatToolParameterValue(
  unit: "point" | "tile" | "count",
  value: number
): string {
  if (unit === "point") {
    return `${value} 点`;
  }

  if (unit === "tile") {
    return `${value} 格`;
  }

  return `${value} 次`;
}

// Button labels derive from shared metadata so new parameterized tools do not need UI branches.
export function describeToolButtonLabel(tool: TurnToolSnapshot): string {
  const definition = TOOL_DEFINITIONS[tool.toolId];
  const buttonValue = definition.buttonValue;

  if (buttonValue) {
    return `${definition.label} ${formatToolButtonValue(buttonValue.unit, getToolParam(tool, buttonValue.paramId))}`;
  }

  return tool.charges > 1 ? `${definition.label} x${tool.charges}` : definition.label;
}

// Ring details can reuse the same metadata while keeping units visible for short labels.
export function describeToolButtonValue(tool: TurnToolSnapshot): string | null {
  const definition = TOOL_DEFINITIONS[tool.toolId];
  const buttonValue = definition.buttonValue;

  if (!buttonValue) {
    return null;
  }

  const value = getToolParam(tool, buttonValue.paramId);
  return buttonValue.unit === "point" ? `${value} 点` : `${value} 格`;
}

// Tool details expose the current parameter payload in a UI-friendly order.
export function describeToolParameters(tool: TurnToolSnapshot): string[] {
  return Object.keys(TOOL_DEFINITIONS[tool.toolId].defaultParams).map((paramId) => {
    const typedParamId = paramId as ToolParameterId;
    const descriptor = TOOL_PARAMETER_LABELS[typedParamId];
    const value = getToolParam(tool, typedParamId);

    return `${descriptor.label} ${formatToolParameterValue(descriptor.unit, value)}`;
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
