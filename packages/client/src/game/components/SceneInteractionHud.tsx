import { Html } from "@react-three/drei";
import {
  TOOL_DEFINITIONS,
  describeToolButtonValue,
  getToolAvailability,
  getToolChoiceDefinitions,
  getToolDisabledMessage,
  isAimTool,
  isChoiceTool,
  isDirectionalTool,
  isTileDirectionTool,
  isTileTargetTool,
  type ToolId,
  type TurnPhase,
  type TurnToolSnapshot
} from "@watcher/shared";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from "react";
import { getActionUiConfig } from "../content/actionUi";
import type { SelectedToolInstanceId } from "../state/useGameStore";

interface SceneActionRingProps {
  hidden?: boolean;
  interactive?: boolean;
  phase: TurnPhase;
  position: [number, number, number];
  screenOffsetX?: number;
  screenOffsetY?: number;
  selectedToolInstanceId: SelectedToolInstanceId;
  tools: TurnToolSnapshot[];
  onEndTurn: () => void;
  onPressAimTool: (toolInstanceId: string, clientX: number, clientY: number) => void;
  onRollDice: () => void;
  onSelectTool: (toolInstanceId: SelectedToolInstanceId) => void;
  onShowUnavailableToolNotice: (message: string) => void;
  onUseChoiceTool: (toolInstanceId: string, choiceId: string) => void;
  onUseInstantTool: (toolInstanceId: string) => void;
}

interface FloatingActionItem {
  accent: string;
  detail: string;
  disabled: boolean;
  id: string;
  label: string;
  onClick: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  selected: boolean;
  testId: string;
  token: string;
  toolId?: ToolId;
  toolInstanceId?: string;
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
  const buttonValue = describeToolButtonValue(tool);

  if (buttonValue) {
    return buttonValue;
  }

  if (tool.charges > 1) {
    return `${tool.charges} 次`;
  }

  return availability.usable ? baseDetail : availability.reason ?? baseDetail;
}

function getSelectedCaption(
  phase: TurnPhase,
  selectedTool: TurnToolSnapshot | null,
  tools: TurnToolSnapshot[]
): string {
  if (phase === "turn-start") {
    return tools.length
      ? "点击投骰开始回合，或先使用当前阶段工具"
      : "点击投骰开始本回合";
  }

  if (!tools.length) {
    return phase === "turn-end" ? "回合结束阶段没有可用工具" : "本回合没有可用工具了，结束回合吧";
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
    return `按住${label}并拖拽定向，松手执行`;
  }

  if (isTileTargetTool(selectedTool.toolId)) {
    return `按住${label}，拖到目标格后松手执行`;
  }

  if (isTileDirectionTool(selectedTool.toolId)) {
    return `按住${label}，先选格子再拖出方向`;
  }

  if (isChoiceTool(selectedTool.toolId)) {
    return `点击下方选项，决定${label}的结算方式`;
  }

  return `${label}已准备好`;
}

export function SceneActionRing({
  hidden = false,
  interactive = true,
  phase,
  position,
  screenOffsetX = 0,
  screenOffsetY = 0,
  selectedToolInstanceId,
  tools,
  onEndTurn,
  onPressAimTool,
  onRollDice,
  onSelectTool,
  onShowUnavailableToolNotice,
  onUseChoiceTool,
  onUseInstantTool
}: SceneActionRingProps) {
  const [incomingToolInstanceIds, setIncomingToolInstanceIds] = useState<string[]>([]);
  const previousActionToolIdsRef = useRef<string[]>([]);
  const incomingClearTimerRef = useRef<number | null>(null);
  const selectedTool = tools.find((tool) => tool.instanceId === selectedToolInstanceId) ?? null;
  const actionToolIds = useMemo(() => tools.map((tool) => tool.instanceId), [tools]);

  useEffect(() => {
    if (phase !== "turn-action") {
      previousActionToolIdsRef.current = [];
      setIncomingToolInstanceIds([]);

      if (incomingClearTimerRef.current !== null) {
        window.clearTimeout(incomingClearTimerRef.current);
        incomingClearTimerRef.current = null;
      }

      return;
    }

    if (!previousActionToolIdsRef.current.length) {
      previousActionToolIdsRef.current = actionToolIds;
      return;
    }

    const nextIncomingToolIds = actionToolIds.filter(
      (toolInstanceId) => !previousActionToolIdsRef.current.includes(toolInstanceId)
    );

    previousActionToolIdsRef.current = actionToolIds;

    if (!nextIncomingToolIds.length) {
      return;
    }

    setIncomingToolInstanceIds((currentIds) => Array.from(new Set([...currentIds, ...nextIncomingToolIds])));

    if (incomingClearTimerRef.current !== null) {
      window.clearTimeout(incomingClearTimerRef.current);
    }

    incomingClearTimerRef.current = window.setTimeout(() => {
      setIncomingToolInstanceIds([]);
      incomingClearTimerRef.current = null;
    }, 560);
  }, [actionToolIds, phase]);

  useEffect(
    () => () => {
      if (incomingClearTimerRef.current !== null) {
        window.clearTimeout(incomingClearTimerRef.current);
      }
    },
    []
  );

  const mapToolToAction = (tool: TurnToolSnapshot, index: number): FloatingActionItem => {
    const availability = getToolAvailability(tool, tools);
    const definition = TOOL_DEFINITIONS[tool.toolId];
    const onPointerDown =
      availability.usable && isAimTool(tool.toolId)
        ? (event: ReactPointerEvent<HTMLButtonElement>) => {
            if (event.button !== 0) {
              return;
            }

            onPressAimTool(tool.instanceId, event.clientX, event.clientY);
          }
        : null;

    return {
      id: tool.instanceId,
      label: definition.label,
      token: getActionUiConfig(tool.toolId).token,
      accent: getActionUiConfig(tool.toolId).accent,
      detail: availability.usable
        ? getToolButtonDetail(tool, tools)
        : availability.reason ?? getToolButtonDetail(tool, tools),
      disabled: !availability.usable,
      selected: interactive && selectedToolInstanceId === tool.instanceId,
      testId: `scene-tool-${tool.toolId}-${index}`,
      toolId: tool.toolId,
      toolInstanceId: tool.instanceId,
      ...(onPointerDown ? { onPointerDown } : {}),
      onClick: () => {
        if (!interactive) {
          return;
        }

        if (!availability.usable) {
          onSelectTool(tool.instanceId);
          onShowUnavailableToolNotice(
            getToolDisabledMessage(tool, tools) ?? `${definition.label}当前不可用。`
          );
          return;
        }

        if (isAimTool(tool.toolId) || isChoiceTool(tool.toolId)) {
          onSelectTool(tool.instanceId);
          return;
        }

        onUseInstantTool(tool.instanceId);
      }
    };
  };

  const actions: FloatingActionItem[] =
    phase === "turn-start"
      ? [
          {
            id: "roll",
            label: "投骰",
            token: getActionUiConfig("roll").token,
            accent: getActionUiConfig("roll").accent,
            detail: getActionUiConfig("roll").detail,
            disabled: false,
            selected: false,
            testId: "scene-roll-dice-button",
            onClick: onRollDice
          },
          ...tools.map(mapToolToAction)
        ]
      : [
          ...tools.map(mapToolToAction),
          {
            id: "end",
            label: "结束",
            token: getActionUiConfig("end").token,
            accent: getActionUiConfig("end").accent,
            detail: getActionUiConfig("end").detail,
            disabled: false,
            selected: false,
            testId: "scene-end-turn-button",
            onClick: onEndTurn
          }
        ];

  const selectedChoiceTool =
    interactive && selectedTool && isChoiceTool(selectedTool.toolId) ? selectedTool : null;

  return (
    <Html position={position} center>
      <div
        className={[
          "scene-action-ring",
          hidden ? "hidden" : "",
          interactive ? "" : "read-only"
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ transform: `translate(${screenOffsetX}px, ${screenOffsetY}px)` }}
      >
        <div className="scene-action-ring__arc" />
        <div className="scene-action-ring__caption">{getSelectedCaption(phase, selectedTool, tools)}</div>
        {actions.map((action, index) => (
          <button
            key={action.id}
            type="button"
            className={[
              "scene-action-button",
              action.toolInstanceId && incomingToolInstanceIds.includes(action.toolInstanceId) ? "incoming" : "",
              action.selected ? "selected" : "",
              action.disabled ? "disabled" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            data-testid={action.testId}
            data-tool-id={action.toolId}
            data-tool-instance-id={action.toolInstanceId}
            style={{ ...getRingButtonStyle(index, actions.length), "--scene-accent": action.accent } as CSSProperties}
            onPointerDown={interactive ? action.onPointerDown : undefined}
            onClick={interactive ? action.onClick : undefined}
            aria-disabled={action.disabled || !interactive}
          >
            <span className="scene-action-button__token">{action.token}</span>
            <span className="scene-action-button__label">{action.label}</span>
            <span className="scene-action-button__detail">{action.detail}</span>
          </button>
        ))}
        {selectedChoiceTool ? (
          <div className="scene-choice-panel">
            {getToolChoiceDefinitions(selectedChoiceTool.toolId).map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="scene-choice-button"
                onClick={() => onUseChoiceTool(selectedChoiceTool.instanceId, choice.id)}
              >
                <span className="scene-choice-button__label">{choice.label}</span>
                <span className="scene-choice-button__detail">{choice.description}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Html>
  );
}
