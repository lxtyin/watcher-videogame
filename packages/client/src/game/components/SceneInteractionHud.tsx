import { Html } from "@react-three/drei";
import {
  TOOL_DEFINITIONS,
  TURN_START_ACTION_DEFINITIONS,
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
  type TurnStartActionSnapshot,
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
  tools: TurnToolSnapshot[];
  turnStartActions: TurnStartActionSnapshot[];
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
  onUseChoiceTool: (toolInstanceId: string, choiceId: string) => void;
  onUseInstantTool: (toolInstanceId: string) => void;
  onUseTurnStartAction: (actionId: TurnStartActionSnapshot["actionId"]) => void;
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

// Buttons are distributed along a fixed arc so the ring layout stays stable per frame.
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

// Tool subtitles expose the most relevant numeric state for the current ring button.
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

// The caption explains the currently selected interaction mode at the center of the arc.
function getSelectedCaption(
  phase: "roll" | "action",
  selectedTool: TurnToolSnapshot | null,
  tools: TurnToolSnapshot[],
  turnStartActions: TurnStartActionSnapshot[]
): string {
  if (phase === "roll") {
    return turnStartActions.length
      ? "点击掷骰开始回合，或使用角色的回合开始技能"
      : "点击头顶骰子开始本回合";
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

  if (isTileDirectionTool(selectedTool.toolId)) {
    return `按住${label}，先选目标格，再拖出方向后松手执行`;
  }

  if (isChoiceTool(selectedTool.toolId)) {
    return `点击下方选项，决定${label}的结算方式`;
  }

  return `${label}已准备好`;
}

// The floating action ring is the in-scene entry point for roll, tool choice, and end turn.
export function SceneActionRing({
  hidden = false,
  tools,
  turnStartActions,
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
  onUseChoiceTool,
  onUseInstantTool,
  onUseTurnStartAction
}: SceneActionRingProps) {
  const [incomingToolInstanceIds, setIncomingToolInstanceIds] = useState<string[]>([]);
  const previousActionToolIdsRef = useRef<string[]>([]);
  const incomingClearTimerRef = useRef<number | null>(null);
  const selectedTool =
    tools.find((tool) => tool.instanceId === selectedToolInstanceId) ?? null;
  const actionToolIds = useMemo(() => tools.map((tool) => tool.instanceId), [tools]);

  useEffect(() => {
    // Ring entry animations only run for tools that appear after the action phase is already active.
    if (phase !== "action") {
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

    setIncomingToolInstanceIds((currentIds) =>
      Array.from(new Set([...currentIds, ...nextIncomingToolIds]))
    );

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
          },
          ...turnStartActions.map((action, index) => ({
            id: action.actionId,
            label: TURN_START_ACTION_DEFINITIONS[action.actionId].label,
            token: getActionUiConfig(action.actionId).token,
            accent: getActionUiConfig(action.actionId).accent,
            detail: getActionUiConfig(action.actionId).detail,
            disabled: false,
            selected: false,
            testId: `scene-turn-start-action-${index}`,
            onPointerDown: undefined,
            onClick: () => onUseTurnStartAction(action.actionId)
          }))
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

                if (isAimTool(tool.toolId) || isChoiceTool(tool.toolId)) {
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
  const selectedChoiceTool =
    phase === "action" && selectedTool && isChoiceTool(selectedTool.toolId) ? selectedTool : null;

  return (
    <Html position={position} center>
      <div
        className={["scene-action-ring", hidden ? "hidden" : ""].filter(Boolean).join(" ")}
        style={{ transform: `translate(${screenOffsetX}px, ${screenOffsetY}px)` }}
      >
        <div className="scene-action-ring__arc" />
        <div className="scene-action-ring__caption">
          {getSelectedCaption(phase, selectedTool, tools, turnStartActions)}
        </div>
        {actions.map((action, index) => (
          <button
            key={action.id}
            type="button"
            className={
              [
                "scene-action-button",
                action.toolInstanceId && incomingToolInstanceIds.includes(action.toolInstanceId)
                  ? "incoming"
                  : "",
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
