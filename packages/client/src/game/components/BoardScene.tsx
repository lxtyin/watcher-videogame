import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, Plane, Raycaster, Vector2, Vector3, type Camera, type PerspectiveCamera } from "three";
import {
  findToolInstance,
  getSummonDefinition,
  getToolDefinition,
  getToolTextDescription,
  type Direction,
  type GridPosition,
  type PlayerSnapshot,
  type PresentationMotionStyle,
  type SummonSnapshot,
  type TileDefinition,
  type TurnToolSnapshot
} from "@watcher/shared";
import { CurrentTurnMarkerAsset } from "../assets/player/CurrentTurnMarkerAsset";
import { DiceRollOverlay } from "../assets/dice/DiceRollOverlay";
import { PlayerHaloAsset } from "../assets/player/PlayerHaloAsset";
import { PlayerStatusVisuals } from "../assets/player/PlayerStatusVisuals";
import { EffectVisual } from "../assets/presentation/EffectVisual";
import { LinkReactionVisual } from "../assets/presentation/LinkReactionVisual";
import { NumberPopupReactionVisual } from "../assets/presentation/NumberPopupReactionVisual";
import { ProjectileVisual } from "../assets/presentation/ProjectileVisual";
import { toWorldPositionFromGrid } from "../assets/shared/gridPlacement";
import { SummonVisual } from "../assets/summons/SummonVisual";
import { PreviewRingAsset } from "../assets/tools/shared/PreviewRingAsset";
import { ToolEffectPreview } from "../assets/tools/shared/ToolEffectPreview";
import { evaluatePlaybackEngine } from "../animation/playbackEngine";
import { projectClientToGround } from "../interaction/aiming";
import { resolveScenePreviewState } from "../interaction/previewState";
import {
  beginToolInteractionPointer,
  buildToolInteractionPreviewPayload,
  clearToolInteractionDraft,
  createToolInteractionSession,
  finalizeToolInteractionStage,
  getToolInteractionCaption,
  getToolInteractionChoiceOptions,
  getToolInteractionDirectionState,
  getToolInteractionSelectedChoiceId,
  getToolInteractionTargetPosition,
  hasToolInteractionPreviewPayload,
  isChoiceStageActive,
  isInstantInteractionTool,
  isPointerStageActive,
  setToolInteractionChoiceDraft,
  shouldHideToolInteractionArc,
  type ToolInteractionSession,
  updateToolInteractionFromPointer
} from "../interaction/toolInteraction";
import {
  describePlayerInspection,
  describeSummonInspection,
  describeTileInspection,
  type SceneInspectionCardData
} from "../content/inspectables";
import { useSceneOverlayStore } from "../state/useSceneOverlayStore";
import { useGameStore } from "../state/useGameStore";
import { SceneActionRing } from "./SceneInteractionHud";
import { SceneDirectionArrows } from "./SceneDirectionArrows";
import { PetPiece } from "../assets/player/PetPiece";
import { BoardStaticTileLayer, BoardTileSelectionLayer } from "./BoardStaticTileLayer";
import {
  buildActionPreview,
  clampGridPositionToBoard,
  toGridPositionFromWorld,
  toWorldPosition
} from "../utils/boardMath";
import { estimateBoardShadowBounds } from "../utils/shadowCamera";
import { getToolAvailabilityFromSnapshot } from "../utils/toolRuntime";
import type { SceneChoiceModalState } from "./SceneChoiceModal";

interface SceneHudOffset {
  x: number;
  y: number;
}

interface EntityStackLayout {
  count: number;
  index: number;
}

type StackableBoardEntity =
  | {
      entityKey: string;
      kind: "player";
      player: PlayerSnapshot;
      position: GridPosition;
    }
  | {
      entityKey: string;
      kind: "summon";
      position: GridPosition;
      summon: SummonSnapshot;
    };

type CameraControlMode = "follow" | "orbit";
type FollowCameraState = "follow" | "manual-pan" | "recentering";

interface CameraPanSession {
  lastClientX: number;
  lastClientY: number;
  originClientX: number;
  originClientY: number;
  pointerId: number;
  started: boolean;
}

interface CameraPinchSession {
  lastDistancePx: number;
}

const INSPECTION_HOLD_DELAY_MS = 320;
const PLAYER_STACK_STEP_Y = 0.88;
const PLAYER_BASE_Y = -0.28;
const STACK_REPOSITION_MS = 260;
const STACK_ENTRY_LIFT_EPSILON = 0.12;
const FOLLOW_CAMERA_DEFAULT_DISTANCE = 12;
const FOLLOW_CAMERA_MIN_DISTANCE = 9.5;
const FOLLOW_CAMERA_MAX_DISTANCE = 22;
const FOLLOW_CAMERA_WINDOW_NDC_X = 0.24;
const FOLLOW_CAMERA_WINDOW_NDC_Y = 0.15;
const TOOL_POINTER_CAMERA_WINDOW_NDC_X = 0.6;
const TOOL_POINTER_CAMERA_WINDOW_NDC_Y = 0.5;
const FOLLOW_CAMERA_DAMPING = 6.8;
const FOLLOW_CAMERA_RECENTER_DAMPING = 13;
const FOLLOW_CAMERA_ZOOM_DAMPING = 10;
const FOLLOW_CAMERA_PAN_THRESHOLD_PX = 8;
const FOLLOW_CAMERA_PINCH_ZOOM_UNITS_PER_PIXEL = 0.025;
const FOLLOW_CAMERA_WHEEL_ZOOM_UNITS_PER_PIXEL = 0.012;
const TOOL_POINTER_FOCUS_SWITCH_MARGIN = 0.18;
const TOOL_POINTER_CANCEL_ZONE_HEIGHT_PX = 30;
const FOLLOW_CAMERA_OFFSET_DIRECTION = new Vector3(11, 20.6, 10).normalize();
const DIRECTION_ROTATION_Y: Record<Direction, number> = {
  up: 0,
  right: -Math.PI / 2,
  down: Math.PI,
  left: Math.PI / 2
};

function toPositionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

function getPlayerEntityKey(playerId: string): string {
  return `player:${playerId}`;
}

function getSummonEntityKey(summonInstanceId: string): string {
  return `summon:${summonInstanceId}`;
}

function isCreatureSummonSnapshot(summon: SummonSnapshot): boolean {
  return getSummonDefinition(summon.summonId).kind === "creature";
}

function positionsEqual(left: GridPosition | undefined, right: GridPosition): boolean {
  return Boolean(left && left.x === right.x && left.y === right.y);
}

function areNumberMapsEqual(left: Record<string, number>, right: Record<string, number>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

function areTileDefinitionsEqual(left: TileDefinition, right: TileDefinition): boolean {
  return (
    left.key === right.key &&
    left.x === right.x &&
    left.y === right.y &&
    left.type === right.type &&
    left.durability === right.durability &&
    left.direction === right.direction
  );
}

function useStableTileDefinitions(tiles: TileDefinition[]): TileDefinition[] {
  const stableTilesRef = useRef(tiles);

  if (
    stableTilesRef.current.length !== tiles.length ||
    stableTilesRef.current.some((tile, index) => !areTileDefinitionsEqual(tile, tiles[index]!))
  ) {
    stableTilesRef.current = tiles;
  }

  return stableTilesRef.current;
}

function mixSceneColor(base: string, target: string, ratio: number): string {
  return new Color(base).lerp(new Color(target), ratio).getStyle();
}

function getAnimatedStackIndex(
  fromIndex: number,
  toIndex: number,
  elapsedMs: number
): number {
  if (elapsedMs <= 0 || fromIndex === toIndex) {
    if (fromIndex === toIndex) {
      return toIndex;
    }

    const direction = Math.sign(toIndex - fromIndex);

    return fromIndex + direction * Math.min(Math.abs(toIndex - fromIndex), STACK_ENTRY_LIFT_EPSILON);
  }

  const progress = Math.min(1, elapsedMs / STACK_REPOSITION_MS);

  return fromIndex + (toIndex - fromIndex) * progress;
}

function getGridEntityPresentationPose(
  motionStyle: PresentationMotionStyle | null,
  progress: number,
  baseRotationY: number,
  facingDirection: Direction
): { rotation: [number, number, number]; yOffset: number } {
  if (motionStyle === "spin_drop") {
    return {
      rotation: [progress * Math.PI * 1.4, baseRotationY + progress * Math.PI * 4, 0],
      yOffset: -progress * 0.82
    };
  }

  if (motionStyle === "fall_side") {
    const tilt = progress * Math.PI * 0.44;
    const sideSign = facingDirection === "left" || facingDirection === "up" ? -1 : 1;

    return facingDirection === "left" || facingDirection === "right"
      ? {
          rotation: [0, baseRotationY, tilt * sideSign],
          yOffset: -progress * 0.22
        }
      : {
          rotation: [tilt * sideSign, baseRotationY, 0],
          yOffset: -progress * 0.22
        };
  }

  return {
    rotation: [0, motionStyle === "finish" ? baseRotationY + progress * Math.PI * 6 : baseRotationY, 0],
    yOffset: 0
  };
}

// Facing falls back to the dominant net movement axis when a player changes cells.
function getFacingFromDelta(
  previousPosition: GridPosition | undefined,
  nextPosition: GridPosition
): Direction | null {
  if (!previousPosition) {
    return null;
  }

  const deltaX = nextPosition.x - previousPosition.x;
  const deltaY = nextPosition.y - previousPosition.y;

  if (!deltaX && !deltaY) {
    return null;
  }

  if (Math.abs(deltaX) >= Math.abs(deltaY) && deltaX !== 0) {
    return deltaX > 0 ? "right" : "left";
  }

  return deltaY > 0 ? "down" : "up";
}

function getActionRingOffset(_playerX: number, _playerY: number, _boardWidth: number, _boardHeight: number): SceneHudOffset {
  return { x: 0, y: 0 };
}

function clearInspectionTimer(timerRef: { current: number | null }): void {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getDampedAlpha(damping: number, deltaSeconds: number): number {
  return 1 - Math.exp(-damping * Math.min(deltaSeconds, 0.1));
}

function getPointerDistancePx(
  first: { clientX: number; clientY: number },
  second: { clientX: number; clientY: number }
): number {
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function isPerspectiveCamera(camera: Camera): camera is PerspectiveCamera {
  return (camera as PerspectiveCamera & { isPerspectiveCamera?: boolean }).isPerspectiveCamera === true;
}

function isToolPointerCancelZoneHit(clientY: number, viewportRect: DOMRect): boolean {
  return clientY >= viewportRect.bottom - TOOL_POINTER_CANCEL_ZONE_HEIGHT_PX;
}

interface BoardSceneProps {
  cameraControlMode: CameraControlMode;
  setChoiceModal: (modal: SceneChoiceModalState | null) => void;
  terrainThumbnailUrls: Partial<Record<string, string>>;
}

// The scene mirrors authoritative state while handling only local aiming and previews.
export function BoardScene({ cameraControlMode, setChoiceModal, terrainThumbnailUrls }: BoardSceneProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const snapshot = useGameStore((state) => state.snapshot);
  const sessionId = useGameStore((state) => state.sessionId);
  const selectedToolInstanceId = useGameStore((state) => state.selectedToolInstanceId);
  const setSelectedToolInstanceId = useGameStore((state) => state.setSelectedToolInstanceId);
  const setOverlayInspectionCard = useSceneOverlayStore((state) => state.setInspectionCard);
  const setOverlayToolCancelState = useSceneOverlayStore((state) => state.setToolCancelState);
  const showToolNotice = useGameStore((state) => state.showToolNotice);
  const rollDice = useGameStore((state) => state.rollDice);
  const endTurn = useGameStore((state) => state.endTurn);
  const useToolPayload = useGameStore((state) => state.useToolPayload);
  const simulationTimeMs = useGameStore((state) => state.simulationTimeMs);
  const activeActionPresentation = useGameStore((state) => state.activeActionPresentation);
  const diceRollAnimation = useGameStore((state) => state.diceRollAnimation);
  const activeActionPresentationStartedAtMs = useGameStore(
    (state) => state.activeActionPresentationStartedAtMs
  );
  const actionPresentationQueue = useGameStore((state) => state.actionPresentationQueue);
  const [interactionSession, setInteractionSession] = useState<ToolInteractionSession | null>(null);
  const [inspectionCard, setInspectionCard] = useState<SceneInspectionCardData | null>(null);
  const [activeToolPointerType, setActiveToolPointerType] = useState<string | null>(null);
  const [isToolPointerInsideCancelZone, setIsToolPointerInsideCancelZone] = useState(false);
  const [cellEntrySerialByEntity, setCellEntrySerialByEntity] = useState<Record<string, number>>({});
  const interactionSessionRef = useRef<ToolInteractionSession | null>(null);
  const inspectionTimerRef = useRef<number | null>(null);
  const activeToolPointerTypeRef = useRef<string | null>(null);
  const toolPointerFocusGridRef = useRef<GridPosition | null>(null);
  const toolPointerFocusWorldRef = useRef<{ x: number; z: number } | null>(null);
  const previousPositionsRef = useRef<Record<string, GridPosition>>({});
  const previousSummonPositionsRef = useRef<Record<string, GridPosition>>({});
  const facingByIdRef = useRef<Record<string, Direction>>({});
  const summonFacingByIdRef = useRef<Record<string, Direction>>({});
  const nextCellEntrySerialRef = useRef(1);
  const stackAnimationByIdRef = useRef<
    Record<string, { fromIndex: number; startedAtMs: number; toIndex: number }>
  >({});
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const dragRaycaster = useMemo(() => new Raycaster(), []);
  const dragPointer = useMemo(() => new Vector2(), []);
  const dragIntersection = useMemo(() => new Vector3(), []);
  const cameraTargetRef = useRef(new Vector3());
  const cameraDesiredTargetRef = useRef(new Vector3());
  const cameraFocusTargetRef = useRef(new Vector3());
  const cameraPositionRef = useRef(new Vector3());
  const cameraPanRightRef = useRef(new Vector3());
  const cameraPanUpRef = useRef(new Vector3());
  const cameraScreenTargetProjectionRef = useRef(new Vector3());
  const cameraScreenFocusProjectionRef = useRef(new Vector3());
  const cameraInitializedRef = useRef(false);
  const cameraDistanceRef = useRef(FOLLOW_CAMERA_DEFAULT_DISTANCE);
  const cameraDesiredDistanceRef = useRef(FOLLOW_CAMERA_DEFAULT_DISTANCE);
  const followCameraStateRef = useRef<FollowCameraState>("follow");
  const cameraPanSessionRef = useRef<CameraPanSession | null>(null);
  const cameraTouchPointersRef = useRef(new Map<number, { clientX: number; clientY: number }>());
  const cameraPinchSessionRef = useRef<CameraPinchSession | null>(null);
  const queueTerrainInspectionFromGroundRef = useRef<
    (ground: { x: number; z: number } | null) => void
  >(() => {});
  const suppressCameraPanForToolRef = useRef(false);

  const myPlayer = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const isPresentationBusy = Boolean(diceRollAnimation || activeActionPresentation || actionPresentationQueue.length);
  const isMyTurn = Boolean(snapshot && sessionId && snapshot.turnInfo.currentPlayerId === sessionId);
  const canInteract = isMyTurn && !isPresentationBusy;
  const selectedTool =
    myPlayer && selectedToolInstanceId ? findToolInstance(myPlayer.tools, selectedToolInstanceId) ?? null : null;
  const selectedInteractiveTool =
    selectedTool &&
    !isInstantInteractionTool(selectedTool.toolId) &&
    canInteract &&
    getToolAvailabilityFromSnapshot(snapshot, sessionId, selectedTool, myPlayer?.tools ?? []).usable
      ? selectedTool
      : null;
  const directionState =
    interactionSession && myPlayer
      ? getToolInteractionDirectionState(interactionSession, myPlayer.position)
      : null;
  const isPointerInteractionActive = Boolean(interactionSession?.pointerActive);
  const showToolPointerCancelZone = Boolean(
    interactionSession?.pointerActive && activeToolPointerType === "touch"
  );
  const canShowDirectionArrows = Boolean(
    myPlayer &&
      canInteract &&
      selectedInteractiveTool &&
      directionState
  );

  useEffect(() => {
    setOverlayInspectionCard(inspectionCard);
  }, [inspectionCard, setOverlayInspectionCard]);

  useEffect(() => {
    setOverlayToolCancelState({
      active: isToolPointerInsideCancelZone,
      visible: showToolPointerCancelZone
    });
  }, [
    isToolPointerInsideCancelZone,
    setOverlayToolCancelState,
    showToolPointerCancelZone
  ]);

  useEffect(() => {
    return () => {
      setOverlayInspectionCard(null);
      setOverlayToolCancelState({
        active: false,
        visible: false
      });
      setChoiceModal(null);
    };
  }, [setChoiceModal, setOverlayInspectionCard, setOverlayToolCancelState]);

  useEffect(() => {
    if (
      !snapshot ||
      !sessionId ||
      !isMyTurn ||
      !canInteract ||
      !selectedInteractiveTool ||
      !interactionSession ||
      !isChoiceStageActive(interactionSession)
    ) {
      setChoiceModal(null);
      return;
    }

    const choiceOptions = getToolInteractionChoiceOptions(interactionSession, snapshot, sessionId);
    const selectedChoiceId = getToolInteractionSelectedChoiceId(interactionSession);
    const toolTextDescription = getToolTextDescription(selectedInteractiveTool);
    const availability = getToolAvailabilityFromSnapshot(
      snapshot,
      sessionId,
      selectedInteractiveTool,
      myPlayer?.tools ?? []
    );

    setChoiceModal({
      accent: getToolDefinition(selectedInteractiveTool.toolId).color,
      confirmDisabled: !selectedChoiceId,
      description: toolTextDescription.description,
      emptyMessage: choiceOptions.length ? null : availability.reason,
      options: choiceOptions,
      selectedChoiceId,
      title: toolTextDescription.title,
      onCancel: () => {
        interactionSessionRef.current = null;
        setInteractionSession(null);
        setSelectedToolInstanceId(null);
      },
      onConfirm: () => {
        const currentSession = interactionSessionRef.current;

        if (!currentSession || !isChoiceStageActive(currentSession)) {
          return;
        }

        const result = finalizeToolInteractionStage(currentSession);

        if (result.kind === "execute" && result.payload) {
          const didSend = useToolPayload(result.payload, currentSession.toolInstanceId);

          if (didSend) {
            interactionSessionRef.current = null;
            setInteractionSession(null);
            return;
          }
        }

        interactionSessionRef.current = result.session;
        setInteractionSession(result.session);
      },
      onSelectChoice: (choiceId) => {
        const currentSession = interactionSessionRef.current;

        if (!currentSession || !isChoiceStageActive(currentSession)) {
          return;
        }

        const nextSession = setToolInteractionChoiceDraft(currentSession, choiceId);
        interactionSessionRef.current = nextSession;
        setInteractionSession(nextSession);
      }
    });
  }, [
    canInteract,
    interactionSession,
    isMyTurn,
    myPlayer?.tools,
    selectedInteractiveTool,
    sessionId,
    setChoiceModal,
    setSelectedToolInstanceId,
    snapshot,
    useToolPayload
  ]);

  const playbackState = useMemo(
    () =>
      evaluatePlaybackEngine({
        activeActionPresentation,
        activeActionPresentationStartedAtMs,
        actionPresentationQueue,
        simulationTimeMs,
        snapshot
      }),
    [
      actionPresentationQueue,
      activeActionPresentation,
      activeActionPresentationStartedAtMs,
      simulationTimeMs,
      snapshot
    ]
  );
  const displayedPlayerPositions = playbackState.displayedPlayerPositions;
  const displayedTiles = playbackState.displayedTiles;
  const stableDisplayedTiles = useStableTileDefinitions(displayedTiles);
  const displayedPlayers = playbackState.displayedPlayers;
  const displayedSummons = playbackState.displayedSummons;
  const displayedCreatureSummons = useMemo(
    () => displayedSummons.filter(isCreatureSummonSnapshot),
    [displayedSummons]
  );
  const displayedObjectSummons = useMemo(
    () => displayedSummons.filter((summon) => !isCreatureSummonSnapshot(summon)),
    [displayedSummons]
  );
  const displayedSummonPositions = useMemo(
    () =>
      Object.fromEntries(
        displayedSummons.map((summon) => [summon.instanceId, summon.position] as const)
      ),
    [displayedSummons]
  );
  const snapshotPlayersById = useMemo(
    () =>
      new Map(
        (snapshot?.players ?? []).map((player) => [player.id, player] as const)
      ),
    [snapshot]
  );
  const showActionRingArc = !isPresentationBusy && !shouldHideToolInteractionArc(interactionSession);
  const stackableBoardEntities = useMemo<StackableBoardEntity[]>(() => {
    if (!snapshot) {
      return [];
    }

    const playerEntities = displayedPlayers
      .filter((player) => player.boardVisible)
      .map((player) => ({
        entityKey: getPlayerEntityKey(player.id),
        kind: "player" as const,
        player,
        position: displayedPlayerPositions[player.id] ?? player.position
      }));
    const summonEntities = displayedCreatureSummons.map((summon) => ({
      entityKey: getSummonEntityKey(summon.instanceId),
      kind: "summon" as const,
      position: summon.position,
      summon
    }));

    return [...playerEntities, ...summonEntities];
  }, [displayedCreatureSummons, displayedPlayerPositions, displayedPlayers, snapshot]);
  const entityStackLayout = useMemo(() => {
    const layout = new Map<string, EntityStackLayout>();

    if (!snapshot) {
      return layout;
    }

    const groupedEntities = new Map<string, StackableBoardEntity[]>();

    for (const entity of stackableBoardEntities) {
      const key = toPositionKey({
        x: Math.round(entity.position.x),
        y: Math.round(entity.position.y)
      });
      const currentGroup = groupedEntities.get(key) ?? [];
      currentGroup.push(entity);
      groupedEntities.set(key, currentGroup);
    }

    for (const [, entities] of groupedEntities) {
      const orderedEntities = [...entities].sort((left, right) => {
        const leftSerial = cellEntrySerialByEntity[left.entityKey] ?? 0;
        const rightSerial = cellEntrySerialByEntity[right.entityKey] ?? 0;

        if (leftSerial !== rightSerial) {
          return rightSerial - leftSerial;
        }

        return left.entityKey.localeCompare(right.entityKey);
      });

      orderedEntities.forEach((entity, index) => {
        layout.set(entity.entityKey, {
          count: orderedEntities.length,
          index
        });
      });
    }

    return layout;
  }, [cellEntrySerialByEntity, snapshot, stackableBoardEntities]);
  const renderedStackEntities = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    return [...stackableBoardEntities].sort((left, right) => {
      const leftLayout = entityStackLayout.get(left.entityKey) ?? { count: 1, index: 0 };
      const rightLayout = entityStackLayout.get(right.entityKey) ?? { count: 1, index: 0 };

      if (leftLayout.index !== rightLayout.index) {
        return leftLayout.index - rightLayout.index;
      }

      const leftSerial = cellEntrySerialByEntity[left.entityKey] ?? 0;
      const rightSerial = cellEntrySerialByEntity[right.entityKey] ?? 0;

      if (leftSerial !== rightSerial) {
        return rightSerial - leftSerial;
      }

      return left.entityKey.localeCompare(right.entityKey);
    });
  }, [cellEntrySerialByEntity, entityStackLayout, snapshot, stackableBoardEntities]);
  const playerLiftById = useMemo(() => {
    const nextLifts: Record<string, number> = {};

    for (const reaction of playbackState.reactions) {
      if (reaction.kind !== "player_lift") {
        continue;
      }

      const lift = Math.sin(reaction.progress * Math.PI) * reaction.height;
      nextLifts[reaction.playerId] = (nextLifts[reaction.playerId] ?? 0) + lift;
    }

    return nextLifts;
  }, [playbackState.reactions]);
  const facingById = useMemo(() => {
    const nextFacingById = { ...facingByIdRef.current };

    if (!snapshot) {
      return nextFacingById;
    }

    for (const player of snapshot.players) {
      const nextFacing =
        getFacingFromDelta(previousPositionsRef.current[player.id], player.position) ??
        nextFacingById[player.id] ??
        "down";

      nextFacingById[player.id] = nextFacing;
    }

    return nextFacingById;
  }, [snapshot]);
  const summonFacingById = useMemo(() => {
    const nextFacingById = { ...summonFacingByIdRef.current };

    if (!snapshot) {
      return nextFacingById;
    }

    for (const summon of snapshot.summons) {
      const nextFacing =
        getFacingFromDelta(previousSummonPositionsRef.current[summon.instanceId], summon.position) ??
        nextFacingById[summon.instanceId] ??
        "down";

      nextFacingById[summon.instanceId] = nextFacing;
    }

    return nextFacingById;
  }, [snapshot]);
  const currentPlayer =
    snapshot
      ? displayedPlayers.find((player) => player.id === snapshot.turnInfo.currentPlayerId) ??
        snapshot.players.find((player) => player.id === snapshot.turnInfo.currentPlayerId) ??
        null
      : null;
  const currentPlayerDisplayedPosition = currentPlayer
    ? displayedPlayerPositions[currentPlayer.id] ?? currentPlayer.position
    : null;

  useEffect(() => {
    interactionSessionRef.current = interactionSession;
  }, [interactionSession]);

  useEffect(() => {
    suppressCameraPanForToolRef.current = Boolean(
      canInteract &&
        myPlayer &&
        interactionSession &&
        isPointerStageActive(interactionSession)
    );
  }, [canInteract, interactionSession, myPlayer]);

  useLayoutEffect(() => {
    if (!snapshot) {
      setCellEntrySerialByEntity({});
      nextCellEntrySerialRef.current = 1;
      return;
    }

    const snapshotCreatureSummons = snapshot.summons.filter(isCreatureSummonSnapshot);
    const snapshotStackEntities = [
      ...snapshot.players.map((player, index) => ({
        entityKey: getPlayerEntityKey(player.id),
        fallbackOrder: index,
        id: player.id,
        kind: "player" as const,
        position: player.position
      })),
      ...snapshotCreatureSummons.map((summon, index) => ({
        entityKey: getSummonEntityKey(summon.instanceId),
        fallbackOrder: snapshot.players.length + index,
        id: summon.instanceId,
        kind: "summon" as const,
        position: summon.position
      }))
    ];
    const nextEntrySerials = { ...cellEntrySerialByEntity };
    const fallbackOrderByEntityKey = Object.fromEntries(
      snapshotStackEntities.map((entity) => [entity.entityKey, entity.fallbackOrder])
    ) as Record<string, number>;
    const arrivalMsByEntityKey = Object.fromEntries(
      (snapshot.latestPresentation?.events ?? []).flatMap((event) => {
        if (event.kind !== "motion") {
          return [];
        }

        if (event.subject.kind === "player") {
          return [
            [getPlayerEntityKey(event.subject.playerId), event.startMs + event.durationMs] as const
          ];
        }

        if (event.subject.kind === "summon") {
          return [
            [
              getSummonEntityKey(event.subject.summonInstanceId),
              event.startMs + event.durationMs
            ] as const
          ];
        }

        return [];
      })
    ) as Record<string, number>;
    const entitiesNeedingEntryUpdate = snapshotStackEntities
      .filter((entity) => {
        const previousPosition =
          entity.kind === "player"
            ? previousPositionsRef.current[entity.id]
            : previousSummonPositionsRef.current[entity.id];

        return (
          !(entity.entityKey in nextEntrySerials) ||
          !positionsEqual(previousPosition, entity.position)
        );
      })
      .sort(
        (left, right) =>
          (arrivalMsByEntityKey[left.entityKey] ?? 0) -
            (arrivalMsByEntityKey[right.entityKey] ?? 0) ||
          (fallbackOrderByEntityKey[left.entityKey] ?? 0) -
            (fallbackOrderByEntityKey[right.entityKey] ?? 0)
      );

    for (const entity of entitiesNeedingEntryUpdate) {
      nextEntrySerials[entity.entityKey] = nextCellEntrySerialRef.current;
      nextCellEntrySerialRef.current += 1;
    }

    const nextState = Object.fromEntries(
      snapshotStackEntities.map((entity) => [
        entity.entityKey,
        nextEntrySerials[entity.entityKey] ?? nextCellEntrySerialRef.current++
      ])
    );

    if (!areNumberMapsEqual(cellEntrySerialByEntity, nextState)) {
      setCellEntrySerialByEntity(nextState);
    }
  }, [cellEntrySerialByEntity, snapshot]);

  useEffect(() => {
    if (!snapshot) {
      stackAnimationByIdRef.current = {};
      return;
    }

    const nextAnimations: Record<
      string,
      { fromIndex: number; startedAtMs: number; toIndex: number }
    > = {};

    for (const entity of stackableBoardEntities) {
      const nextIndex = entityStackLayout.get(entity.entityKey)?.index ?? 0;
      const previousAnimation = stackAnimationByIdRef.current[entity.entityKey];

      if (!previousAnimation) {
        nextAnimations[entity.entityKey] = {
          fromIndex: nextIndex,
          toIndex: nextIndex,
          startedAtMs: simulationTimeMs
        };
        continue;
      }

      if (previousAnimation.toIndex === nextIndex) {
        nextAnimations[entity.entityKey] = previousAnimation;
        continue;
      }

      nextAnimations[entity.entityKey] = {
        fromIndex: getAnimatedStackIndex(
          previousAnimation.fromIndex,
          previousAnimation.toIndex,
          simulationTimeMs - previousAnimation.startedAtMs
        ),
        toIndex: nextIndex,
        startedAtMs: simulationTimeMs
      };
    }

    stackAnimationByIdRef.current = nextAnimations;
  }, [entityStackLayout, simulationTimeMs, snapshot, stackableBoardEntities]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    facingByIdRef.current = facingById;
    summonFacingByIdRef.current = summonFacingById;
    previousPositionsRef.current = Object.fromEntries(
      snapshot.players.map((player) => [player.id, player.position])
    );
    previousSummonPositionsRef.current = Object.fromEntries(
      snapshot.summons.map((summon) => [summon.instanceId, summon.position])
    );
  }, [facingById, snapshot, summonFacingById]);

  useEffect(() => {
    const canvas = gl.domElement;

    // The browser context menu is disabled so right click stays reserved for cancel.
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    canvas.addEventListener("contextmenu", onContextMenu);

    return () => {
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [gl]);

  const cancelInspection = useCallback(() => {
    clearInspectionTimer(inspectionTimerRef);
    setInspectionCard(null);
  }, []);

  // Long-press inspection waits briefly so normal taps do not spawn scene cards.
  const queueInspection = useCallback((nextInspectionCard: SceneInspectionCardData) => {
    clearInspectionTimer(inspectionTimerRef);
    inspectionTimerRef.current = window.setTimeout(() => {
      setInspectionCard(nextInspectionCard);
      inspectionTimerRef.current = null;
    }, INSPECTION_HOLD_DELAY_MS);
  }, []);

  useEffect(() => {
    const clearInspection = () => {
      cancelInspection();
    };

    window.addEventListener("pointerup", clearInspection);
    window.addEventListener("pointercancel", clearInspection);

    return () => {
      window.removeEventListener("pointerup", clearInspection);
      window.removeEventListener("pointercancel", clearInspection);
      clearInspectionTimer(inspectionTimerRef);
    };
  }, [cancelInspection]);

  const projectPointerToGround = useCallback((clientX: number, clientY: number) => {
    return projectClientToGround(
      clientX,
      clientY,
      gl.domElement,
      camera,
      dragRaycaster,
      dragPointer,
      dragPlane,
      dragIntersection
    );
  }, [camera, dragIntersection, dragPlane, dragPointer, dragRaycaster, gl]);

  const queueTerrainInspectionFromGround = useCallback(
    (ground: { x: number; z: number } | null) => {
      if (!ground || !snapshot) {
        return;
      }

      const gridPosition = toGridPositionFromWorld(
        ground.x,
        ground.z,
        snapshot.boardWidth,
        snapshot.boardHeight
      );

      if (
        gridPosition.x < 0 ||
        gridPosition.x >= snapshot.boardWidth ||
        gridPosition.y < 0 ||
        gridPosition.y >= snapshot.boardHeight
      ) {
        return;
      }

      const tile = stableDisplayedTiles.find(
        (candidate) => candidate.x === gridPosition.x && candidate.y === gridPosition.y
      );

      if (tile) {
        queueInspection(describeTileInspection(tile, terrainThumbnailUrls));
      }
    },
    [
      queueInspection,
      snapshot,
      stableDisplayedTiles,
      terrainThumbnailUrls
    ]
  );

  useEffect(() => {
    queueTerrainInspectionFromGroundRef.current = queueTerrainInspectionFromGround;
  }, [queueTerrainInspectionFromGround]);

  const setToolPointerFocusGridPosition = useCallback((focusGridPosition: GridPosition | null) => {
    if (!focusGridPosition || !snapshot) {
      toolPointerFocusGridRef.current = null;
      toolPointerFocusWorldRef.current = null;
      return;
    }

    const clampedFocusGridPosition = clampGridPositionToBoard(
      focusGridPosition,
      snapshot.boardWidth,
      snapshot.boardHeight
    );
    const [focusX, , focusZ] = toWorldPosition(
      clampedFocusGridPosition,
      snapshot.boardWidth,
      snapshot.boardHeight
    );

    toolPointerFocusGridRef.current = clampedFocusGridPosition;
    toolPointerFocusWorldRef.current = {
      x: focusX,
      z: focusZ
    };
  }, [snapshot]);

  const resolveToolPointerFocusGridPosition = useCallback((pointerWorld: { x: number; z: number } | null) => {
    if (!pointerWorld || !snapshot) {
      return null;
    }

    const offsetX = snapshot.boardWidth / 2 - 0.5;
    const offsetY = snapshot.boardHeight / 2 - 0.5;
    const exactGridX = Math.min(snapshot.boardWidth - 1, Math.max(0, pointerWorld.x + offsetX));
    const exactGridY = Math.min(snapshot.boardHeight - 1, Math.max(0, pointerWorld.z + offsetY));
    const roundedFocusGridPosition = clampGridPositionToBoard(
      {
        x: Math.round(exactGridX),
        y: Math.round(exactGridY)
      },
      snapshot.boardWidth,
      snapshot.boardHeight
    );
    const previousFocusGridPosition = toolPointerFocusGridRef.current;

    if (!previousFocusGridPosition) {
      return roundedFocusGridPosition;
    }

    const switchThreshold = 0.5 + TOOL_POINTER_FOCUS_SWITCH_MARGIN;
    const switchedAcrossMultipleTiles =
      Math.abs(roundedFocusGridPosition.x - previousFocusGridPosition.x) > 1 ||
      Math.abs(roundedFocusGridPosition.y - previousFocusGridPosition.y) > 1;
    const shouldSwitchX =
      roundedFocusGridPosition.x !== previousFocusGridPosition.x &&
      Math.abs(exactGridX - previousFocusGridPosition.x) >= switchThreshold;
    const shouldSwitchY =
      roundedFocusGridPosition.y !== previousFocusGridPosition.y &&
      Math.abs(exactGridY - previousFocusGridPosition.y) >= switchThreshold;

    if (switchedAcrossMultipleTiles || shouldSwitchX || shouldSwitchY) {
      return roundedFocusGridPosition;
    }

    return previousFocusGridPosition;
  }, [snapshot]);

  const setToolPointerType = useCallback((pointerType: string | null) => {
    activeToolPointerTypeRef.current = pointerType;
    setActiveToolPointerType(pointerType);
  }, []);

  const beginToolPointerInteraction = useCallback(
    (pointerType: string, pointerWorld: { x: number; z: number } | null) => {
      setToolPointerType(pointerType);
      setIsToolPointerInsideCancelZone(false);
      toolPointerFocusGridRef.current = null;
      toolPointerFocusWorldRef.current = null;
      setToolPointerFocusGridPosition(resolveToolPointerFocusGridPosition(pointerWorld));

      if (cameraControlMode === "follow") {
        followCameraStateRef.current = "follow";
      }
    },
    [
      cameraControlMode,
      resolveToolPointerFocusGridPosition,
      setToolPointerFocusGridPosition,
      setToolPointerType
    ]
  );

  const updateToolPointerFocusWorld = useCallback((pointerWorld: { x: number; z: number } | null) => {
    setToolPointerFocusGridPosition(resolveToolPointerFocusGridPosition(pointerWorld));
  }, [resolveToolPointerFocusGridPosition, setToolPointerFocusGridPosition]);

  const clearToolPointerInteractionContext = useCallback(
    (recenter = true) => {
      toolPointerFocusGridRef.current = null;
      toolPointerFocusWorldRef.current = null;
      setToolPointerType(null);
      setIsToolPointerInsideCancelZone(false);

      if (recenter && cameraControlMode === "follow") {
        followCameraStateRef.current = "recentering";
      }
    },
    [cameraControlMode, setToolPointerType]
  );

  const cancelActiveToolPointerDraft = useCallback(() => {
    const currentSession = interactionSessionRef.current;

    if (!currentSession?.pointerActive) {
      return;
    }

    const nextSession = clearToolInteractionDraft(currentSession);
    interactionSessionRef.current = nextSession;
    setInteractionSession(nextSession);
    clearToolPointerInteractionContext();
  }, [clearToolPointerInteractionContext]);

  const cancelCameraPointerGesture = useCallback((pointerId: number) => {
    const currentPanSession = cameraPanSessionRef.current;

    if (currentPanSession?.pointerId === pointerId) {
      cameraPanSessionRef.current = null;

      if (currentPanSession.started) {
        followCameraStateRef.current = "recentering";
      }
    }

    cameraTouchPointersRef.current.delete(pointerId);

    if (cameraTouchPointersRef.current.size < 2 && cameraPinchSessionRef.current) {
      cameraPinchSessionRef.current = null;
      followCameraStateRef.current = "recentering";
    }
  }, []);

  const cancelCameraGestureForToolUse = useCallback(() => {
    cameraPanSessionRef.current = null;
    cameraPinchSessionRef.current = null;
    cameraTouchPointersRef.current.clear();
    toolPointerFocusWorldRef.current = null;
    setToolPointerType(null);
    setIsToolPointerInsideCancelZone(false);

    if (cameraControlMode === "follow") {
      followCameraStateRef.current = "follow";
    }

    cancelInspection();
  }, [cameraControlMode, cancelInspection, setToolPointerType]);

  const addCameraPanFromScreenDelta = useCallback(
    (target: Vector3, deltaClientX: number, deltaClientY: number) => {
      const bounds = gl.domElement.getBoundingClientRect();

      if (!bounds.width || !bounds.height || !isPerspectiveCamera(camera)) {
        return;
      }

      const distanceToTarget = Math.max(
        FOLLOW_CAMERA_MIN_DISTANCE,
        camera.position.distanceTo(cameraTargetRef.current)
      );
      const verticalSpan =
        2 * distanceToTarget * Math.tan((camera.fov * Math.PI) / 360);
      const horizontalSpan = verticalSpan * camera.aspect;
      const right = cameraPanRightRef.current.setFromMatrixColumn(camera.matrixWorld, 0);
      const up = cameraPanUpRef.current.setFromMatrixColumn(camera.matrixWorld, 1);

      right.y = 0;
      up.y = 0;

      if (right.lengthSq() < 0.0001 || up.lengthSq() < 0.0001) {
        return;
      }

      right.normalize();
      up.normalize();
      target
        .addScaledVector(right, -(deltaClientX / bounds.width) * horizontalSpan)
        .addScaledVector(up, (deltaClientY / bounds.height) * verticalSpan);
    },
    [camera, gl]
  );

  const applyCameraPanFromScreenDelta = useCallback(
    (deltaClientX: number, deltaClientY: number) => {
      addCameraPanFromScreenDelta(cameraTargetRef.current, deltaClientX, deltaClientY);
      cameraDesiredTargetRef.current.copy(cameraTargetRef.current);
    },
    [addCameraPanFromScreenDelta]
  );

  const updateFollowTargetWithinScreenWindow = useCallback(
    (
      currentTarget: Vector3,
      focusTarget: Vector3,
      output: Vector3,
      windowNdcX: number,
      windowNdcY: number
    ) => {
      const bounds = gl.domElement.getBoundingClientRect();

      output.copy(currentTarget);

      if (!bounds.width || !bounds.height) {
        return;
      }

      const targetProjection = cameraScreenTargetProjectionRef.current.copy(currentTarget).project(camera);
      const focusProjection = cameraScreenFocusProjectionRef.current.copy(focusTarget).project(camera);
      const minX = targetProjection.x - windowNdcX;
      const maxX = targetProjection.x + windowNdcX;
      const minY = targetProjection.y - windowNdcY;
      const maxY = targetProjection.y + windowNdcY;
      const clampedFocusX = clampNumber(focusProjection.x, minX, maxX);
      const clampedFocusY = clampNumber(focusProjection.y, minY, maxY);
      const contentDeltaClientX = ((clampedFocusX - focusProjection.x) * bounds.width) / 2;
      const contentDeltaClientY = ((focusProjection.y - clampedFocusY) * bounds.height) / 2;

      if (Math.abs(contentDeltaClientX) < 0.5 && Math.abs(contentDeltaClientY) < 0.5) {
        return;
      }

      addCameraPanFromScreenDelta(output, contentDeltaClientX, contentDeltaClientY);
    },
    [addCameraPanFromScreenDelta, camera, gl]
  );

  useEffect(() => {
    if (cameraControlMode !== "follow") {
      return;
    }

    const canvas = gl.domElement;
    const previousTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";

    const updateTouchPointer = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || !cameraTouchPointersRef.current.has(event.pointerId)) {
        return;
      }

      cameraTouchPointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY
      });
    };

    const updatePinchZoom = (): boolean => {
      const touchPointers = Array.from(cameraTouchPointersRef.current.values());

      if (touchPointers.length < 2) {
        return false;
      }

      const nextDistancePx = getPointerDistancePx(touchPointers[0]!, touchPointers[1]!);
      const currentPinchSession = cameraPinchSessionRef.current;
      cameraPanSessionRef.current = null;
      followCameraStateRef.current = "manual-pan";
      cancelInspection();

      if (!currentPinchSession) {
        cancelActiveToolPointerDraft();
        cameraPinchSessionRef.current = {
          lastDistancePx: nextDistancePx
        };
        return true;
      }

      const distanceDeltaPx = nextDistancePx - currentPinchSession.lastDistancePx;
      cameraDesiredDistanceRef.current = clampNumber(
        cameraDesiredDistanceRef.current - distanceDeltaPx * FOLLOW_CAMERA_PINCH_ZOOM_UNITS_PER_PIXEL,
        FOLLOW_CAMERA_MIN_DISTANCE,
        FOLLOW_CAMERA_MAX_DISTANCE
      );
      currentPinchSession.lastDistancePx = nextDistancePx;

      return true;
    };

    const finishPinchIfNeeded = () => {
      if (cameraTouchPointersRef.current.size >= 2 || !cameraPinchSessionRef.current) {
        return;
      }

      cameraPinchSessionRef.current = null;
      followCameraStateRef.current = "recentering";
    };

    const onWheel = (event: WheelEvent) => {
      cameraDesiredDistanceRef.current = clampNumber(
        cameraDesiredDistanceRef.current + event.deltaY * FOLLOW_CAMERA_WHEEL_ZOOM_UNITS_PER_PIXEL,
        FOLLOW_CAMERA_MIN_DISTANCE,
        FOLLOW_CAMERA_MAX_DISTANCE
      );
      event.preventDefault();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      if (suppressCameraPanForToolRef.current || interactionSessionRef.current?.pointerActive) {
        return;
      }

      if (event.pointerType === "touch") {
        cameraTouchPointersRef.current.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY
        });

        if (updatePinchZoom()) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      const initialGround = projectPointerToGround(event.clientX, event.clientY);
      queueTerrainInspectionFromGroundRef.current(initialGround);
      cameraPanSessionRef.current = {
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        originClientX: event.clientX,
        originClientY: event.clientY,
        pointerId: event.pointerId,
        started: false
      };

      if (event.pointerType === "touch") {
        event.preventDefault();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      updateTouchPointer(event);

      if (interactionSessionRef.current?.pointerActive) {
        cameraPanSessionRef.current = null;
        return;
      }

      if (updatePinchZoom()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const currentPanSession = cameraPanSessionRef.current;

      if (!currentPanSession || currentPanSession.pointerId !== event.pointerId) {
        return;
      }

      if (event.pointerType !== "touch" && event.buttons === 0) {
        cancelCameraPointerGesture(event.pointerId);
        return;
      }

      const movedPx = Math.hypot(
        event.clientX - currentPanSession.originClientX,
        event.clientY - currentPanSession.originClientY
      );

      if (!currentPanSession.started) {
        if (movedPx < FOLLOW_CAMERA_PAN_THRESHOLD_PX) {
          return;
        }

        currentPanSession.started = true;
        followCameraStateRef.current = "manual-pan";
        cancelInspection();
        currentPanSession.lastClientX = event.clientX;
        currentPanSession.lastClientY = event.clientY;
        event.preventDefault();
        return;
      }

      applyCameraPanFromScreenDelta(
        event.clientX - currentPanSession.lastClientX,
        event.clientY - currentPanSession.lastClientY
      );
      currentPanSession.lastClientX = event.clientX;
      currentPanSession.lastClientY = event.clientY;
      event.preventDefault();
    };

    const onPointerEnd = (event: PointerEvent) => {
      const currentPanSession = cameraPanSessionRef.current;

      if (currentPanSession?.pointerId === event.pointerId) {
        cameraPanSessionRef.current = null;

        if (currentPanSession.started) {
          followCameraStateRef.current = "recentering";
        }
      }

      if (event.pointerType === "touch") {
        cameraTouchPointersRef.current.delete(event.pointerId);
        finishPinchIfNeeded();
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown, true);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown, true);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      canvas.style.touchAction = previousTouchAction;
      cameraPanSessionRef.current = null;
      cameraPinchSessionRef.current = null;
      cameraTouchPointersRef.current.clear();
    };
  }, [
    applyCameraPanFromScreenDelta,
    cameraControlMode,
    cancelActiveToolPointerDraft,
    cancelCameraPointerGesture,
    cancelInspection,
    gl,
    projectPointerToGround
  ]);

  useFrame((_, deltaSeconds) => {
    if (cameraControlMode !== "follow") {
      return;
    }

    const focusTarget = cameraFocusTargetRef.current;
    const toolPointerFocusWorld =
      interactionSessionRef.current?.pointerActive ? toolPointerFocusWorldRef.current : null;
    const followWindowNdcX = toolPointerFocusWorld
      ? TOOL_POINTER_CAMERA_WINDOW_NDC_X
      : FOLLOW_CAMERA_WINDOW_NDC_X;
    const followWindowNdcY = toolPointerFocusWorld
      ? TOOL_POINTER_CAMERA_WINDOW_NDC_Y
      : FOLLOW_CAMERA_WINDOW_NDC_Y;

    if (toolPointerFocusWorld) {
      focusTarget.set(toolPointerFocusWorld.x, 0, toolPointerFocusWorld.z);
    } else if (snapshot && currentPlayerDisplayedPosition) {
      const [focusX, , focusZ] = toWorldPositionFromGrid(
        currentPlayerDisplayedPosition.x,
        currentPlayerDisplayedPosition.y,
        snapshot.boardWidth,
        snapshot.boardHeight
      );
      focusTarget.set(focusX, 0, focusZ);
    } else {
      focusTarget.set(0, 0, 0);
    }

    if (!cameraInitializedRef.current) {
      cameraTargetRef.current.copy(focusTarget);
      cameraDesiredTargetRef.current.copy(focusTarget);
      cameraDistanceRef.current = FOLLOW_CAMERA_DEFAULT_DISTANCE;
      cameraDesiredDistanceRef.current = FOLLOW_CAMERA_DEFAULT_DISTANCE;
      cameraInitializedRef.current = true;
      cameraPositionRef.current
        .copy(cameraTargetRef.current)
        .addScaledVector(FOLLOW_CAMERA_OFFSET_DIRECTION, cameraDistanceRef.current);
      camera.position.copy(cameraPositionRef.current);
      camera.lookAt(cameraTargetRef.current);
      camera.updateMatrixWorld();
      return;
    }

    if (followCameraStateRef.current === "manual-pan") {
      cameraDesiredTargetRef.current.copy(cameraTargetRef.current);
    } else if (followCameraStateRef.current === "recentering") {
      updateFollowTargetWithinScreenWindow(
        cameraTargetRef.current,
        focusTarget,
        cameraDesiredTargetRef.current,
        followWindowNdcX,
        followWindowNdcY
      );
    } else {
      updateFollowTargetWithinScreenWindow(
        cameraTargetRef.current,
        focusTarget,
        cameraDesiredTargetRef.current,
        followWindowNdcX,
        followWindowNdcY
      );
    }

    const targetDamping =
      followCameraStateRef.current === "recentering"
        ? FOLLOW_CAMERA_RECENTER_DAMPING
        : FOLLOW_CAMERA_DAMPING;
    const targetAlpha = getDampedAlpha(targetDamping, deltaSeconds);
    const distanceAlpha = getDampedAlpha(FOLLOW_CAMERA_ZOOM_DAMPING, deltaSeconds);

    cameraTargetRef.current.lerp(cameraDesiredTargetRef.current, targetAlpha);
    cameraDistanceRef.current +=
      (cameraDesiredDistanceRef.current - cameraDistanceRef.current) * distanceAlpha;

    if (
      followCameraStateRef.current === "recentering" &&
      cameraTargetRef.current.distanceToSquared(cameraDesiredTargetRef.current) < 0.0025
    ) {
      followCameraStateRef.current = "follow";
    }

    cameraPositionRef.current
      .copy(cameraTargetRef.current)
      .addScaledVector(FOLLOW_CAMERA_OFFSET_DIRECTION, cameraDistanceRef.current);
    camera.position.copy(cameraPositionRef.current);
    camera.lookAt(cameraTargetRef.current);
    camera.updateMatrixWorld();
  });

  const startToolInteractionPointer = useCallback(
    (tool: TurnToolSnapshot, clientX: number, clientY: number, pointerType: string) => {
      if (!snapshot || !myPlayer || !canInteract || isInstantInteractionTool(tool.toolId)) {
        return;
      }

      cancelCameraGestureForToolUse();
      const pointerWorld = projectPointerToGround(clientX, clientY);
      const currentSession = interactionSessionRef.current;
      const baseSession =
        currentSession && currentSession.toolInstanceId === tool.instanceId
          ? currentSession
          : createToolInteractionSession(tool);
      const nextSession = updateToolInteractionFromPointer(beginToolInteractionPointer(baseSession), {
        actorPosition: myPlayer.position,
        boardHeight: snapshot.boardHeight,
        boardWidth: snapshot.boardWidth,
        pointerWorld
      });
      const targetPosition = getToolInteractionTargetPosition(nextSession);

      interactionSessionRef.current = nextSession;
      setSelectedToolInstanceId(tool.instanceId);
      setInteractionSession(nextSession);
      beginToolPointerInteraction(pointerType, pointerWorld);

      if (targetPosition) {
        setToolPointerFocusGridPosition(targetPosition);
      }

      cancelInspection();
    },
    [
      beginToolPointerInteraction,
      cancelCameraGestureForToolUse,
      cancelInspection,
      canInteract,
      myPlayer,
      projectPointerToGround,
      setToolPointerFocusGridPosition,
      setSelectedToolInstanceId,
      snapshot
    ]
  );

  const startSelectedInteractionPointer = useCallback(
    (clientX: number, clientY: number, pointerType: string): boolean => {
      if (!selectedInteractiveTool) {
        return false;
      }

      startToolInteractionPointer(selectedInteractiveTool, clientX, clientY, pointerType);
      return true;
    },
    [selectedInteractiveTool, startToolInteractionPointer]
  );

  useEffect(() => {
    if (!selectedInteractiveTool || !myPlayer || !canInteract) {
      interactionSessionRef.current = null;
      setInteractionSession(null);
      clearToolPointerInteractionContext(false);
      return;
    }

    setInteractionSession((currentSession) => {
      if (
        currentSession &&
        currentSession.toolInstanceId === selectedInteractiveTool.instanceId &&
        currentSession.toolId === selectedInteractiveTool.toolId
      ) {
        interactionSessionRef.current = currentSession;
        return currentSession;
      }

      const nextSession = createToolInteractionSession(selectedInteractiveTool);
      interactionSessionRef.current = nextSession;
      return nextSession;
    });
  }, [canInteract, clearToolPointerInteractionContext, myPlayer, selectedInteractiveTool]);

  useEffect(() => {
    if (!snapshot || !myPlayer || !canInteract) {
      return;
    }

    const cancelInteraction = () => {
      interactionSessionRef.current = null;
      setInteractionSession(null);
      setSelectedToolInstanceId(null);
      clearToolPointerInteractionContext();
      cancelInspection();
    };

    const onPointerMove = (event: PointerEvent) => {
      const currentSession = interactionSessionRef.current;

      if (!currentSession?.pointerActive) {
        return;
      }

      const isTouchCancelPointer = activeToolPointerTypeRef.current === "touch";
      const isInsideCancelZone =
        isTouchCancelPointer && isToolPointerCancelZoneHit(event.clientY, gl.domElement.getBoundingClientRect());
      setIsToolPointerInsideCancelZone(isInsideCancelZone);

      if (isInsideCancelZone) {
        event.preventDefault();
        return;
      }

      const pointerWorld = projectPointerToGround(event.clientX, event.clientY);
      updateToolPointerFocusWorld(pointerWorld);

      const nextSession = updateToolInteractionFromPointer(currentSession, {
        actorPosition: myPlayer.position,
        boardHeight: snapshot.boardHeight,
        boardWidth: snapshot.boardWidth,
        pointerWorld
      });
      const targetPosition = getToolInteractionTargetPosition(nextSession);

      interactionSessionRef.current = nextSession;
      setInteractionSession(nextSession);

      if (targetPosition) {
        setToolPointerFocusGridPosition(targetPosition);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const currentSession = interactionSessionRef.current;

      if (!currentSession?.pointerActive) {
        return;
      }

      if (
        activeToolPointerTypeRef.current === "touch" &&
        isToolPointerCancelZoneHit(event.clientY, gl.domElement.getBoundingClientRect())
      ) {
        event.preventDefault();
        cancelInteraction();
        return;
      }

      const result = finalizeToolInteractionStage(currentSession);
      clearToolPointerInteractionContext();

      if (result.kind === "execute" && result.payload) {
        const didSend = useToolPayload(result.payload, currentSession.toolInstanceId);

        if (didSend) {
          interactionSessionRef.current = null;
          setInteractionSession(null);
          return;
        }
      }

      interactionSessionRef.current = result.session;
      setInteractionSession(result.session);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 2) {
        return;
      }

      event.preventDefault();
      cancelInteraction();
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 2) {
        return;
      }

      event.preventDefault();
      cancelInteraction();
    };

    const onPointerCancel = () => {
      const currentSession = interactionSessionRef.current;

      if (!currentSession?.pointerActive) {
        return;
      }

      const nextSession = clearToolInteractionDraft(currentSession);
      interactionSessionRef.current = nextSession;
      setInteractionSession(nextSession);
      clearToolPointerInteractionContext();
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      if (activeToolPointerTypeRef.current !== "mouse") {
        return;
      }

      cancelInteraction();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
    };
  }, [
    camera,
    canInteract,
    dragIntersection,
    dragPlane,
    dragPointer,
    dragRaycaster,
    gl,
    myPlayer,
    clearToolPointerInteractionContext,
    projectPointerToGround,
    setToolPointerFocusGridPosition,
    setSelectedToolInstanceId,
    snapshot,
    updateToolPointerFocusWorld,
    useToolPayload
  ]);

  const previewDescriptor = useMemo(() => {
    if (
      !snapshot ||
      !sessionId ||
      !interactionSession ||
      !canInteract ||
      !hasToolInteractionPreviewPayload(interactionSession)
    ) {
      return null;
    }

    return buildActionPreview(snapshot, sessionId, {
      toolInstanceId: interactionSession.toolInstanceId,
      ...buildToolInteractionPreviewPayload(interactionSession)
    });
  }, [canInteract, interactionSession, sessionId, snapshot]);
  const fallbackTargetPosition = getToolInteractionTargetPosition(interactionSession);
  const scenePreview = useMemo(() => {
    const basePreview = resolveScenePreviewState({
      previewDescriptor,
      snapshot,
      toolId: interactionSession?.toolId ?? null
    });

    if (fallbackTargetPosition && !previewDescriptor && snapshot) {
      const selectionKeys = new Set(basePreview.selectionKeys);
      selectionKeys.add(`${fallbackTargetPosition.x},${fallbackTargetPosition.y}`);

      return {
        ...basePreview,
        selectionKeys
      };
    }

    return basePreview;
  }, [
    fallbackTargetPosition,
    interactionSession?.toolId,
    previewDescriptor,
    snapshot
  ]);

  useLayoutEffect(() => {
    if (!snapshot) {
      return;
    }

    window.watcher_scene_debug = {
      inspectionCard,
      displayedPlayers: Object.fromEntries(
        displayedPlayers.map((player) => {
          const entityKey = getPlayerEntityKey(player.id);
          const stackLayout = entityStackLayout.get(entityKey) ?? { count: 1, index: 0 };
          const stackAnimation = stackAnimationByIdRef.current[entityKey];
          const animatedStackIndex = stackAnimation
            ? getAnimatedStackIndex(
                stackAnimation.fromIndex,
                stackAnimation.toIndex,
                simulationTimeMs - stackAnimation.startedAtMs
              )
            : stackLayout.index;

          return [
            player.id,
            {
              ...(displayedPlayerPositions[player.id] ?? player.position),
              boardVisible: player.boardVisible,
              color: player.color,
              isActive: player.id === snapshot.turnInfo.currentPlayerId,
              stackSerial: cellEntrySerialByEntity[entityKey] ?? 0,
              stackIndex: animatedStackIndex,
              stackY: PLAYER_BASE_Y + animatedStackIndex * PLAYER_STACK_STEP_Y
            }
          ];
        })
      ),
      displayedSummons: Object.fromEntries(
        displayedSummons.map((summon) => {
          const isCreature = isCreatureSummonSnapshot(summon);

          if (!isCreature) {
            return [summon.instanceId, { ...summon, isCreature }] as const;
          }

          const entityKey = getSummonEntityKey(summon.instanceId);
          const stackLayout = entityStackLayout.get(entityKey) ?? { count: 1, index: 0 };
          const stackAnimation = stackAnimationByIdRef.current[entityKey];
          const animatedStackIndex = stackAnimation
            ? getAnimatedStackIndex(
                stackAnimation.fromIndex,
                stackAnimation.toIndex,
                simulationTimeMs - stackAnimation.startedAtMs
              )
            : stackLayout.index;

          return [
            summon.instanceId,
            {
              ...summon,
              isCreature,
              stackSerial: cellEntrySerialByEntity[entityKey] ?? 0,
              stackIndex: animatedStackIndex,
              stackY: PLAYER_BASE_Y + animatedStackIndex * PLAYER_STACK_STEP_Y
            }
          ] as const;
        })
      ),
      displayedTiles: Object.fromEntries(
        displayedTiles.map((tile) => [
          tile.key,
          {
            type: tile.type,
            durability: tile.durability,
            direction: tile.direction
          }
        ])
      ),
      playback: {
        activePresentationSequence: activeActionPresentation?.sequence ?? null,
        activePlayerMotionCount: Object.keys(playbackState.playerMotions).length,
        activeSummonMotionCount: Object.keys(playbackState.summonMotions).length,
        activeProjectileCount: playbackState.projectiles.length,
        activeReactionCount: playbackState.reactions.length,
        queuedPresentationCount: actionPresentationQueue.length
      },
      diceRollAnimation: diceRollAnimation
        ? {
            dice: diceRollAnimation.dice.map((die) => ({
              kind: die.kind,
              label: die.label,
              resultLabel: die.resultLabel
            })),
            elapsedMs: simulationTimeMs - diceRollAnimation.startedAtMs,
            durationMs: diceRollAnimation.durationMs
          }
        : null,
      scene: {
        boardHeight: snapshot.boardHeight,
        boardWidth: snapshot.boardWidth,
        playerCount: displayedPlayers.length,
        summonCount: displayedSummons.length,
        tileCount: displayedTiles.length
      }
    };

    return () => {
      window.watcher_scene_debug = undefined;
    };
  }, [
    cellEntrySerialByEntity,
    actionPresentationQueue.length,
    activeActionPresentation,
    diceRollAnimation,
    displayedPlayers,
    displayedPlayerPositions,
    displayedSummons,
    displayedTiles,
    entityStackLayout,
    inspectionCard,
    simulationTimeMs,
    snapshot
  ]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    window.project_grid_to_client = (x, y, elevation = 0) => {
      const [worldX, , worldZ] = toWorldPosition(
        { x, y },
        snapshot.boardWidth,
        snapshot.boardHeight
      );
      const projectedPoint = new Vector3(worldX, elevation, worldZ).project(camera);
      const bounds = gl.domElement.getBoundingClientRect();

      return {
        x: bounds.left + ((projectedPoint.x + 1) * bounds.width) / 2,
        y: bounds.top + ((1 - projectedPoint.y) * bounds.height) / 2
      };
    };

    return () => {
      window.project_grid_to_client = undefined;
    };
  }, [camera, gl, snapshot]);

  if (!snapshot) {
    return <></>;
  }

  const shadowBounds = estimateBoardShadowBounds(snapshot.boardWidth, snapshot.boardHeight);

  const handlePiecePointerDown = useCallback(
    (player: PlayerSnapshot, event: ThreeEvent<PointerEvent>) => {
      const currentSession = interactionSessionRef.current;
      const canStartNow = Boolean(
        canInteract &&
          myPlayer &&
          currentSession &&
          isPointerStageActive(currentSession) &&
          !currentSession.pointerActive
      );

      if (canStartNow) {
        event.stopPropagation();
        cancelInspection();
        if (
          startSelectedInteractionPointer(
            event.nativeEvent.clientX,
            event.nativeEvent.clientY,
            event.nativeEvent.pointerType
          )
        ) {
          cancelCameraPointerGesture(event.nativeEvent.pointerId);
          return;
        }
      }

      event.stopPropagation();
      queueInspection(describePlayerInspection(player));
    },
    [
      canInteract,
      cancelCameraPointerGesture,
      cancelInspection,
      myPlayer,
      queueInspection,
      startSelectedInteractionPointer
    ]
  );

  const handleTilePointerDown = useCallback(
    (tile: TileDefinition, event: ThreeEvent<PointerEvent>) => {
      const currentSession = interactionSessionRef.current;
      const canStartNow = Boolean(
        canInteract &&
          myPlayer &&
          currentSession &&
          isPointerStageActive(currentSession) &&
          !currentSession.pointerActive
      );

      if (canStartNow) {
        event.stopPropagation();
        cancelInspection();
        if (
          startSelectedInteractionPointer(
            event.nativeEvent.clientX,
            event.nativeEvent.clientY,
            event.nativeEvent.pointerType
          )
        ) {
          cancelCameraPointerGesture(event.nativeEvent.pointerId);
          return;
        }
      }

      event.stopPropagation();
      queueInspection(describeTileInspection(tile, terrainThumbnailUrls));
    },
    [
      canInteract,
      cancelCameraPointerGesture,
      cancelInspection,
      myPlayer,
      queueInspection,
      startSelectedInteractionPointer,
      terrainThumbnailUrls
    ]
  );

  const handleSummonPointerDown = useCallback(
    (summon: SummonSnapshot, event: ThreeEvent<PointerEvent>) => {
      const currentSession = interactionSessionRef.current;
      const canStartNow = Boolean(
        canInteract &&
          myPlayer &&
          currentSession &&
          isPointerStageActive(currentSession) &&
          !currentSession.pointerActive
      );

      if (canStartNow) {
        event.stopPropagation();
        cancelInspection();
        if (
          startSelectedInteractionPointer(
            event.nativeEvent.clientX,
            event.nativeEvent.clientY,
            event.nativeEvent.pointerType
          )
        ) {
          cancelCameraPointerGesture(event.nativeEvent.pointerId);
          return;
        }
      }

      event.stopPropagation();
      queueInspection(describeSummonInspection(summon));
    },
    [
      canInteract,
      cancelCameraPointerGesture,
      cancelInspection,
      myPlayer,
      queueInspection,
      startSelectedInteractionPointer
    ]
  );

  return (
    <>
      <color attach="background" args={["#f3ead9"]} />
      <ambientLight intensity={0.85} />
      <directionalLight
        castShadow
        intensity={1.35}
        position={[6, 12, 4]}
        shadow-camera-bottom={-shadowBounds}
        shadow-camera-left={-shadowBounds}
        shadow-camera-right={shadowBounds}
        shadow-camera-top={shadowBounds}
        shadow-bias={-0.0001}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
      />
      <mesh position={[0, -0.7, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[snapshot.boardWidth + 2, snapshot.boardHeight + 2]} />
        <meshStandardMaterial color="#d7d8c6" />
      </mesh>

      <BoardStaticTileLayer
        boardHeight={snapshot.boardHeight}
        boardWidth={snapshot.boardWidth}
        highlightKeys={scenePreview.highlightKeys}
        onTilePointerDown={handleTilePointerDown}
        tiles={stableDisplayedTiles}
      />
      <BoardTileSelectionLayer
        boardHeight={snapshot.boardHeight}
        boardWidth={snapshot.boardWidth}
        color={scenePreview.previewColor}
        selectionKeys={scenePreview.selectionKeys}
        tiles={stableDisplayedTiles}
      />
      <ToolEffectPreview
        boardWidth={snapshot.boardWidth}
        boardHeight={snapshot.boardHeight}
        color={scenePreview.previewColor}
        effectTiles={scenePreview.effectTiles}
        toolId={interactionSession?.toolId ?? null}
      />
      {displayedObjectSummons.map((summon, index) => {
        const ownerColor =
          snapshot.players.find((player) => player.id === summon.ownerId)?.color ?? "#8d7a3d";
        const activeMotion = playbackState.summonMotions[summon.instanceId] ?? null;
        const facingDirection =
          activeMotion?.position.facing ?? summonFacingById[summon.instanceId] ?? "down";
        const summonPose = getGridEntityPresentationPose(
          activeMotion?.motionStyle ?? null,
          activeMotion?.progress ?? 0,
          DIRECTION_ROTATION_Y[facingDirection],
          facingDirection
        );
        const bob = activeMotion ? 0 : Math.sin(simulationTimeMs / 520 + index) * 0.025;
        const positionY = bob + (activeMotion?.position.lift ?? 0) + summonPose.yOffset;

        return (
          <SummonVisual
            key={summon.instanceId}
            summon={summon}
            boardWidth={snapshot.boardWidth}
            boardHeight={snapshot.boardHeight}
            color={ownerColor}
            onPointerDown={(event) => handleSummonPointerDown(summon, event)}
            positionY={positionY}
            rotation={summonPose.rotation}
          />
        );
      })}

      {renderedStackEntities.map((entity, index) => {
        if (entity.kind === "summon") {
          const summon = entity.summon;
          const ownerColor =
            snapshot.players.find((player) => player.id === summon.ownerId)?.color ?? "#8d7a3d";
          const activeMotion = playbackState.summonMotions[summon.instanceId] ?? null;
          const facingDirection =
            activeMotion?.position.facing ?? summonFacingById[summon.instanceId] ?? "down";
          const summonPose = getGridEntityPresentationPose(
            activeMotion?.motionStyle ?? null,
            activeMotion?.progress ?? 0,
            DIRECTION_ROTATION_Y[facingDirection],
            facingDirection
          );
          const stackLayout = entityStackLayout.get(entity.entityKey) ?? { count: 1, index: 0 };
          const stackAnimation = stackAnimationByIdRef.current[entity.entityKey];
          const animatedStackIndex = stackAnimation
            ? getAnimatedStackIndex(
                stackAnimation.fromIndex,
                stackAnimation.toIndex,
                simulationTimeMs - stackAnimation.startedAtMs
              )
            : stackLayout.index;
          const bob = activeMotion ? 0 : Math.sin(simulationTimeMs / 520 + index) * 0.025;
          const positionY =
            PLAYER_BASE_Y +
            animatedStackIndex * PLAYER_STACK_STEP_Y +
            bob +
            (activeMotion?.position.lift ?? 0) +
            summonPose.yOffset;

          return (
            <SummonVisual
              key={entity.entityKey}
              summon={summon}
              boardWidth={snapshot.boardWidth}
              boardHeight={snapshot.boardHeight}
              color={ownerColor}
              gridPosition={entity.position}
              onPointerDown={(event) => handleSummonPointerDown(summon, event)}
              positionY={positionY}
              renderOrder={20 + Math.round(animatedStackIndex * 10)}
              rotation={summonPose.rotation}
            />
          );
        }

        const player = entity.player;
        const snapshotPlayer = snapshotPlayersById.get(player.id) ?? player;
        const activeMotion = playbackState.playerMotions[player.id] ?? null;
        const displayedGridPosition = entity.position;
        const [x, , z] = toWorldPositionFromGrid(
          displayedGridPosition.x,
          displayedGridPosition.y,
          snapshot.boardWidth,
          snapshot.boardHeight
        );
        const isActive = player.id === snapshot.turnInfo.currentPlayerId;
        const isMe = player.id === sessionId;
        const stackLayout = entityStackLayout.get(entity.entityKey) ?? { count: 1, index: 0 };
        const stackAnimation = stackAnimationByIdRef.current[entity.entityKey];
        const animatedStackIndex = stackAnimation
          ? getAnimatedStackIndex(
              stackAnimation.fromIndex,
              stackAnimation.toIndex,
              simulationTimeMs - stackAnimation.startedAtMs
            )
          : stackLayout.index;
        const actionRingOffset = getActionRingOffset(
          Math.round(displayedGridPosition.x),
          Math.round(displayedGridPosition.y),
          snapshot.boardWidth,
          snapshot.boardHeight
        );
        const bob = activeMotion || (isActive && isMe) ? 0 : Math.sin(simulationTimeMs / 450 + index) * 0.05;
        const reactionLift = playerLiftById[player.id] ?? 0;
        const pieceBaseY =
          PLAYER_BASE_Y +
          animatedStackIndex * PLAYER_STACK_STEP_Y +
          bob +
          (activeMotion?.position.lift ?? 0) +
          reactionLift;
        const pieceTopY = pieceBaseY + 0.96;
        const facingDirection = activeMotion?.position.facing ?? facingById[player.id] ?? "down";
        const playerPose = getGridEntityPresentationPose(
          activeMotion?.motionStyle ?? null,
          activeMotion?.progress ?? 0,
          DIRECTION_ROTATION_Y[facingDirection],
          facingDirection
        );
        const activeRingColor = mixSceneColor(player.color, "#fff4ce", 0.5);
        const directionArrowPosition: [number, number, number] =
          isMe &&
          directionState?.anchorPosition
            ? [
                directionState.anchorPosition.x - displayedGridPosition.x,
                0.02,
                directionState.anchorPosition.y - displayedGridPosition.y
              ]
            : [0, 0.02, 0];

        return (
          <group
            key={entity.entityKey}
            position={[x, 0, z]}
            renderOrder={20 + Math.round(animatedStackIndex * 10)}
          >
            {isActive ? (
              <SceneActionRing
                caption={isMe && selectedInteractiveTool ? getToolInteractionCaption(selectedInteractiveTool, interactionSession) : null}
                hidden={isPointerInteractionActive && isMe}
                interactive={isMe && canInteract}
                snapshot={snapshot}
                toolOwnerId={player.id}
                tools={snapshotPlayer.tools}
                phase={snapshot.turnInfo.phase}
                position={[0, pieceTopY + 0.7, 0]}
                screenOffsetX={actionRingOffset.x}
                screenOffsetY={actionRingOffset.y}
                selectedToolInstanceId={isMe ? selectedToolInstanceId : null}
                showArc={!isMe || showActionRingArc}
                onBeginPointerTool={(toolInstanceId, clientX, clientY, pointerType) => {
                  if (!isMe || !canInteract) {
                    return;
                  }

                  const tool = findToolInstance(snapshotPlayer.tools, toolInstanceId);

                  if (tool) {
                    startToolInteractionPointer(tool, clientX, clientY, pointerType);
                  }
                }}
                onEndTurn={isMe && canInteract ? endTurn : () => {}}
                onRollDice={isMe && canInteract ? rollDice : () => {}}
                onSelectTool={isMe && canInteract ? setSelectedToolInstanceId : () => {}}
                onShowUnavailableToolNotice={isMe && canInteract ? showToolNotice : () => {}}
                onUseInstantTool={
                  isMe && canInteract
                    ? (toolInstanceId) => {
                        useToolPayload({ input: {} }, toolInstanceId);
                      }
                    : () => {}
                }
              />
            ) : null}
            {isMe && canShowDirectionArrows && selectedInteractiveTool && directionState ? (
              <SceneDirectionArrows
                actionId={selectedInteractiveTool.toolId}
                activeDirection={directionState.activeDirection}
                position={directionArrowPosition}
              />
            ) : null}
            <PlayerHaloAsset activeColor={activeRingColor} color={player.color} isActive={isActive} />
            <mesh
              position={[0, pieceBaseY + 0.44, 0]}
              scale={[1.4, 1.7, 1.4]}
              onPointerDown={(event) => handlePiecePointerDown(player, event)}
            >
              <sphereGeometry args={[0.34, 20, 20]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <PetPiece
              fallbackSeed={player.id}
              petId={player.petId}
              position={[0, pieceBaseY + playerPose.yOffset, 0]}
              rotation={playerPose.rotation}
            />
            <PlayerStatusVisuals
              modifiers={snapshotPlayer.modifiers}
              simulationTimeMs={simulationTimeMs}
              tags={snapshotPlayer.tags}
            />
          </group>
        );
      })}
      {playbackState.projectiles.map((projectile) => (
        <ProjectileVisual
          key={projectile.eventId}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          projectile={projectile}
        />
      ))}
      {playbackState.reactions
        .filter((reaction): reaction is Extract<(typeof playbackState.reactions)[number], { kind: "effect" }> => reaction.kind === "effect")
        .map((effect) => (
        <EffectVisual
          key={effect.eventId}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          effect={effect}
        />
      ))}
      {playbackState.reactions
        .filter((reaction): reaction is Extract<(typeof playbackState.reactions)[number], { kind: "link" }> => reaction.kind === "link")
        .map((reaction) => (
        <LinkReactionVisual
          key={reaction.eventId}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          playerPositions={displayedPlayerPositions}
          summonPositions={displayedSummonPositions}
          reaction={reaction}
        />
      ))}
      {playbackState.reactions
        .filter((reaction): reaction is Extract<(typeof playbackState.reactions)[number], { kind: "number_popup" }> => reaction.kind === "number_popup")
        .map((reaction) => (
        <NumberPopupReactionVisual
          key={reaction.eventId}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          reaction={reaction}
        />
      ))}

      {scenePreview.landingRings.map((ring) => (
        <PreviewRingAsset
          key={ring.key}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          color={ring.color ?? scenePreview.previewColor}
          opacity={ring.opacity}
          position={ring.position}
          radius={ring.radius}
        />
      ))}

      {diceRollAnimation ? (
        <DiceRollOverlay
          animation={diceRollAnimation}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          simulationTimeMs={simulationTimeMs}
        />
      ) : null}

      {currentPlayer ? (
        <CurrentTurnMarkerAsset
          x={
            (
              currentPlayerDisplayedPosition
                ? toWorldPositionFromGrid(
                    currentPlayerDisplayedPosition.x,
                    currentPlayerDisplayedPosition.y,
                    snapshot.boardWidth,
                    snapshot.boardHeight
                  )
                : toWorldPosition(currentPlayer.position, snapshot.boardWidth, snapshot.boardHeight)
            )[0]
          }
          z={
            (
              currentPlayerDisplayedPosition
                ? toWorldPositionFromGrid(
                    currentPlayerDisplayedPosition.x,
                    currentPlayerDisplayedPosition.y,
                    snapshot.boardWidth,
                    snapshot.boardHeight
                  )
                : toWorldPosition(currentPlayer.position, snapshot.boardWidth, snapshot.boardHeight)
            )[2]
          }
          color={mixSceneColor(currentPlayer.color, "#fff4ce", 0.42)}
        />
      ) : null}
    </>
  );
}
