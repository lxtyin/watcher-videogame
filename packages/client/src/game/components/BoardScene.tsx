import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, Plane, Raycaster, Vector2, Vector3 } from "three";
import {
  findToolInstance,
  getToolAvailability,
  getToolDefinition,
  isAimTool,
  isChoiceTool,
  isDirectionalTool,
  isTileDirectionTool,
  type Direction,
  type GridPosition,
  type PlayerSnapshot,
  type SummonSnapshot,
  type ToolId,
  type ToolTargetMode,
  type TurnToolSnapshot
} from "@watcher/shared";
import { BoardTileVisual } from "../assets/board/BoardTileVisual";
import { CurrentTurnMarkerAsset } from "../assets/player/CurrentTurnMarkerAsset";
import { PlayerHaloAsset } from "../assets/player/PlayerHaloAsset";
import { EffectVisual } from "../assets/presentation/EffectVisual";
import { ProjectileVisual } from "../assets/presentation/ProjectileVisual";
import { PreviewRingAsset } from "../assets/previews/PreviewRingAsset";
import { PreviewWallGhostAsset } from "../assets/previews/PreviewWallGhostAsset";
import { toWorldPositionFromGrid } from "../assets/shared/gridPlacement";
import { SummonVisual } from "../assets/summons/SummonVisual";
import { evaluatePlaybackEngine } from "../animation/playbackEngine";
import {
  getDragDirection,
  projectClientToGround,
  resolveTileAimTarget
} from "../interaction/aiming";
import {
  resolveScenePreviewState,
  type TilePreviewVariant
} from "../interaction/previewState";
import {
  describePlayerInspection,
  describeSummonInspection,
  describeTileInspection,
  type SceneInspectionCardData
} from "../content/inspectables";
import { useGameStore } from "../state/useGameStore";
import { SceneActionRing } from "./SceneInteractionHud";
import { SceneInspectionCard } from "./SceneInspectionCard";
import { SceneDirectionArrows } from "./SceneDirectionArrows";
import { PetPiece } from "./PetPiece";
import {
  buildActionPreview,
  toWorldPosition
} from "../utils/boardMath";

interface AimStateBase {
  toolId: ToolId;
  toolInstanceId: string;
  targetMode: Exclude<ToolTargetMode, "instant">;
  startClientX: number;
  startClientY: number;
}

interface DirectionAimState extends AimStateBase {
  targetMode: "direction";
  direction: Direction | null;
}

interface TileAimState extends AimStateBase {
  targetMode: "tile";
  targetPosition: GridPosition | null;
}

interface TileDirectionAimState extends AimStateBase {
  direction: Direction | null;
  targetMode: "tile_direction";
  targetPosition: GridPosition | null;
}

type AimState = DirectionAimState | TileAimState | TileDirectionAimState;

interface SceneHudOffset {
  x: number;
  y: number;
}

interface PlayerStackLayout {
  count: number;
  index: number;
}

const AIM_DRAG_THRESHOLD_PX = 14;
const INSPECTION_HOLD_DELAY_MS = 320;
const PLAYER_STACK_STEP_Y = 0.88;
const PLAYER_BASE_Y = -0.28;
const STACK_REPOSITION_MS = 260;
const STACK_ENTRY_LIFT_EPSILON = 0.12;
const DIRECTION_ROTATION_Y: Record<Direction, number> = {
  up: 0,
  right: -Math.PI / 2,
  down: Math.PI,
  left: Math.PI / 2
};

function toPositionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
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

// The scene mirrors authoritative state while handling only local aiming and previews.
export function BoardScene() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const snapshot = useGameStore((state) => state.snapshot);
  const sessionId = useGameStore((state) => state.sessionId);
  const selectedToolInstanceId = useGameStore((state) => state.selectedToolInstanceId);
  const setSelectedToolInstanceId = useGameStore((state) => state.setSelectedToolInstanceId);
  const showToolNotice = useGameStore((state) => state.showToolNotice);
  const rollDice = useGameStore((state) => state.rollDice);
  const endTurn = useGameStore((state) => state.endTurn);
  const useInstantTool = useGameStore((state) => state.useInstantTool);
  const useChoiceTool = useGameStore((state) => state.useChoiceTool);
  const performDirectionalAction = useGameStore((state) => state.performDirectionalAction);
  const performTileTargetAction = useGameStore((state) => state.performTileTargetAction);
  const performTileDirectionAction = useGameStore((state) => state.performTileDirectionAction);
  const simulationTimeMs = useGameStore((state) => state.simulationTimeMs);
  const activeActionPresentation = useGameStore((state) => state.activeActionPresentation);
  const activeActionPresentationStartedAtMs = useGameStore(
    (state) => state.activeActionPresentationStartedAtMs
  );
  const actionPresentationQueue = useGameStore((state) => state.actionPresentationQueue);
  const [aimState, setAimState] = useState<AimState | null>(null);
  const [inspectionCard, setInspectionCard] = useState<SceneInspectionCardData | null>(null);
  const [cellEntrySerialByPlayer, setCellEntrySerialByPlayer] = useState<Record<string, number>>({});
  const aimStateRef = useRef<AimState | null>(null);
  const inspectionTimerRef = useRef<number | null>(null);
  const previousPositionsRef = useRef<Record<string, GridPosition>>({});
  const facingByIdRef = useRef<Record<string, Direction>>({});
  const nextCellEntrySerialRef = useRef(1);
  const stackAnimationByIdRef = useRef<
    Record<string, { fromIndex: number; startedAtMs: number; toIndex: number }>
  >({});
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const dragRaycaster = useMemo(() => new Raycaster(), []);
  const dragPointer = useMemo(() => new Vector2(), []);
  const dragIntersection = useMemo(() => new Vector3(), []);

  const myPlayer = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const isPresentationBusy = Boolean(activeActionPresentation || actionPresentationQueue.length);
  const isMyTurn = Boolean(snapshot && sessionId && snapshot.turnInfo.currentPlayerId === sessionId);
  const canInteract = isMyTurn && !isPresentationBusy;
  const selectedTool =
    myPlayer && selectedToolInstanceId ? findToolInstance(myPlayer.tools, selectedToolInstanceId) ?? null : null;
  const selectedAimTool =
    selectedTool &&
    isAimTool(selectedTool.toolId) &&
    canInteract &&
    getToolAvailability(selectedTool, myPlayer?.tools ?? []).usable
      ? selectedTool
      : null;
  const selectedDirectionalTool =
    selectedAimTool && isDirectionalTool(selectedAimTool.toolId) ? selectedAimTool : null;
  const selectedTileDirectionTool =
    selectedAimTool && isTileDirectionTool(selectedAimTool.toolId) ? selectedAimTool : null;
  const isAiming = Boolean(aimState);
  const canShowDirectionArrows = Boolean(
    myPlayer &&
      canInteract &&
      (selectedDirectionalTool || (selectedTileDirectionTool && aimState?.targetMode === "tile_direction"))
  );
  const focusedDirection =
    aimState?.targetMode === "direction" || aimState?.targetMode === "tile_direction"
      ? aimState.direction
      : null;
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
  const displayedPlayers = playbackState.displayedPlayers;
  const displayedSummons = playbackState.displayedSummons;
  const playerStackLayout = useMemo(() => {
    const layout = new Map<string, PlayerStackLayout>();

    if (!snapshot) {
      return layout;
    }

    const groupedPlayers = new Map<string, PlayerSnapshot[]>();

    for (const player of displayedPlayers.filter((entry) => entry.boardVisible)) {
      const displayedPosition = displayedPlayerPositions[player.id] ?? player.position;
      const key = toPositionKey({
        x: Math.round(displayedPosition.x),
        y: Math.round(displayedPosition.y)
      });
      const currentGroup = groupedPlayers.get(key) ?? [];
      currentGroup.push(player);
      groupedPlayers.set(key, currentGroup);
    }

    for (const [, players] of groupedPlayers) {
      const orderedPlayers = [...players].sort((left, right) => {
        const leftSerial = cellEntrySerialByPlayer[left.id] ?? 0;
        const rightSerial = cellEntrySerialByPlayer[right.id] ?? 0;

        if (leftSerial !== rightSerial) {
          return rightSerial - leftSerial;
        }

        return left.id.localeCompare(right.id);
      });

      orderedPlayers.forEach((player, index) => {
        layout.set(player.id, {
          count: orderedPlayers.length,
          index
        });
      });
    }

    return layout;
  }, [cellEntrySerialByPlayer, displayedPlayerPositions, displayedPlayers, snapshot]);
  const renderedPlayers = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    return displayedPlayers
      .filter((player) => player.boardVisible)
      .sort((left, right) => {
      const leftLayout = playerStackLayout.get(left.id) ?? { count: 1, index: 0 };
      const rightLayout = playerStackLayout.get(right.id) ?? { count: 1, index: 0 };

      if (leftLayout.index !== rightLayout.index) {
        return leftLayout.index - rightLayout.index;
      }

      const leftSerial = cellEntrySerialByPlayer[left.id] ?? 0;
      const rightSerial = cellEntrySerialByPlayer[right.id] ?? 0;

      if (leftSerial !== rightSerial) {
        return rightSerial - leftSerial;
      }

        return left.id.localeCompare(right.id);
      });
  }, [cellEntrySerialByPlayer, displayedPlayers, playerStackLayout, snapshot]);
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

  useEffect(() => {
    aimStateRef.current = aimState;
  }, [aimState]);

  useLayoutEffect(() => {
    if (!snapshot) {
      setCellEntrySerialByPlayer({});
      nextCellEntrySerialRef.current = 1;
      return;
    }

    const nextEntrySerials = { ...cellEntrySerialByPlayer };
    const fallbackOrderById = Object.fromEntries(
      snapshot.players.map((player, index) => [player.id, index])
    ) as Record<string, number>;
    const arrivalMsByPlayer = Object.fromEntries(
      (snapshot.latestPresentation?.events ?? []).flatMap((event) => {
        if (event.kind !== "motion" || event.subject.kind !== "player") {
          return [];
        }

        return [[event.subject.playerId, event.startMs + event.durationMs] as const];
      })
    ) as Record<string, number>;
    const playersNeedingEntryUpdate = snapshot.players
      .filter((player) => {
        const previousPosition = previousPositionsRef.current[player.id];

        return (
          !(player.id in nextEntrySerials) ||
          !positionsEqual(previousPosition, player.position)
        );
      })
      .sort(
        (left, right) =>
          (arrivalMsByPlayer[left.id] ?? 0) - (arrivalMsByPlayer[right.id] ?? 0) ||
          (fallbackOrderById[left.id] ?? 0) - (fallbackOrderById[right.id] ?? 0)
      );

    for (const player of playersNeedingEntryUpdate) {
      nextEntrySerials[player.id] = nextCellEntrySerialRef.current;
      nextCellEntrySerialRef.current += 1;
    }

    const nextState = Object.fromEntries(
      snapshot.players.map((player) => [
        player.id,
        nextEntrySerials[player.id] ?? nextCellEntrySerialRef.current++
      ])
    );

    if (!areNumberMapsEqual(cellEntrySerialByPlayer, nextState)) {
      setCellEntrySerialByPlayer(nextState);
    }
  }, [cellEntrySerialByPlayer, snapshot]);

  useEffect(() => {
    if (!snapshot) {
      stackAnimationByIdRef.current = {};
      return;
    }

    const nextAnimations: Record<
      string,
      { fromIndex: number; startedAtMs: number; toIndex: number }
    > = {};

    for (const player of snapshot.players) {
      const nextIndex = playerStackLayout.get(player.id)?.index ?? 0;
      const previousAnimation = stackAnimationByIdRef.current[player.id];

      if (!previousAnimation) {
        nextAnimations[player.id] = {
          fromIndex: nextIndex,
          toIndex: nextIndex,
          startedAtMs: simulationTimeMs
        };
        continue;
      }

      if (previousAnimation.toIndex === nextIndex) {
        nextAnimations[player.id] = previousAnimation;
        continue;
      }

      nextAnimations[player.id] = {
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
  }, [playerStackLayout, simulationTimeMs, snapshot]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    facingByIdRef.current = facingById;
    previousPositionsRef.current = Object.fromEntries(
      snapshot.players.map((player) => [player.id, player.position])
    );
  }, [facingById, snapshot]);

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

  useEffect(() => {
    const clearInspection = () => {
      cancelInspection();
    };

    window.addEventListener("pointerup", clearInspection);
    window.addEventListener("pointercancel", clearInspection);
    window.addEventListener("contextmenu", clearInspection);

    return () => {
      window.removeEventListener("pointerup", clearInspection);
      window.removeEventListener("pointercancel", clearInspection);
      window.removeEventListener("contextmenu", clearInspection);
      clearInspectionTimer(inspectionTimerRef);
    };
  }, []);

  useEffect(() => {
    if (!selectedAimTool || !myPlayer || !canInteract) {
      aimStateRef.current = null;
      setAimState(null);
    }
  }, [canInteract, myPlayer, selectedAimTool]);

  useEffect(() => {
    if (!aimState || !myPlayer || !snapshot || !canInteract) {
      return;
    }

    const [startWorldX, , startWorldZ] = toWorldPosition(
      myPlayer.position,
      snapshot.boardWidth,
      snapshot.boardHeight
    );

    // Pointer movement updates the current aim target without committing the tool.
    const resolveAim = (clientX: number, clientY: number, currentState: AimState) => {
      const screenDelta = Math.hypot(
        clientX - currentState.startClientX,
        clientY - currentState.startClientY
      );

      if (screenDelta < AIM_DRAG_THRESHOLD_PX) {
        if (currentState.targetMode === "direction") {
          return { ...currentState, direction: null };
        }

        if (currentState.targetMode === "tile_direction") {
          return { ...currentState, direction: null, targetPosition: null };
        }

        return { ...currentState, targetPosition: null };
      }

      const projectedPoint = projectClientToGround(
        clientX,
        clientY,
        gl.domElement,
        camera,
        dragRaycaster,
        dragPointer,
        dragPlane,
        dragIntersection
      );

      if (!projectedPoint) {
        if (currentState.targetMode === "direction") {
          return { ...currentState, direction: null };
        }

        if (currentState.targetMode === "tile_direction") {
          return { ...currentState, direction: null, targetPosition: null };
        }

        return { ...currentState, targetPosition: null };
      }

      if (currentState.targetMode === "direction") {
        return {
          ...currentState,
          direction: getDragDirection(projectedPoint.x - startWorldX, projectedPoint.z - startWorldZ)
        };
      }

      if (currentState.targetMode === "tile_direction") {
        const targetPosition = resolveTileAimTarget(
          projectedPoint.x,
          projectedPoint.z,
          currentState.toolId,
          myPlayer.position,
          snapshot.boardWidth,
          snapshot.boardHeight
        );

        if (!targetPosition) {
          return {
            ...currentState,
            direction: null,
            targetPosition: null
          };
        }

        const [targetWorldX, , targetWorldZ] = toWorldPosition(
          targetPosition,
          snapshot.boardWidth,
          snapshot.boardHeight
        );

        return {
          ...currentState,
          direction: getDragDirection(projectedPoint.x - targetWorldX, projectedPoint.z - targetWorldZ),
          targetPosition
        };
      }

      return {
        ...currentState,
        targetPosition: resolveTileAimTarget(
          projectedPoint.x,
          projectedPoint.z,
          currentState.toolId,
          myPlayer.position,
          snapshot.boardWidth,
          snapshot.boardHeight
        )
      };
    };

    // Global move tracking keeps drag aiming alive even when the cursor leaves the canvas.
    const onPointerMove = (event: PointerEvent) => {
      setAimState((currentState) => {
        if (!currentState) {
          return currentState;
        }

        const nextState = resolveAim(event.clientX, event.clientY, currentState);
        aimStateRef.current = nextState;

        return nextState;
      });
    };

    // Releasing the left button commits the current preview target if one is valid.
    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const currentState = aimStateRef.current;

      if (currentState?.targetMode === "direction" && currentState.direction) {
        performDirectionalAction(currentState.direction, currentState.toolInstanceId);
      }

      if (currentState?.targetMode === "tile" && currentState.targetPosition) {
        performTileTargetAction(currentState.targetPosition, currentState.toolInstanceId);
      }

      if (
        currentState?.targetMode === "tile_direction" &&
        currentState.targetPosition &&
        currentState.direction
      ) {
        performTileDirectionAction(
          currentState.targetPosition,
          currentState.direction,
          currentState.toolInstanceId
        );
      }

      aimStateRef.current = null;
      setAimState(null);
    };

    // A single cancel helper keeps right-click cancel behavior consistent across handlers.
    const cancelAim = () => {
      aimStateRef.current = null;
      setAimState(null);
    };

    // Pointer down is watched so right-click can cancel even before the browser menu opens.
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 2) {
        return;
      }

      event.preventDefault();
      cancelAim();
    };

    // Mouse down mirrors the pointer handler for browsers that dispatch cancel paths differently.
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 2) {
        return;
      }

      event.preventDefault();
      cancelAim();
    };

    // Context menu is always suppressed while the board is in interactive mode.
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      cancelAim();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [
    aimState,
    camera,
    canInteract,
    dragIntersection,
    dragPlane,
    dragPointer,
    dragRaycaster,
    gl,
    myPlayer,
    performDirectionalAction,
    performTileDirectionAction,
    performTileTargetAction,
    snapshot
  ]);

  const previewDescriptor = useMemo(() => {
    if (!snapshot || !sessionId || !aimState || !canInteract) {
      return null;
    }

    if (aimState.targetMode === "direction" && aimState.direction) {
      // The board preview uses the shared action resolver so the drag hint
      // matches the authoritative room outcome as closely as possible.
      return buildActionPreview(snapshot, sessionId, {
        toolInstanceId: aimState.toolInstanceId,
        direction: aimState.direction
      });
    }

    if (aimState.targetMode === "tile" && aimState.targetPosition) {
      return buildActionPreview(snapshot, sessionId, {
        toolInstanceId: aimState.toolInstanceId,
        targetPosition: aimState.targetPosition
      });
    }

    if (
      aimState.targetMode === "tile_direction" &&
      aimState.targetPosition &&
      aimState.direction
    ) {
      return buildActionPreview(snapshot, sessionId, {
        toolInstanceId: aimState.toolInstanceId,
        targetPosition: aimState.targetPosition,
        direction: aimState.direction
      });
    }

    return null;
  }, [aimState, canInteract, sessionId, snapshot]);
  const scenePreview = useMemo(
    () => {
      const basePreview = resolveScenePreviewState({
        actor: myPlayer,
        displayedPlayerPositions,
        previewDescriptor,
        sessionId,
        snapshot,
        toolId: aimState?.toolId ?? null
      });

      if (
        aimState?.targetMode === "tile_direction" &&
        aimState.targetPosition &&
        !previewDescriptor &&
        snapshot
      ) {
        const previewKeys = new Set(basePreview.previewKeys);
        previewKeys.add(`${aimState.targetPosition.x},${aimState.targetPosition.y}`);

        return {
          ...basePreview,
          previewKeys
        };
      }

      return basePreview;
    },
    [
      aimState?.targetMode,
      aimState?.toolId,
      aimState && "targetPosition" in aimState ? aimState.targetPosition?.x : null,
      aimState && "targetPosition" in aimState ? aimState.targetPosition?.y : null,
      displayedPlayerPositions,
      myPlayer,
      previewDescriptor,
      sessionId,
      snapshot
    ]
  );

  useLayoutEffect(() => {
    if (!snapshot) {
      return;
    }

    window.watcher_scene_debug = {
      inspectionCard,
      displayedPlayers: Object.fromEntries(
        displayedPlayers.map((player) => {
          const stackLayout = playerStackLayout.get(player.id) ?? { count: 1, index: 0 };
          const stackAnimation = stackAnimationByIdRef.current[player.id];
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
              stackSerial: cellEntrySerialByPlayer[player.id] ?? 0,
              stackIndex: animatedStackIndex,
              stackY: PLAYER_BASE_Y + animatedStackIndex * PLAYER_STACK_STEP_Y
            }
          ];
        })
      ),
      displayedSummons: Object.fromEntries(
        displayedSummons.map((summon) => [summon.instanceId, summon])
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
      )
    };

    return () => {
      window.watcher_scene_debug = undefined;
    };
  }, [
    cellEntrySerialByPlayer,
    displayedPlayers,
    displayedPlayerPositions,
    displayedSummons,
    displayedTiles,
    inspectionCard,
    playerStackLayout,
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

  const currentPlayer =
    displayedPlayers.find((player) => player.id === snapshot.turnInfo.currentPlayerId) ??
    snapshot.players.find((player) => player.id === snapshot.turnInfo.currentPlayerId) ??
    null;
  const currentPlayerDisplayedPosition = currentPlayer
    ? displayedPlayerPositions[currentPlayer.id] ?? currentPlayer.position
    : null;

  // Entering aim mode captures the tool id and starting pointer so drag intent can be derived later.
  const beginAim = (
    tool: TurnToolSnapshot,
    startClientX: number,
    startClientY: number
  ) => {
    const targetMode = getToolDefinition(tool.toolId).targetMode;

    if (targetMode === "instant" || targetMode === "choice") {
      return;
    }

    const nextState: AimState =
      targetMode === "direction"
        ? {
            toolId: tool.toolId,
            toolInstanceId: tool.instanceId,
            targetMode,
            direction: null,
            startClientX,
            startClientY
          }
        : targetMode === "tile_direction"
          ? {
              toolId: tool.toolId,
              toolInstanceId: tool.instanceId,
              targetMode,
              direction: null,
              targetPosition: null,
              startClientX,
              startClientY
            }
          : {
            toolId: tool.toolId,
            toolInstanceId: tool.instanceId,
            targetMode,
            targetPosition: null,
            startClientX,
            startClientY
          };

    aimStateRef.current = nextState;
    setSelectedToolInstanceId(tool.instanceId);
    setAimState(nextState);
  };

  const cancelInspection = () => {
    clearInspectionTimer(inspectionTimerRef);
    setInspectionCard(null);
  };

  // Long-press inspection waits briefly so normal taps do not spawn scene cards.
  const queueInspection = (nextInspectionCard: SceneInspectionCardData) => {
    clearInspectionTimer(inspectionTimerRef);
    inspectionTimerRef.current = window.setTimeout(() => {
      setInspectionCard(nextInspectionCard);
      inspectionTimerRef.current = null;
    }, INSPECTION_HOLD_DELAY_MS);
  };

  // The local piece acts as the primary drag handle for directional and tile-target tools.
  const handlePiecePointerDown = (
    player: PlayerSnapshot,
    event: ThreeEvent<PointerEvent>
  ) => {
    if (
      player.id === sessionId &&
      selectedAimTool &&
      myPlayer &&
      canInteract
    ) {
      event.stopPropagation();
      cancelInspection();
      beginAim(
        selectedAimTool,
        event.nativeEvent.clientX,
        event.nativeEvent.clientY
      );
      return;
    }

    event.stopPropagation();
    queueInspection(describePlayerInspection(player));
  };

  const handleTilePointerDown = (
    tile: typeof displayedTiles[number],
    event: ThreeEvent<PointerEvent>
  ) => {
    if (aimStateRef.current) {
      return;
    }

    event.stopPropagation();
    queueInspection(describeTileInspection(tile));
  };

  const handleSummonPointerDown = (
    summon: SummonSnapshot,
    event: ThreeEvent<PointerEvent>
  ) => {
    if (aimStateRef.current) {
      return;
    }

    event.stopPropagation();
    queueInspection(describeSummonInspection(summon));
  };

  return (
    <>
      <color attach="background" args={["#f3ead9"]} />
      <ambientLight intensity={0.85} />
      <directionalLight
        castShadow
        intensity={1.35}
        position={[6, 12, 4]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <mesh position={[0, -0.7, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[snapshot.boardWidth + 2, snapshot.boardHeight + 2]} />
        <meshStandardMaterial color="#d7d8c6" />
      </mesh>

      {displayedTiles.map((tile) => (
        <BoardTileVisual
          key={tile.key}
          tile={tile}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          onPointerDown={(event) => handleTilePointerDown(tile, event)}
          previewActive={scenePreview.previewKeys.has(tile.key)}
          previewColor={scenePreview.previewColor}
          previewVariant={scenePreview.previewVariant}
        />
      ))}
      {scenePreview.wallGhostPositions.map((position) => (
        <PreviewWallGhostAsset
          key={`preview-wall-${position.x}-${position.y}`}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          position={position}
          color={scenePreview.previewColor}
        />
      ))}
      {displayedSummons.map((summon) => {
        const ownerColor =
          snapshot.players.find((player) => player.id === summon.ownerId)?.color ?? "#8d7a3d";

        return (
          <SummonVisual
            key={summon.instanceId}
            summon={summon}
            boardWidth={snapshot.boardWidth}
            boardHeight={snapshot.boardHeight}
            color={ownerColor}
            onPointerDown={(event) => handleSummonPointerDown(summon, event)}
          />
        );
      })}
      {scenePreview.summonPreviews.map((preview) => (
        <SummonVisual
          key={preview.key}
          summon={preview.summon}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          color={preview.color}
          {...(preview.opacity !== undefined ? { opacity: preview.opacity } : {})}
        />
      ))}

      {renderedPlayers.map((player, index) => {
        const activeMotion = playbackState.playerMotions[player.id] ?? null;
        const displayedGridPosition = displayedPlayerPositions[player.id] ?? player.position;
        const [x, , z] = toWorldPositionFromGrid(
          displayedGridPosition.x,
          displayedGridPosition.y,
          snapshot.boardWidth,
          snapshot.boardHeight
        );
        const isActive = player.id === snapshot.turnInfo.currentPlayerId;
        const isMe = player.id === sessionId;
        const stackLayout = playerStackLayout.get(player.id) ?? { count: 1, index: 0 };
        const stackAnimation = stackAnimationByIdRef.current[player.id];
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
        const pieceRotationY =
          DIRECTION_ROTATION_Y[facingDirection] +
          (activeMotion?.motionStyle === "finish" ? activeMotion.progress * Math.PI * 6 : 0);
        const activeRingColor = mixSceneColor(player.color, "#fff4ce", 0.5);
        const directionArrowPosition: [number, number, number] =
          isMe &&
          aimState?.targetMode === "tile_direction" &&
          aimState.targetPosition &&
          isTileDirectionTool(aimState.toolId)
            ? [
                aimState.targetPosition.x - displayedGridPosition.x,
                0.02,
                aimState.targetPosition.y - displayedGridPosition.y
              ]
            : [0, 0.02, 0];

        return (
          <group
            key={player.id}
            position={[x, 0, z]}
            renderOrder={20 + Math.round(animatedStackIndex * 10)}
          >
            {isActive ? (
              <SceneActionRing
                hidden={isAiming && isMe}
                interactive={isMe && canInteract}
                tools={player.tools}
                phase={snapshot.turnInfo.phase}
                position={[0, pieceTopY + 0.7, 0]}
                screenOffsetX={actionRingOffset.x}
                screenOffsetY={actionRingOffset.y}
                selectedToolInstanceId={isMe ? selectedToolInstanceId : null}
                onEndTurn={isMe && canInteract ? endTurn : () => {}}
                onPressAimTool={(toolInstanceId, clientX, clientY) => {
                  if (!isMe || !canInteract) {
                    return;
                  }

                  const tool = findToolInstance(player.tools, toolInstanceId);

                  if (tool && isAimTool(tool.toolId)) {
                    beginAim(tool, clientX, clientY);
                  }
                }}
                onRollDice={isMe && canInteract ? rollDice : () => {}}
                onSelectTool={isMe && canInteract ? setSelectedToolInstanceId : () => {}}
                onShowUnavailableToolNotice={isMe && canInteract ? showToolNotice : () => {}}
                onUseChoiceTool={isMe && canInteract ? useChoiceTool : () => {}}
                onUseInstantTool={isMe && canInteract ? useInstantTool : () => {}}
              />
            ) : null}
            {isMe && canShowDirectionArrows && (selectedDirectionalTool || selectedTileDirectionTool) ? (
              <SceneDirectionArrows
                actionId={(selectedDirectionalTool ?? selectedTileDirectionTool)!.toolId}
                activeDirection={focusedDirection}
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
              position={[0, pieceBaseY, 0]}
              rotationY={pieceRotationY}
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

      {scenePreview.landingRings.map((ring) => (
        <PreviewRingAsset
          key={ring.key}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          color={scenePreview.previewColor}
          opacity={ring.opacity}
          position={ring.position}
          radius={ring.radius}
        />
      ))}

      <SceneInspectionCard inspection={inspectionCard} />

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
