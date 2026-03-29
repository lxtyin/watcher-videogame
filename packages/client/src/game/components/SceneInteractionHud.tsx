import { Html } from "@react-three/drei";
import {
  TOOL_DEFINITIONS,
  getToolDisabledMessage,
  getToolAvailability,
  isAimTool,
  isDirectionalTool,
  isTileTargetTool,
  type ToolId,
  type TurnToolSnapshot
} from "@watcher/shared";
import { type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { getActionUiConfig } from "../config/actionUi";
import type { SelectedToolInstanceId } from "../state/useGameStore";

interface SceneActionRingProps {
  tools: TurnToolSnapshot[];
  phase: "roll" | "action";
  position: [number, number, number];
  screenOffsetX?: number;
  screenOffsetY?: number;
  selectedToolInstanceId: SelectedToolInstanceId;
  onEndTurn: () => void;
  onPressAimTool: (
    toolInstanceId: string,
    clientX: number,
    clientY: number
  ) => void;
  onRollDice: () => void;
  onSelectTool: (toolInstanceId: SelectedToolInstanceId) => void;
  onShowUnavailableToolNotice: (message: string) => void;
  onUseInstantTool: (toolInstanceId: string) => void;
}

interface FloatingActionItem {
  accent: string;
  detail: string;
  disabled: boolean;
  id: string;
  label: string;
  onPointerDown: ((event: ReactPointerEvent<HTMLButtonElement>) => void) | undefined;
  selected: boolean;
  testId: string;
  token: string;
  toolId?: ToolId;
  toolInstanceId?: string;
  onClick: () => void;
}

const ARC_START_DEGREES = 206;
const ARC_END_DEGREES = 334;
const RING_CENTER_X = 150;
const RING_CENTER_Y = 154;
const RING_RADIUS = 112;

function getRingButtonStyle(index: number, total: number): CSSProperties {
  const angle =
    total === 1
      ? 270
      : ARC_START_DEGREES + ((ARC_END_DEGREES - ARC_START_DEGREES) / (total - 1)) * index;
  const radians = (angle * Math.PI) / 180;

  return {
    left: `${RING_CENTER_X + Math.cos(radians) * RING_RADIUS}px`,
    top: `${RING_CENTER_Y + Math.sin(radians) * RING_RADIUS}px`
  };
}

function getToolButtonDetail(tool: TurnToolSnapshot, tools: TurnToolSnapshot[]): string {
  const availability = getToolAvailability(tool, tools);
  const baseDetail = getActionUiConfig(tool.toolId).detail;

  if (tool.toolId === "movement") {
    return `${tool.movePoints ?? 0} 点`;
  }

  if (tool.toolId === "brake") {
    return `最多 ${tool.range ?? 0}`;
  }

  if (tool.charges > 1) {
    return `${tool.charges} 次`;
  }

  return availability.usable ? baseDetail : availability.reason ?? baseDetail;
}

function getSelectedCaption(
  phase: "roll" | "action",
  selectedTool: TurnToolSnapshot | null,
  tools: TurnToolSnapshot[]
): string {
  if (phase === "roll") {
    return "点击头顶骰子开始本回合";
  }

  if (!tools.length) {
    return "本回合没有可用工具了，结束回合吧";
  }

  if (!selectedTool) {
    return "从弧环里选择一个工具";
  }

  const availability = getToolAvailability(selectedTool, tools);
  const label = TOOL_DEFINITIONS[selectedTool.toolId].label;

  if (!availability.usable) {
    return `${label}当前不可用：${availability.reason}`;
  }

  if (isDirectionalTool(selectedTool.toolId)) {
    return `按住${label}，在场景里拖拽定向，松手执行`;
  }

  if (isTileTargetTool(selectedTool.toolId)) {
    return `按住${label}，拖到目标格后松手执行`;
  }

  return `${label}已准备好`;
}

export function SceneActionRing({
  tools,
  phase,
  position,
  screenOffsetX = 0,
  screenOffsetY = 0,
  selectedToolInstanceId,
  onEndTurn,
  onPressAimTool,
  onRollDice,
  onSelectTool,
  onShowUnavailableToolNotice,
  onUseInstantTool
}: SceneActionRingProps) {
  const selectedTool =
    tools.find((tool) => tool.instanceId === selectedToolInstanceId) ?? null;

  const actions: FloatingActionItem[] =
    phase === "roll"
      ? [
          {
            id: "roll",
            label: "掷骰",
            token: getActionUiConfig("roll").token,
            accent: getActionUiConfig("roll").accent,
            detail: getActionUiConfig("roll").detail,
            disabled: false,
            selected: false,
            testId: "scene-roll-dice-button",
            onPointerDown: undefined,
            onClick: onRollDice
          }
        ]
      : [
          ...tools.map((tool, index) => {
            const availability = getToolAvailability(tool, tools);
            const definition = TOOL_DEFINITIONS[tool.toolId];

            return {
              id: tool.instanceId,
              label: definition.label,
              token: getActionUiConfig(tool.toolId).token,
              accent: getActionUiConfig(tool.toolId).accent,
              detail: availability.usable
                ? getToolButtonDetail(tool, tools)
                : availability.reason ?? getToolButtonDetail(tool, tools),
              disabled: !availability.usable,
              selected: selectedToolInstanceId === tool.instanceId,
              testId: `scene-tool-${tool.toolId}-${index}`,
              toolId: tool.toolId,
              toolInstanceId: tool.instanceId,
              onPointerDown:
                availability.usable && isAimTool(tool.toolId)
                  ? (event: ReactPointerEvent<HTMLButtonElement>) => {
                      if (event.button !== 0) {
                        return;
                      }

                      onPressAimTool(tool.instanceId, event.clientX, event.clientY);
                    }
                  : undefined,
              onClick: () => {
                if (!availability.usable) {
                  onSelectTool(tool.instanceId);
                  onShowUnavailableToolNotice(
                    getToolDisabledMessage(tool, tools) ?? `${definition.label}当前不可用。`
                  );
                  return;
                }

                if (isAimTool(tool.toolId)) {
                  onSelectTool(tool.instanceId);
                  return;
                }

                onUseInstantTool(tool.instanceId);
              }
            };
          }),
          {
            id: "end",
            label: "结束",
            token: getActionUiConfig("end").token,
            accent: getActionUiConfig("end").accent,
            detail: getActionUiConfig("end").detail,
            disabled: false,
            selected: false,
            testId: "scene-end-turn-button",
            onPointerDown: undefined,
            onClick: onEndTurn
          }
        ];

  return (
    <Html position={position} center>
      <div
        className="scene-action-ring"
        style={{ transform: `translate(${screenOffsetX}px, ${screenOffsetY}px)` }}
      >
        <div className="scene-action-ring__arc" />
        <div className="scene-action-ring__caption">{getSelectedCaption(phase, selectedTool, tools)}</div>
        {actions.map((action, index) => (
          <button
            key={action.id}
            type="button"
            className={
              [
                "scene-action-button",
                action.selected ? "selected" : "",
                action.disabled ? "disabled" : ""
              ]
                .filter(Boolean)
                .join(" ")
            }
            data-testid={action.testId}
            data-tool-id={action.toolId}
            data-tool-instance-id={action.toolInstanceId}
            style={{ ...getRingButtonStyle(index, actions.length), "--scene-accent": action.accent } as CSSProperties}
            onPointerDown={action.onPointerDown}
            onClick={action.onClick}
            aria-disabled={action.disabled}
          >
            <span className="scene-action-button__token">{action.token}</span>
            <span className="scene-action-button__label">{action.label}</span>
            <span className="scene-action-button__detail">{action.detail}</span>
          </button>
        ))}
      </div>
    </Html>
  );
}
