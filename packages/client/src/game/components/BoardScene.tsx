import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Plane, Raycaster, Vector2, Vector3 } from "three";
import {
  findToolInstance,
  getToolAvailability,
  getToolDefinition,
  isAimTool,
  isDirectionalTool,
  isTileTargetTool,
  type Direction,
  type GridPosition,
  type PlayerSnapshot,
  type TileDefinition,
  type ToolId,
  type ToolTargetMode,
  type TurnToolSnapshot
} from "@watcher/shared";
import { getActionUiConfig } from "../config/actionUi";
import { useGameStore } from "../state/useGameStore";
import { SceneActionRing } from "./SceneInteractionHud";
import { SceneDirectionArrows } from "./SceneDirectionArrows";
import { PetPiece } from "./PetPiece";
import {
  buildActionPreview,
  clampGridPositionToBoard,
  toGridPositionFromWorld,
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

type AimState = DirectionAimState | TileAimState;

interface SceneHudOffset {
  x: number;
  y: number;
}

interface PlayerStackLayout {
  count: number;
  index: number;
}

type PreviewVariant = "tile" | "blast";

const AIM_DRAG_THRESHOLD_PX = 14;
const PLAYER_STACK_STEP_Y = 0.88;
const PLAYER_BASE_Y = -0.28;
const DIRECTION_ROTATION_Y: Record<Direction, number> = {
  up: 0,
  right: -Math.PI / 2,
  down: Math.PI,
  left: Math.PI / 2
};

function toPositionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
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

// Dragging resolves to one cardinal direction once the pointer leaves a dead zone.
function getDragDirection(deltaX: number, deltaZ: number): Direction | null {
  const threshold = 0.24;

  if (Math.abs(deltaX) < threshold && Math.abs(deltaZ) < threshold) {
    return null;
  }

  if (Math.abs(deltaX) >= Math.abs(deltaZ)) {
    return deltaX >= 0 ? "right" : "left";
  }

  return deltaZ >= 0 ? "down" : "up";
}

function getActionRingOffset(_playerX: number, _playerY: number, _boardWidth: number, _boardHeight: number): SceneHudOffset {
  return { x: 0, y: 0 };
}

// The aiming system projects screen coordinates onto the board plane before snapping.
function projectClientToGround(
  clientX: number,
  clientY: number,
  domElement: HTMLCanvasElement,
  camera: Camera,
  raycaster: Raycaster,
  pointer: Vector2,
  plane: Plane,
  intersection: Vector3
): { x: number; z: number } | null {
  const bounds = domElement.getBoundingClientRect();

  if (!bounds.width || !bounds.height) {
    return null;
  }

  if (
    clientX < bounds.left ||
    clientX > bounds.right ||
    clientY < bounds.top ||
    clientY > bounds.bottom
  ) {
    return null;
  }

  pointer.set(
    ((clientX - bounds.left) / bounds.width) * 2 - 1,
    -(((clientY - bounds.top) / bounds.height) * 2 - 1)
  );
  raycaster.setFromCamera(pointer, camera);

  if (!raycaster.ray.intersectPlane(plane, intersection)) {
    return null;
  }

  return {
    x: intersection.x,
    z: intersection.z
  };
}

// Tile-target tools clamp to a single axis so drag intent stays predictable.
function getTileAimTarget(
  worldX: number,
  worldZ: number,
  toolId: ToolId,
  actorPosition: GridPosition,
  boardWidth: number,
  boardHeight: number
): GridPosition | null {
  const targetingMode = getToolDefinition(toolId).tileTargeting ?? "board_any";
  const snappedPointer = clampGridPositionToBoard(
    toGridPositionFromWorld(worldX, worldZ, boardWidth, boardHeight),
    boardWidth,
    boardHeight
  );
  const deltaX = snappedPointer.x - actorPosition.x;
  const deltaY = snappedPointer.y - actorPosition.y;

  if (targetingMode === "axis_line") {
    if (!deltaX && !deltaY) {
      return null;
    }

    if (Math.abs(deltaX) >= Math.abs(deltaY) && deltaX !== 0) {
      return {
        x: snappedPointer.x,
        y: actorPosition.y
      };
    }

    if (deltaY !== 0) {
      return {
        x: actorPosition.x,
        y: snappedPointer.y
      };
    }

    return null;
  }

  if (targetingMode === "adjacent_ring") {
    const clampedX = Math.max(-1, Math.min(1, deltaX));
    const clampedY = Math.max(-1, Math.min(1, deltaY));

    if (!clampedX && !clampedY) {
      return null;
    }

    return {
      x: actorPosition.x + clampedX,
      y: actorPosition.y + clampedY
    };
  }

  return deltaX || deltaY ? snappedPointer : null;
}

// Conveyor tiles render their direction directly on the board surface.
function ConveyorArrow({ direction, color = "#6db0c6" }: { direction: Direction; color?: string }) {
  return (
    <group rotation={[0, DIRECTION_ROTATION_Y[direction], 0]}>
      <mesh position={[0, -0.2, -0.3]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.2]}>
        <coneGeometry args={[0.27, 0.2, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.2]}>
        <coneGeometry args={[0.27, 0.2, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.2, 0.3]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.2]}>
        <coneGeometry args={[0.27, 0.2, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// Lucky blocks use a bright placeholder shape until final art arrives.
function LuckyBlock() {
  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, -0.1, 0]} castShadow>
        <boxGeometry args={[0.48, 0.34, 0.48]} />
        <meshStandardMaterial color="#f1cc59" emissive="#8a6d10" emissiveIntensity={0.34} />
      </mesh>
      <mesh position={[0, -0.07, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.15]} />
        <meshStandardMaterial color="#fff5c9" emissive="#b7931d" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, -0.07, 0]}>
        <boxGeometry args={[0.15, 0.3, 0.5]} />
        <meshStandardMaterial color="#fff5c9" emissive="#b7931d" emissiveIntensity={0.4} />
      </mesh>
      {/* <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.28, 28]} />
        <meshBasicMaterial color="#ffe596" transparent opacity={0.72} />
      </mesh> */}
    </group>
  );
}

// Pit tiles sink below the floor so the hazard reads clearly from the camera angle.
function PitDecoration() {
  return (
    <group position={[0, -0.22, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.42, 36]} />
        <meshBasicMaterial color="#5b4b46" transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial color="#171418" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.46, 36]} />
        <meshBasicMaterial color="#9a7162" transparent opacity={0.42} />
      </mesh>
    </group>
  );
}

// Rocket previews need a stronger marker so the full blast radius reads at a glance.
function BlastPreviewMarker({ color }: { color: string }) {
  return (
    <group>

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[1.1, 1.1]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.34} />
      </mesh>

      {/* <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <ringGeometry args={[0.34, 0.47, 4]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.94} />
      </mesh> */}
      {/* <mesh position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.31, 28]} />
        <meshBasicMaterial color="#fff3ed" toneMapped={false} transparent opacity={0.78} />
      </mesh> */}
      {/* <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 18]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.92} />
      </mesh> */}
    </group>
  );
}

// Each tile mesh derives its placeholder style from the shared tile definition.
function Tile({
  tile,
  boardWidth,
  boardHeight,
  previewActive,
  previewColor,
  previewVariant
}: {
  tile: TileDefinition;
  boardWidth: number;
  boardHeight: number;
  previewActive: boolean;
  previewColor: string;
  previewVariant: PreviewVariant;
}) {
  const [x, , z] = toWorldPosition({ x: tile.x, y: tile.y }, boardWidth, boardHeight);
  const height =
    tile.type === "wall"
      ? 1.15
      : tile.type === "earthWall"
        ? 0.7 : 0.22;
  const color =
    tile.type === "wall"
      ? "#455062"
      : tile.type === "earthWall"
        ? "#bc7441"
        : tile.type === "pit"
          ? "#8b705f"
          : tile.type === "lucky"
            ? "#d6bf70"
            : tile.type === "conveyor"
              ? "#b8c7cd"
              : "#d5c6a1";

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2 - 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.96, height, 0.96]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {tile.type === "pit" ? <PitDecoration /> : null}
      {tile.type === "lucky" ? <LuckyBlock /> : null}
      {tile.type === "conveyor" && tile.direction ? <ConveyorArrow direction={tile.direction} /> : null}
      {previewActive ? (
        <group position={[0, -0.26, 0]}>
          {previewVariant === "blast" ? (
            <BlastPreviewMarker color={previewColor} />
          ) : (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.82, 0.82]} />
              <meshBasicMaterial color={previewColor} transparent opacity={0.58} />
            </mesh>
          )}
        </group>
      ) : null}
    </group>
  );
}

// Preview rings mark projected landings and target hits in world space.
function PreviewRing({
  boardWidth,
  boardHeight,
  color,
  opacity,
  position,
  radius
}: {
  boardWidth: number;
  boardHeight: number;
  color: string;
  opacity: number;
  position: GridPosition;
  radius: number;
}) {
  const [x, , z] = toWorldPosition(position, boardWidth, boardHeight);

  return (
    <group position={[x, -0.27, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.08, radius, 40]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius - 0.12, 28]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.26} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius - 0.12, 0.028, 12, 36]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.84} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 20]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.48} />
      </mesh>
    </group>
  );
}

// Wall ghosts show where a build action will place a new earth wall.
function PreviewWallGhost({
  boardWidth,
  boardHeight,
  position,
  color
}: {
  boardWidth: number;
  boardHeight: number;
  position: GridPosition;
  color: string;
}) {
  const [x, , z] = toWorldPosition(position, boardWidth, boardHeight);

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, -0.15, 0]} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial color={color} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.34, 28]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </group>
  );
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
  const performDirectionalAction = useGameStore((state) => state.performDirectionalAction);
  const performTileTargetAction = useGameStore((state) => state.performTileTargetAction);
  const simulationTimeMs = useGameStore((state) => state.simulationTimeMs);
  const [aimState, setAimState] = useState<AimState | null>(null);
  const aimStateRef = useRef<AimState | null>(null);
  const previousPositionsRef = useRef<Record<string, GridPosition>>({});
  const facingByIdRef = useRef<Record<string, Direction>>({});
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const dragRaycaster = useMemo(() => new Raycaster(), []);
  const dragPointer = useMemo(() => new Vector2(), []);
  const dragIntersection = useMemo(() => new Vector3(), []);

  const myPlayer = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const isMyTurn =
    Boolean(snapshot && sessionId && snapshot.turnInfo.currentPlayerId === sessionId) &&
    snapshot?.turnInfo.phase === "action";
  const selectedTool =
    myPlayer && selectedToolInstanceId ? findToolInstance(myPlayer.tools, selectedToolInstanceId) ?? null : null;
  const selectedAimTool =
    selectedTool &&
    isAimTool(selectedTool.toolId) &&
    getToolAvailability(selectedTool, myPlayer?.tools ?? []).usable
      ? selectedTool
      : null;
  const selectedDirectionalTool =
    selectedAimTool && isDirectionalTool(selectedAimTool.toolId) ? selectedAimTool : null;
  const isAiming = Boolean(aimState);
  const canShowDirectionArrows = Boolean(myPlayer && isMyTurn && selectedDirectionalTool);
  const focusedDirection = aimState?.targetMode === "direction" ? aimState.direction : null;
  const playerStackLayout = useMemo(() => {
    const layout = new Map<string, PlayerStackLayout>();

    if (!snapshot) {
      return layout;
    }

    const groupedPlayers = new Map<string, PlayerSnapshot[]>();

    for (const player of snapshot.players) {
      const key = toPositionKey(player.position);
      const currentGroup = groupedPlayers.get(key) ?? [];
      currentGroup.push(player);
      groupedPlayers.set(key, currentGroup);
    }

    for (const [, players] of groupedPlayers) {
      const orderedPlayers = [...players].sort((left, right) => {
        const leftScore =
          Number(left.id === snapshot.turnInfo.currentPlayerId) + Number(left.id === sessionId);
        const rightScore =
          Number(right.id === snapshot.turnInfo.currentPlayerId) + Number(right.id === sessionId);

        return leftScore - rightScore;
      });

      orderedPlayers.forEach((player, index) => {
        layout.set(player.id, {
          count: orderedPlayers.length,
          index
        });
      });
    }

    return layout;
  }, [sessionId, snapshot]);
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
    if (!selectedAimTool || !myPlayer || !isMyTurn) {
      aimStateRef.current = null;
      setAimState(null);
    }
  }, [isMyTurn, myPlayer, selectedAimTool]);

  useEffect(() => {
    if (!aimState || !myPlayer || !snapshot || !isMyTurn) {
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
        return currentState.targetMode === "direction"
          ? { ...currentState, direction: null }
          : { ...currentState, targetPosition: null };
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
        return currentState.targetMode === "direction"
          ? { ...currentState, direction: null }
          : { ...currentState, targetPosition: null };
      }

      if (currentState.targetMode === "direction") {
        return {
          ...currentState,
          direction: getDragDirection(projectedPoint.x - startWorldX, projectedPoint.z - startWorldZ)
        };
      }

      return {
        ...currentState,
        targetPosition: getTileAimTarget(
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
    dragIntersection,
    dragPlane,
    dragPointer,
    dragRaycaster,
    gl,
    isMyTurn,
    myPlayer,
    performDirectionalAction,
    performTileTargetAction,
    snapshot
  ]);

  const previewResolution = useMemo(() => {
    if (!snapshot || !sessionId || !aimState) {
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

    return null;
  }, [aimState, sessionId, snapshot]);

  const previewKeys = useMemo(() => {
    return new Set(
      previewResolution?.previewTiles.map((position) => `${position.x},${position.y}`) ?? []
    );
  }, [previewResolution]);

  const previewColor =
    aimState?.toolId === "rocket"
      ? "#f15a49"
      : aimState
        ? getActionUiConfig(aimState.toolId).accent
        : "#6abf69";
  const previewVariant: PreviewVariant = aimState?.toolId === "rocket" ? "blast" : "tile";
  const previewLandingPosition =
    myPlayer &&
    previewResolution?.kind === "applied" &&
    (previewResolution.actor.position.x !== myPlayer.position.x ||
      previewResolution.actor.position.y !== myPlayer.position.y)
      ? previewResolution.actor.position
      : null;
  const previewHookedPlayerPositions =
    snapshot &&
    aimState?.toolId === "hookshot" &&
    previewResolution?.kind === "applied" &&
    previewResolution.affectedPlayers.length
      ? previewResolution.affectedPlayers.flatMap((affectedPlayer) => {
          const player = snapshot.players.find((entry) => entry.id === affectedPlayer.playerId);

          return player ? [player.position] : [];
        })
      : [];
  const previewWallPositions =
    snapshot &&
    previewResolution?.kind === "applied"
      ? previewResolution.tileMutations
          .filter((mutation) => mutation.nextType === "earthWall")
          .map((mutation) => mutation.position)
      : [];

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
    snapshot.players.find((player) => player.id === snapshot.turnInfo.currentPlayerId) ?? null;

  // Entering aim mode captures the tool id and starting pointer so drag intent can be derived later.
  const beginAim = (
    tool: TurnToolSnapshot,
    startClientX: number,
    startClientY: number
  ) => {
    const targetMode = getToolDefinition(tool.toolId).targetMode;

    if (targetMode === "instant") {
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

  // The local piece acts as the primary drag handle for directional and tile-target tools.
  const handlePiecePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!selectedAimTool || !myPlayer || !isMyTurn) {
      return;
    }

    event.stopPropagation();
    beginAim(
      selectedAimTool,
      event.nativeEvent.clientX,
      event.nativeEvent.clientY
    );
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

      {snapshot.tiles.map((tile) => (
        <Tile
          key={tile.key}
          tile={tile}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          previewActive={previewKeys.has(tile.key)}
          previewColor={previewColor}
          previewVariant={previewVariant}
        />
      ))}
      {previewWallPositions.map((position) => (
        <PreviewWallGhost
          key={`preview-wall-${position.x}-${position.y}`}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          position={position}
          color={previewColor}
        />
      ))}

      {snapshot.players.map((player, index) => {
        const [x, , z] = toWorldPosition(player.position, snapshot.boardWidth, snapshot.boardHeight);
        const isActive = player.id === snapshot.turnInfo.currentPlayerId;
        const isMe = player.id === sessionId;
        const pointerProps = isMe ? { onPointerDown: handlePiecePointerDown } : {};
        const stackLayout = playerStackLayout.get(player.id) ?? { count: 1, index: 0 };
        const actionRingOffset = getActionRingOffset(
          player.position.x,
          player.position.y,
          snapshot.boardWidth,
          snapshot.boardHeight
        );
        const bob = isActive && isMe ? 0 : Math.sin(simulationTimeMs / 450 + index) * 0.05;
        const pieceBaseY = PLAYER_BASE_Y + stackLayout.index * PLAYER_STACK_STEP_Y + bob;
        const pieceTopY = pieceBaseY + 0.96;
        const facingDirection = facingById[player.id] ?? "down";

        return (
          <group key={player.id} position={[x, 0, z]}>
            {isMe && snapshot.turnInfo.currentPlayerId === sessionId && !isAiming ? (
              <SceneActionRing
                tools={player.tools}
                phase={snapshot.turnInfo.phase}
                position={[0, pieceTopY + 0.7, 0]}
                screenOffsetX={actionRingOffset.x}
                screenOffsetY={actionRingOffset.y}
                selectedToolInstanceId={selectedToolInstanceId}
                onEndTurn={endTurn}
                onPressAimTool={(toolInstanceId, clientX, clientY) => {
                  const tool = findToolInstance(player.tools, toolInstanceId);

                  if (tool && isAimTool(tool.toolId)) {
                    beginAim(tool, clientX, clientY);
                  }
                }}
                onRollDice={rollDice}
                onSelectTool={setSelectedToolInstanceId}
                onShowUnavailableToolNotice={showToolNotice}
                onUseInstantTool={useInstantTool}
              />
            ) : null}
            {isMe && canShowDirectionArrows && selectedDirectionalTool ? (
              <SceneDirectionArrows
                actionId={selectedDirectionalTool.toolId}
                activeDirection={focusedDirection}
                position={[0, 0.02, 0]}
              />
            ) : null}
            <mesh position={[0, -0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.35, 0.46, 40]} />
              <meshBasicMaterial color={isActive ? "#1f8f6a" : player.color} />
            </mesh>
            {isMe ? (
              <mesh position={[0, pieceBaseY + 0.44, 0]} scale={[1.4, 1.7, 1.4]} {...pointerProps}>
                <sphereGeometry args={[0.34, 20, 20]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            ) : null}
            <PetPiece
              playerId={player.id}
              position={[0, pieceBaseY, 0]}
              rotationY={DIRECTION_ROTATION_Y[facingDirection]}
            />
          </group>
        );
      })}

      {previewLandingPosition ? (
        <PreviewRing
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          color={previewColor}
          opacity={0.72}
          position={previewLandingPosition}
          radius={0.56}
        />
      ) : null}
      {previewHookedPlayerPositions.map((position, index) => (
        <PreviewRing
          key={`hookshot-preview-${position.x}-${position.y}-${index}`}
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          color={previewColor}
          opacity={0.68}
          position={position}
          radius={0.52}
        />
      ))}

      {currentPlayer ? (
        <mesh
          position={[
            toWorldPosition(currentPlayer.position, snapshot.boardWidth, snapshot.boardHeight)[0],
            -0.38,
            toWorldPosition(currentPlayer.position, snapshot.boardWidth, snapshot.boardHeight)[2]
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.18, 24]} />
          <meshBasicMaterial color="#10223b" />
        </mesh>
      ) : null}
    </>
  );
}
