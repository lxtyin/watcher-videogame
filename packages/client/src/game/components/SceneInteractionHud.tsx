import { Html } from "@react-three/drei";
import {
  TOOL_DEFINITIONS,
  describeToolButtonValue,
  getToolAvailability,
  getToolDisabledMessage,
  type ToolChoiceDefinition,
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
import {
  isChoiceInteractionTool,
  isPointerDrivenInteractionTool
} from "../interaction/toolInteraction";
import type { SelectedToolInstanceId } from "../state/useGameStore";

interface SceneActionRingProps {
  caption?: string | null;
  choiceOptions?: readonly ToolChoiceDefinition[];
  hidden?: boolean;
  interactive?: boolean;
  phase: TurnPhase;
  position: [number, number, number];
  screenOffsetX?: number;
  screenOffsetY?: number;
  selectedToolInstanceId: SelectedToolInstanceId;
  showArc?: boolean;
  tools: TurnToolSnapshot[];
  onBeginPointerTool: (toolInstanceId: string, clientX: number, clientY: number) => void;
  onCommitChoice: (toolInstanceId: string, choiceId: string) => void;
  onEndTurn: () => void;
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

function getDefaultCaption(
  phase: TurnPhase,
  selectedTool: TurnToolSnapshot | null,
  tools: TurnToolSnapshot[]
): string {
  if (phase === "turn-start") {
    return tools.length ? "点击投骰开始回合，或先使用当前阶段工具" : "点击投骰开始本回合";
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
    return `${label} 当前不可用：${availability.reason ?? "条件不足"}`;
  }

  return `${label} 已准备好`;
}

export function SceneActionRing({
  caption = null,
  choiceOptions = [],
  hidden = false,
  interactive = true,
  phase,
  position,
  screenOffsetX = 0,
  screenOffsetY = 0,
  selectedToolInstanceId,
  showArc = true,
  tools,
  onBeginPointerTool,
  onCommitChoice,
  onEndTurn,
  onRollDice,
  onSelectTool,
  onShowUnavailableToolNotice,
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
    const pointerDriven = isPointerDrivenInteractionTool(tool.toolId);
    const choiceDriven = isChoiceInteractionTool(tool.toolId);

    const onPointerDown =
      availability.usable && pointerDriven
        ? (event: ReactPointerEvent<HTMLButtonElement>) => {
            if (event.button !== 0) {
              return;
            }

            event.preventDefault();
            onBeginPointerTool(tool.instanceId, event.clientX, event.clientY);
          }
        : undefined;

    return {
      accent: getActionUiConfig(tool.toolId).accent,
      detail: availability.usable
        ? getToolButtonDetail(tool, tools)
        : availability.reason ?? getToolButtonDetail(tool, tools),
      disabled: !availability.usable,
      id: tool.instanceId,
      label: definition.label,
      onClick: () => {
        if (!interactive) {
          return;
        }

        if (!availability.usable) {
          onSelectTool(tool.instanceId);
          onShowUnavailableToolNotice(
            getToolDisabledMessage(tool, tools) ?? `${definition.label} 当前不可用。`
          );
          return;
        }

        if (pointerDriven || choiceDriven) {
          onSelectTool(tool.instanceId);
          return;
        }

        onUseInstantTool(tool.instanceId);
      },
      selected: interactive && selectedToolInstanceId === tool.instanceId,
      testId: `scene-tool-${tool.toolId}-${index}`,
      token: getActionUiConfig(tool.toolId).token,
      toolId: tool.toolId,
      toolInstanceId: tool.instanceId,
      ...(onPointerDown ? { onPointerDown } : {})
    };
  };

  const actions: FloatingActionItem[] =
    phase === "turn-start"
      ? [
          {
            accent: getActionUiConfig("roll").accent,
            detail: getActionUiConfig("roll").detail,
            disabled: false,
            id: "roll",
            label: "投骰",
            onClick: onRollDice,
            selected: false,
            testId: "scene-roll-dice-button",
            token: getActionUiConfig("roll").token
          },
          ...tools.map(mapToolToAction)
        ]
      : [
          ...tools.map(mapToolToAction),
          {
            accent: getActionUiConfig("end").accent,
            detail: getActionUiConfig("end").detail,
            disabled: false,
            id: "end",
            label: "结束",
            onClick: onEndTurn,
            selected: false,
            testId: "scene-end-turn-button",
            token: getActionUiConfig("end").token
          }
        ];

  const selectedChoiceTool =
    interactive && selectedTool && isChoiceInteractionTool(selectedTool.toolId) && choiceOptions.length
      ? selectedTool
      : null;

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
        {showArc ? <div className="scene-action-ring__arc" /> : null}
        <div className="scene-action-ring__caption">
          {caption ?? getDefaultCaption(phase, selectedTool, tools)}
        </div>
        {showArc
          ? actions.map((action, index) => (
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
            ))
          : null}
        {selectedChoiceTool ? (
          <div className="scene-choice-panel">
            {choiceOptions.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="scene-choice-button"
                data-testid={`scene-choice-${selectedChoiceTool.toolId}-${choice.id}`}
                onClick={() => onCommitChoice(selectedChoiceTool.instanceId, choice.id)}
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
