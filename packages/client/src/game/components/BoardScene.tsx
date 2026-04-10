import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, Plane, Raycaster, Vector2, Vector3 } from "three";
import {
  findToolInstance,
  getToolAvailability,
  type Direction,
  type GridPosition,
  type PlayerSnapshot,
  type PresentationMotionStyle,
  type SummonSnapshot,
  type TileDefinition,
  type TurnToolSnapshot
} from "@watcher/shared";
import { CurrentTurnMarkerAsset } from "../assets/player/CurrentTurnMarkerAsset";
import { PlayerHaloAsset } from "../assets/player/PlayerHaloAsset";
import { EffectVisual } from "../assets/presentation/EffectVisual";
import { LinkReactionVisual } from "../assets/presentation/LinkReactionVisual";
import { ProjectileVisual } from "../assets/presentation/ProjectileVisual";
import { toWorldPositionFromGrid } from "../assets/shared/gridPlacement";
import { SummonVisual } from "../assets/summons/SummonVisual";
import { PreviewRingAsset } from "../assets/tools/shared/PreviewRingAsset";
import { ToolEffectPreview } from "../assets/tools/shared/ToolEffectPreview";
import { evaluatePlaybackEngine } from "../animation/playbackEngine";
import { projectClientToGround } from "../interaction/aiming";
import { resolveScenePreviewState } from "../interaction/previewState";
import {
  applyToolInteractionChoice,
  beginToolInteractionPointer,
  buildToolInteractionPreviewPayload,
  clearToolInteractionDraft,
  createToolInteractionSession,
  finalizeToolInteractionStage,
  getToolInteractionCaption,
  getToolInteractionChoiceOptions,
  getToolInteractionDirectionState,
  getToolInteractionTargetPosition,
  hasToolInteractionPreviewPayload,
  isChoiceStageActive,
  isInstantInteractionTool,
  isPointerStageActive,
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
import { useGameStore } from "../state/useGameStore";
import { SceneActionRing } from "./SceneInteractionHud";
import { SceneInspectionCard } from "./SceneInspectionCard";
import { SceneDirectionArrows } from "./SceneDirectionArrows";
import { PetPiece } from "./PetPiece";
import { BoardStaticTileLayer, BoardTileSelectionLayer } from "./BoardStaticTileLayer";
import {
  buildActionPreview,
  toWorldPosition
} from "../utils/boardMath";

interface SceneHudOffset {
  x: number;
  y: number;
}

interface PlayerStackLayout {
  count: number;
  index: number;
}

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

function getPlayerPresentationPose(
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
  const useToolPayload = useGameStore((state) => state.useToolPayload);
  const simulationTimeMs = useGameStore((state) => state.simulationTimeMs);
  const activeActionPresentation = useGameStore((state) => state.activeActionPresentation);
  const activeActionPresentationStartedAtMs = useGameStore(
    (state) => state.activeActionPresentationStartedAtMs
  );
  const actionPresentationQueue = useGameStore((state) => state.actionPresentationQueue);
  const [interactionSession, setInteractionSession] = useState<ToolInteractionSession | null>(null);
  const [inspectionCard, setInspectionCard] = useState<SceneInspectionCardData | null>(null);
  const [cellEntrySerialByPlayer, setCellEntrySerialByPlayer] = useState<Record<string, number>>({});
  const interactionSessionRef = useRef<ToolInteractionSession | null>(null);
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
  const selectedInteractiveTool =
    selectedTool &&
    !isInstantInteractionTool(selectedTool.toolId) &&
    canInteract &&
    getToolAvailability(selectedTool, myPlayer?.tools ?? []).usable
      ? selectedTool
      : null;
  const directionState =
    interactionSession && myPlayer
      ? getToolInteractionDirectionState(interactionSession, myPlayer.position)
      : null;
  const isPointerInteractionActive = Boolean(interactionSession?.pointerActive);
  const canShowDirectionArrows = Boolean(
    myPlayer &&
      canInteract &&
      selectedInteractiveTool &&
      directionState
  );
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
  const snapshotPlayersById = useMemo(
    () =>
      new Map(
        (snapshot?.players ?? []).map((player) => [player.id, player] as const)
      ),
    [snapshot]
  );
  const showActionRingArc = !isPresentationBusy && !shouldHideToolInteractionArc(interactionSession);
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
    interactionSessionRef.current = interactionSession;
  }, [interactionSession]);

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

  const cancelInspection = useCallback(() => {
    clearInspectionTimer(inspectionTimerRef);
    setInspectionCard(null);
  }, []);

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

  const startToolInteractionPointer = useCallback(
    (tool: TurnToolSnapshot, clientX: number, clientY: number) => {
      if (!snapshot || !myPlayer || !canInteract || isInstantInteractionTool(tool.toolId)) {
        return;
      }

      const currentSession = interactionSessionRef.current;
      const baseSession =
        currentSession && currentSession.toolInstanceId === tool.instanceId
          ? currentSession
          : createToolInteractionSession(tool);
      const nextSession = updateToolInteractionFromPointer(beginToolInteractionPointer(baseSession), {
        actorPosition: myPlayer.position,
        boardHeight: snapshot.boardHeight,
        boardWidth: snapshot.boardWidth,
        pointerWorld: projectPointerToGround(clientX, clientY)
      });

      interactionSessionRef.current = nextSession;
      setSelectedToolInstanceId(tool.instanceId);
      setInteractionSession(nextSession);
      cancelInspection();
    },
    [cancelInspection, canInteract, myPlayer, projectPointerToGround, setSelectedToolInstanceId, snapshot]
  );

  const startSelectedInteractionPointer = useCallback(
    (clientX: number, clientY: number): boolean => {
      if (!selectedInteractiveTool) {
        return false;
      }

      startToolInteractionPointer(selectedInteractiveTool, clientX, clientY);
      return true;
    },
    [selectedInteractiveTool, startToolInteractionPointer]
  );

  useEffect(() => {
    if (!selectedInteractiveTool || !myPlayer || !canInteract) {
      interactionSessionRef.current = null;
      setInteractionSession(null);
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
  }, [canInteract, myPlayer, selectedInteractiveTool]);

  useEffect(() => {
    if (!snapshot || !myPlayer || !canInteract) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const currentSession = interactionSessionRef.current;

      if (!currentSession?.pointerActive) {
        return;
      }

      const nextSession = updateToolInteractionFromPointer(currentSession, {
        actorPosition: myPlayer.position,
        boardHeight: snapshot.boardHeight,
        boardWidth: snapshot.boardWidth,
        pointerWorld: projectPointerToGround(event.clientX, event.clientY)
      });

      interactionSessionRef.current = nextSession;
      setInteractionSession(nextSession);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const currentSession = interactionSessionRef.current;

      if (!currentSession?.pointerActive) {
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
    };

    const cancelInteraction = () => {
      interactionSessionRef.current = null;
      setInteractionSession(null);
      setSelectedToolInstanceId(null);
      cancelInspection();
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
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      cancelInteraction();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("contextmenu", onContextMenu);
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
    setSelectedToolInstanceId,
    snapshot,
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
      ),
      playback: {
        activePresentationSequence: activeActionPresentation?.sequence ?? null,
        activePlayerMotionCount: Object.keys(playbackState.playerMotions).length,
        activeProjectileCount: playbackState.projectiles.length,
        activeReactionCount: playbackState.reactions.length,
        queuedPresentationCount: actionPresentationQueue.length
      },
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
    cellEntrySerialByPlayer,
    actionPresentationQueue.length,
    activeActionPresentation,
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

  // Long-press inspection waits briefly so normal taps do not spawn scene cards.
  const queueInspection = useCallback((nextInspectionCard: SceneInspectionCardData) => {
    clearInspectionTimer(inspectionTimerRef);
    inspectionTimerRef.current = window.setTimeout(() => {
      setInspectionCard(nextInspectionCard);
      inspectionTimerRef.current = null;
    }, INSPECTION_HOLD_DELAY_MS);
  }, []);

  const canStartScenePointerInteraction = Boolean(
    canInteract &&
      myPlayer &&
      interactionSession &&
      isPointerStageActive(interactionSession) &&
      !interactionSession.pointerActive
  );

  const handlePiecePointerDown = useCallback(
    (player: PlayerSnapshot, event: ThreeEvent<PointerEvent>) => {
      if (canStartScenePointerInteraction) {
        event.stopPropagation();
        cancelInspection();
        if (startSelectedInteractionPointer(event.nativeEvent.clientX, event.nativeEvent.clientY)) {
          return;
        }
      }

      event.stopPropagation();
      queueInspection(describePlayerInspection(player));
    },
    [canStartScenePointerInteraction, cancelInspection, queueInspection, startSelectedInteractionPointer]
  );

  const handleTilePointerDown = useCallback(
    (tile: TileDefinition, event: ThreeEvent<PointerEvent>) => {
      if (canStartScenePointerInteraction) {
        event.stopPropagation();
        cancelInspection();
        if (startSelectedInteractionPointer(event.nativeEvent.clientX, event.nativeEvent.clientY)) {
          return;
        }
      }

      event.stopPropagation();
      queueInspection(describeTileInspection(tile));
    },
    [canStartScenePointerInteraction, cancelInspection, queueInspection, startSelectedInteractionPointer]
  );

  const handleSummonPointerDown = useCallback(
    (summon: SummonSnapshot, event: ThreeEvent<PointerEvent>) => {
      if (canStartScenePointerInteraction) {
        event.stopPropagation();
        cancelInspection();
        if (startSelectedInteractionPointer(event.nativeEvent.clientX, event.nativeEvent.clientY)) {
          return;
        }
      }

      event.stopPropagation();
      queueInspection(describeSummonInspection(summon));
    },
    [canStartScenePointerInteraction, cancelInspection, queueInspection, startSelectedInteractionPointer]
  );

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

      <BoardStaticTileLayer
        boardHeight={snapshot.boardHeight}
        boardWidth={snapshot.boardWidth}
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

      {renderedPlayers.map((player, index) => {
        const snapshotPlayer = snapshotPlayersById.get(player.id) ?? player;
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
        const playerPose = getPlayerPresentationPose(
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
            key={player.id}
            position={[x, 0, z]}
            renderOrder={20 + Math.round(animatedStackIndex * 10)}
          >
            {isActive ? (
              <SceneActionRing
                caption={isMe && selectedInteractiveTool ? getToolInteractionCaption(selectedInteractiveTool, interactionSession) : null}
                choiceOptions={isMe ? getToolInteractionChoiceOptions(interactionSession) : []}
                hidden={isPointerInteractionActive && isMe}
                interactive={isMe && canInteract}
                tools={snapshotPlayer.tools}
                phase={snapshot.turnInfo.phase}
                position={[0, pieceTopY + 0.7, 0]}
                screenOffsetX={actionRingOffset.x}
                screenOffsetY={actionRingOffset.y}
                selectedToolInstanceId={isMe ? selectedToolInstanceId : null}
                showArc={!isMe || showActionRingArc}
                onBeginPointerTool={(toolInstanceId, clientX, clientY) => {
                  if (!isMe || !canInteract) {
                    return;
                  }

                  const tool = findToolInstance(snapshotPlayer.tools, toolInstanceId);

                  if (tool) {
                    startToolInteractionPointer(tool, clientX, clientY);
                  }
                }}
                onCommitChoice={(toolInstanceId, choiceId) => {
                  if (!isMe || !canInteract) {
                    return;
                  }

                  const currentSession = interactionSessionRef.current;

                  if (
                    !currentSession ||
                    currentSession.toolInstanceId !== toolInstanceId ||
                    !isChoiceStageActive(currentSession)
                  ) {
                    return;
                  }

                  const result = applyToolInteractionChoice(currentSession, choiceId);

                  if (result.kind === "execute" && result.payload) {
                    const didSend = useToolPayload(result.payload, toolInstanceId);

                    if (didSend) {
                      interactionSessionRef.current = null;
                      setInteractionSession(null);
                      return;
                    }
                  }

                  interactionSessionRef.current = result.session;
                  setInteractionSession(result.session);
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
