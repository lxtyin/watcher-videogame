import { Html } from "@react-three/drei";
import {
  TOOL_DEFINITIONS,
  getToolTextDescription,
  type GameSnapshot,
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
import { getToolAvailabilityFromSnapshot } from "../utils/toolRuntime";
import type { SelectedToolInstanceId } from "../state/useGameStore";

interface SceneActionRingProps {
  caption?: string | null;
  hidden?: boolean;
  interactive?: boolean;
  phase: TurnPhase;
  position: [number, number, number];
  screenOffsetX?: number;
  screenOffsetY?: number;
  selectedToolInstanceId: SelectedToolInstanceId;
  showArc?: boolean;
  snapshot: GameSnapshot | null;
  toolOwnerId: string | null;
  tools: TurnToolSnapshot[];
  onBeginPointerTool: (
    toolInstanceId: string,
    clientX: number,
    clientY: number,
    pointerType: string
  ) => void;
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

function getToolButtonDetail(
  tool: TurnToolSnapshot,
  tools: TurnToolSnapshot[],
  snapshot: GameSnapshot | null,
  toolOwnerId: string | null
): string {
  const availability = getToolAvailabilityFromSnapshot(snapshot, toolOwnerId, tool, tools);
  const toolTextDescription = getToolTextDescription(tool);
  const baseDetail = toolTextDescription.details?.[0] ?? toolTextDescription.description;

  return availability.usable ? baseDetail : availability.reason ?? baseDetail;
}

function getDefaultCaption(
  phase: TurnPhase,
  selectedTool: TurnToolSnapshot | null,
  tools: TurnToolSnapshot[],
  snapshot: GameSnapshot | null,
  toolOwnerId: string | null
): string {
  if (phase === "turn-start") {
    return tools.length ? "点击投骰开始回合，或先使用当前阶段工具" : "点击投骰开始本回合";
  }

  if (!tools.length) {
    return phase === "turn-end" ? "回合结束阶段没有可用工具，可以跳过本阶段" : "本回合没有可用工具了，结束回合吧";
  }

  if (!selectedTool) {
    return phase === "turn-end" ? "从弧环里选择一个回合末工具，或点击跳过" : "从弧环里选择一个工具";
  }

  const availability = getToolAvailabilityFromSnapshot(snapshot, toolOwnerId, selectedTool, tools);
  const label = TOOL_DEFINITIONS[selectedTool.toolId].label;

  if (!availability.usable) {
    return `${label} 当前不可用：${availability.reason ?? "条件不足"}`;
  }

  return `${label} 已准备好`;
}

export function SceneActionRing({
  caption = null,
  hidden = false,
  interactive = true,
  phase,
  position,
  screenOffsetX = 0,
  screenOffsetY = 0,
  selectedToolInstanceId,
  showArc = true,
  snapshot,
  toolOwnerId,
  tools,
  onBeginPointerTool,
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
  const actionToolIdsSignature = useMemo(() => actionToolIds.join("|"), [actionToolIds]);
  const tracksIncomingTools = phase === "turn-action" || phase === "turn-end";

  useEffect(() => {
    if (!tracksIncomingTools) {
      previousActionToolIdsRef.current = [];
      setIncomingToolInstanceIds((currentIds) => (currentIds.length ? [] : currentIds));

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

    setIncomingToolInstanceIds((currentIds) => {
      const nextIds = Array.from(new Set([...currentIds, ...nextIncomingToolIds]));

      if (
        nextIds.length === currentIds.length &&
        nextIds.every((toolInstanceId, index) => toolInstanceId === currentIds[index])
      ) {
        return currentIds;
      }

      return nextIds;
    });

    if (incomingClearTimerRef.current !== null) {
      window.clearTimeout(incomingClearTimerRef.current);
    }

    incomingClearTimerRef.current = window.setTimeout(() => {
      setIncomingToolInstanceIds((currentIds) => (currentIds.length ? [] : currentIds));
      incomingClearTimerRef.current = null;
    }, 560);
  }, [actionToolIdsSignature, tracksIncomingTools]);

  useEffect(
    () => () => {
      if (incomingClearTimerRef.current !== null) {
        window.clearTimeout(incomingClearTimerRef.current);
      }
    },
    []
  );

  const mapToolToAction = (tool: TurnToolSnapshot, index: number): FloatingActionItem => {
    const availability = getToolAvailabilityFromSnapshot(snapshot, toolOwnerId, tool, tools);
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
            event.stopPropagation();
            onBeginPointerTool(tool.instanceId, event.clientX, event.clientY, event.pointerType);
          }
        : undefined;

    return {
      accent: getActionUiConfig(tool.toolId).accent,
      detail: availability.usable
        ? getToolButtonDetail(tool, tools, snapshot, toolOwnerId)
        : availability.reason ?? getToolButtonDetail(tool, tools, snapshot, toolOwnerId),
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
            availability.reason ?? `${definition.label} 当前不可用。`
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
            detail: getActionUiConfig("roll").detail ?? "开始投骰",
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
            detail:
              phase === "turn-end"
                ? "跳过当前回合结束阶段"
                : (getActionUiConfig("end").detail ?? "结束回合"),
            disabled: false,
            id: "end",
            label: phase === "turn-end" ? "跳过" : "结束",
            onClick: onEndTurn,
            selected: false,
            testId: "scene-end-turn-button",
            token: getActionUiConfig("end").token
          }
        ];

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
        {/* <div className="scene-action-ring__caption">
          {caption ?? getDefaultCaption(phase, selectedTool, tools, snapshot, toolOwnerId)}
        </div> */}
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
                onPointerDown={(event) => {
                  event.stopPropagation();

                  if (interactive) {
                    action.onPointerDown?.(event);
                  }
                }}
                onClick={(event) => {
                  event.stopPropagation();

                  if (interactive) {
                    action.onClick();
                  }
                }}
                aria-disabled={action.disabled || !interactive}
              >
                <span className="scene-action-button__token">{action.token}</span>
                <span className="scene-action-button__label">{action.label}</span>
                <span className="scene-action-button__detail">{action.detail}</span>
              </button>
            ))
          : null}
      </div>
    </Html>
  );
}
