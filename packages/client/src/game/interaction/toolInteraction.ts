import {
  TOOL_DEFINITIONS,
  cloneToolSelectionRecord,
  createChoiceSelection,
  createDirectionSelection,
  createTileSelection,
  getChoiceSelection,
  getDirectionSelection,
  getTileSelection,
  getToolChoiceDefinitions,
  getDynamicToolChoiceDefinitions,
  getToolInteractionDefinition,
  isChoiceInteractionDefinition,
  isInstantInteractionDefinition,
  isPointerDrivenInteractionDefinition,
  type Direction,
  type GameSnapshot,
  type GridPosition,
  type ToolChoiceDefinition,
  type ToolInteractionAnchor,
  type ToolInteractionDefinition,
  type ToolInteractionStageDefinition,
  type ToolId,
  type ToolSelectionRecord,
  type TurnToolSnapshot,
  type UseToolCommandPayload
} from "@watcher/shared";
import { directionFromAxis, toWorldPosition } from "../utils/boardMath";
import { buildToolActionContextFromSnapshot } from "../utils/toolRuntime";
import {
  getDragDirection,
  resolveAxisTileAimTarget,
  resolveBoardTileAimTarget
} from "./aiming";

export type ToolInteractionValue = ToolSelectionRecord[string];
export type ToolInteractionRecord = ToolSelectionRecord;

export interface ToolInteractionSession {
  committed: ToolInteractionRecord;
  draft: ToolInteractionRecord;
  pointerActive: boolean;
  stageIndex: number;
  toolId: ToolId;
  toolInstanceId: string;
}

export interface PointerInteractionContext {
  actorPosition: GridPosition;
  boardHeight: number;
  boardWidth: number;
  pointerWorld: { x: number; z: number } | null;
}

export interface ToolInteractionAdvanceResult {
  kind: "continue" | "execute";
  payload?: Omit<UseToolCommandPayload, "toolInstanceId">;
  session: ToolInteractionSession;
}

function getCurrentStage(session: ToolInteractionSession): ToolInteractionStageDefinition | null {
  return getToolInteractionDefinition(session.toolId).stages[session.stageIndex] ?? null;
}

function resolveAnchorPosition(
  anchor: ToolInteractionAnchor,
  actorPosition: GridPosition,
  committed: ToolInteractionRecord
): GridPosition | null {
  if (anchor.kind === "actor") {
    return actorPosition;
  }

  return getTileSelection(committed, anchor.slotKey);
}

function removeSlot(record: ToolInteractionRecord, slotKey: string): ToolInteractionRecord {
  const nextRecord = cloneToolSelectionRecord(record);
  delete nextRecord[slotKey];
  return nextRecord;
}

function setTileValue(
  record: ToolInteractionRecord,
  slotKey: string,
  position: GridPosition | null
): ToolInteractionRecord {
  if (!position) {
    return removeSlot(record, slotKey);
  }

  return {
    ...cloneToolSelectionRecord(record),
    [slotKey]: createTileSelection(position)
  };
}

function setDirectionValue(
  record: ToolInteractionRecord,
  slotKey: string,
  direction: Direction | null
): ToolInteractionRecord {
  if (!direction) {
    return removeSlot(record, slotKey);
  }

  return {
    ...cloneToolSelectionRecord(record),
    [slotKey]: createDirectionSelection(direction)
  };
}

function setChoiceValue(
  record: ToolInteractionRecord,
  slotKey: string,
  choiceId: string | null
): ToolInteractionRecord {
  if (!choiceId) {
    return removeSlot(record, slotKey);
  }

  return {
    ...cloneToolSelectionRecord(record),
    [slotKey]: createChoiceSelection(choiceId)
  };
}

function clearStageDraft(
  session: ToolInteractionSession,
  stage: ToolInteractionStageDefinition
): ToolInteractionSession {
  let nextDraft = session.draft;

  if (stage.kind === "drag-direction-release") {
    nextDraft = removeSlot(nextDraft, stage.directionKey);
  }

  if (stage.kind === "drag-tile-release") {
    nextDraft = removeSlot(nextDraft, stage.tileKey);
  }

  if (stage.kind === "drag-axis-tile-release") {
    nextDraft = removeSlot(removeSlot(nextDraft, stage.directionKey), stage.tileKey);
  }

  if (stage.kind === "modal-choice") {
    nextDraft = removeSlot(nextDraft, stage.choiceKey);
  }

  return {
    ...session,
    draft: nextDraft
  };
}

function mergeInteractionRecords(
  committed: ToolInteractionRecord,
  draft: ToolInteractionRecord
): ToolInteractionRecord {
  return {
    ...cloneToolSelectionRecord(committed),
    ...cloneToolSelectionRecord(draft)
  };
}

function getStagePayload(
  session: ToolInteractionSession,
  stage: ToolInteractionStageDefinition
): ToolInteractionRecord | null {
  if (stage.kind === "drag-direction-release") {
    const direction = getDirectionSelection(session.draft, stage.directionKey);
    return direction ? { [stage.directionKey]: createDirectionSelection(direction) } : null;
  }

  if (stage.kind === "drag-tile-release") {
    const position = getTileSelection(session.draft, stage.tileKey);
    return position ? { [stage.tileKey]: createTileSelection(position) } : null;
  }

  if (stage.kind === "drag-axis-tile-release") {
    const direction = getDirectionSelection(session.draft, stage.directionKey);
    const position = getTileSelection(session.draft, stage.tileKey);

    if (!direction || !position) {
      return null;
    }

    return {
      [stage.directionKey]: createDirectionSelection(direction),
      [stage.tileKey]: createTileSelection(position)
    };
  }

  const choiceId = getChoiceSelection(session.draft, stage.choiceKey);
  return choiceId ? { [stage.choiceKey]: createChoiceSelection(choiceId) } : null;
}

function buildPayloadFromRecord(
  record: ToolInteractionRecord
): Omit<UseToolCommandPayload, "toolInstanceId"> {
  return {
    input: cloneToolSelectionRecord(record)
  };
}

export function createToolInteractionSession(tool: TurnToolSnapshot): ToolInteractionSession {
  return {
    committed: {},
    draft: {},
    pointerActive: false,
    stageIndex: 0,
    toolId: tool.toolId,
    toolInstanceId: tool.instanceId
  };
}

export function isInstantInteractionTool(toolId: ToolId): boolean {
  return isInstantInteractionDefinition(getToolInteractionDefinition(toolId));
}

export function isChoiceInteractionTool(toolId: ToolId): boolean {
  return isChoiceInteractionDefinition(getToolInteractionDefinition(toolId));
}

export function isPointerDrivenInteractionTool(toolId: ToolId): boolean {
  return isPointerDrivenInteractionDefinition(getToolInteractionDefinition(toolId));
}

export function getToolInteractionChoiceOptions(
  session: ToolInteractionSession | null,
  snapshot: GameSnapshot | null,
  sessionId: string | null
): readonly ToolChoiceDefinition[] {
  if (!session || getCurrentStage(session)?.kind !== "modal-choice") {
    return [];
  }

  const actor = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const activeTool = actor?.tools.find((tool) => tool.instanceId === session.toolInstanceId) ?? null;
  const context = buildToolActionContextFromSnapshot(snapshot, sessionId, activeTool);

  return context ? getDynamicToolChoiceDefinitions(session.toolId, context) : getToolChoiceDefinitions(session.toolId);
}

export function getToolInteractionCaption(
  tool: TurnToolSnapshot,
  session: ToolInteractionSession | null
): string {
  if (!session) {
    return `${TOOL_DEFINITIONS[tool.toolId].label} 宸插噯澶囧ソ`;
  }

  const stage = getCurrentStage(session);
  const stageCount = getToolInteractionDefinition(session.toolId).stages.length;

  if (!stage) {
    return `${TOOL_DEFINITIONS[tool.toolId].label} 宸插噯澶囧畬鎴恅`;
  }

  const stepPrefix = stageCount > 1 ? `绗?${session.stageIndex + 1}/${stageCount} 姝ワ細` : "绗?1/1 姝ワ細";

  if (stage.kind === "drag-direction-release") {
    return `${stepPrefix}鍦ㄥ満鏅腑鎷栨嫿閫夋嫨鏂瑰悜锛屾澗鎵嬬‘璁`;
  }

  if (stage.kind === "drag-tile-release") {
    return `${stepPrefix}鍦ㄥ満鏅腑鎷栨嫿閫夋嫨鍦板潡锛屾澗鎵嬬‘璁`;
  }

  if (stage.kind === "drag-axis-tile-release") {
    return `${stepPrefix}鎷栨嫿鍏堝畾鏂瑰悜锛屽苟娌胯鏂瑰悜閫夋嫨鍦板潡锛屾澗鎵嬬‘璁`;
  }

  return `${stepPrefix}鍦ㄥ脊鍑虹殑浜や簰绐楀彛涓€夋嫨 ${TOOL_DEFINITIONS[tool.toolId].label} 鐨勫鐞嗘柟寮廯`;
}

export function beginToolInteractionPointer(session: ToolInteractionSession): ToolInteractionSession {
  return {
    ...clearToolInteractionDraft(session),
    pointerActive: true
  };
}

export function clearToolInteractionDraft(session: ToolInteractionSession): ToolInteractionSession {
  const stage = getCurrentStage(session);

  if (!stage) {
    return {
      ...session,
      pointerActive: false
    };
  }

  return clearStageDraft(
    {
      ...session,
      pointerActive: false
    },
    stage
  );
}

export function buildToolInteractionPreviewPayload(
  session: ToolInteractionSession
): Omit<UseToolCommandPayload, "toolInstanceId"> {
  return buildPayloadFromRecord(mergeInteractionRecords(session.committed, session.draft));
}

export function hasToolInteractionPreviewPayload(session: ToolInteractionSession): boolean {
  return Object.keys(buildToolInteractionPreviewPayload(session).input).length > 0;
}

export function updateToolInteractionFromPointer(
  session: ToolInteractionSession,
  context: PointerInteractionContext
): ToolInteractionSession {
  const stage = getCurrentStage(session);

  if (!stage) {
    return session;
  }

  if (!context.pointerWorld) {
    return clearStageDraft(session, stage);
  }

  if (stage.kind === "drag-direction-release") {
    const anchorPosition = resolveAnchorPosition(stage.anchor, context.actorPosition, session.committed);

    if (!anchorPosition) {
      return clearStageDraft(session, stage);
    }

    const [anchorWorldX, , anchorWorldZ] = toWorldPosition(
      anchorPosition,
      context.boardWidth,
      context.boardHeight
    );

    return {
      ...session,
      draft: setDirectionValue(
        session.draft,
        stage.directionKey,
        getDragDirection(context.pointerWorld.x - anchorWorldX, context.pointerWorld.z - anchorWorldZ)
      )
    };
  }

  if (stage.kind === "drag-tile-release") {
    return {
      ...session,
      draft: setTileValue(
        session.draft,
        stage.tileKey,
        resolveBoardTileAimTarget(
          context.pointerWorld.x,
          context.pointerWorld.z,
          context.boardWidth,
          context.boardHeight
        )
      )
    };
  }

  if (stage.kind === "drag-axis-tile-release") {
    const position = resolveAxisTileAimTarget(
      context.pointerWorld.x,
      context.pointerWorld.z,
      context.actorPosition,
      context.boardWidth,
      context.boardHeight
    );
    const direction = position ? directionFromAxis(context.actorPosition, position) : null;

    return {
      ...session,
      draft: setDirectionValue(setTileValue(session.draft, stage.tileKey, position), stage.directionKey, direction)
    };
  }

  return session;
}

export function finalizeToolInteractionStage(
  session: ToolInteractionSession
): ToolInteractionAdvanceResult {
  const stage = getCurrentStage(session);

  if (!stage) {
    return {
      kind: "continue",
      session
    };
  }

  const stagePayload = getStagePayload(session, stage);

  if (!stagePayload) {
    return {
      kind: "continue",
      session: clearToolInteractionDraft(session)
    };
  }

  const nextCommitted = mergeInteractionRecords(session.committed, stagePayload);
  const nextSession: ToolInteractionSession = {
    ...session,
    committed: nextCommitted,
    draft: {},
    pointerActive: false
  };
  const stages = getToolInteractionDefinition(session.toolId).stages;

  if (session.stageIndex >= stages.length - 1) {
    return {
      kind: "execute",
      payload: buildPayloadFromRecord(nextCommitted),
      session: nextSession
    };
  }

  return {
    kind: "continue",
    session: {
      ...nextSession,
      stageIndex: session.stageIndex + 1
    }
  };
}

export function applyToolInteractionChoice(
  session: ToolInteractionSession,
  choiceId: string
): ToolInteractionAdvanceResult {
  const stage = getCurrentStage(session);

  if (!stage || stage.kind !== "modal-choice") {
    return {
      kind: "continue",
      session
    };
  }

  return finalizeToolInteractionStage({
    ...session,
    draft: setChoiceValue(session.draft, stage.choiceKey, choiceId)
  });
}

export function getToolInteractionSelectedChoiceId(
  session: ToolInteractionSession | null
): string | null {
  const stage = session ? getCurrentStage(session) : null;

  if (!session || !stage || stage.kind !== "modal-choice") {
    return null;
  }

  return getChoiceSelection(mergeInteractionRecords(session.committed, session.draft), stage.choiceKey);
}

export function setToolInteractionChoiceDraft(
  session: ToolInteractionSession,
  choiceId: string | null
): ToolInteractionSession {
  const stage = getCurrentStage(session);

  if (!stage || stage.kind !== "modal-choice") {
    return session;
  }

  return {
    ...session,
    draft: setChoiceValue(session.draft, stage.choiceKey, choiceId)
  };
}

export function getToolInteractionDirectionState(
  session: ToolInteractionSession,
  actorPosition: GridPosition
): { activeDirection: Direction | null; anchorPosition: GridPosition | null } | null {
  const stage = getCurrentStage(session);
  const mergedRecord = mergeInteractionRecords(session.committed, session.draft);

  if (!stage) {
    return null;
  }

  if (stage.kind === "drag-direction-release") {
    return {
      activeDirection: getDirectionSelection(mergedRecord, stage.directionKey),
      anchorPosition: resolveAnchorPosition(stage.anchor, actorPosition, session.committed)
    };
  }

  if (stage.kind === "drag-axis-tile-release") {
    return {
      activeDirection: getDirectionSelection(mergedRecord, stage.directionKey),
      anchorPosition: actorPosition
    };
  }

  return null;
}

export function getToolInteractionTargetPosition(
  session: ToolInteractionSession | null
): GridPosition | null {
  if (!session) {
    return null;
  }

  return getTileSelection(mergeInteractionRecords(session.committed, session.draft), "targetPosition");
}

export function isPointerStageActive(session: ToolInteractionSession | null): boolean {
  const stage = session ? getCurrentStage(session) : null;

  return Boolean(
    stage &&
      (stage.kind === "drag-direction-release" ||
        stage.kind === "drag-tile-release" ||
        stage.kind === "drag-axis-tile-release")
  );
}

export function isChoiceStageActive(session: ToolInteractionSession | null): boolean {
  return Boolean(session && getCurrentStage(session)?.kind === "modal-choice");
}

export function shouldHideToolInteractionArc(session: ToolInteractionSession | null): boolean {
  if (!session || session.pointerActive) {
    return false;
  }

  return getToolInteractionDefinition(session.toolId).stages.length > 1 && session.stageIndex > 0;
}
