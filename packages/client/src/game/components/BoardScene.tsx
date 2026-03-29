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
  type TileDefinition,
  type ToolId,
  type ToolTargetMode,
  type TurnToolSnapshot
} from "@watcher/shared";
import { getActionUiConfig } from "../config/actionUi";
import { useGameStore } from "../state/useGameStore";
import { SceneActionRing } from "./SceneInteractionHud";
import { SceneDirectionArrows } from "./SceneDirectionArrows";
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

const AIM_DRAG_THRESHOLD_PX = 14;
const DIRECTION_ROTATION_Y: Record<Direction, number> = {
  up: 0,
  right: -Math.PI / 2,
  down: Math.PI,
  left: Math.PI / 2
};

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

function getTileAimTarget(
  worldX: number,
  worldZ: number,
  actorPosition: GridPosition,
  boardWidth: number,
  boardHeight: number
): GridPosition | null {
  const snappedPointer = clampGridPositionToBoard(
    toGridPositionFromWorld(worldX, worldZ, boardWidth, boardHeight),
    boardWidth,
    boardHeight
  );
  const deltaX = snappedPointer.x - actorPosition.x;
  const deltaY = snappedPointer.y - actorPosition.y;

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

function ConveyorArrow({ direction }: { direction: Direction }) {
  return (
    <group rotation={[0, DIRECTION_ROTATION_Y[direction], 0]}>
      <mesh position={[0, 0.17, -0.04]}>
        <boxGeometry args={[0.16, 0.05, 0.42]} />
        <meshStandardMaterial color="#eff3f6" emissive="#4a8da9" emissiveIntensity={0.26} />
      </mesh>
      <mesh position={[0, 0.18, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.17, 0.26, 6]} />
        <meshStandardMaterial color="#eff3f6" emissive="#4a8da9" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.13, 0.18]}>
        <boxGeometry args={[0.68, 0.03, 0.2]} />
        <meshStandardMaterial color="#6db0c6" emissive="#3f7388" emissiveIntensity={0.18} />
      </mesh>
    </group>
  );
}

function LuckyBlock() {
  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.48, 0.34, 0.48]} />
        <meshStandardMaterial color="#f1cc59" emissive="#8a6d10" emissiveIntensity={0.34} />
      </mesh>
      <mesh position={[0, 0.31, 0]}>
        <boxGeometry args={[0.18, 0.06, 0.42]} />
        <meshStandardMaterial color="#fff5c9" emissive="#b7931d" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.18, 0.06, 0.42]} />
        <meshStandardMaterial color="#fff5c9" emissive="#b7931d" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.28, 28]} />
        <meshBasicMaterial color="#ffe596" transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

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

function Tile({
  tile,
  boardWidth,
  boardHeight,
  previewActive,
  previewColor
}: {
  tile: TileDefinition;
  boardWidth: number;
  boardHeight: number;
  previewActive: boolean;
  previewColor: string;
}) {
  const [x, , z] = toWorldPosition({ x: tile.x, y: tile.y }, boardWidth, boardHeight);
  const height =
    tile.type === "wall"
      ? 1.15
      : tile.type === "earthWall"
        ? 0.7
        : tile.type === "lucky"
          ? 0.26
          : 0.22;
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
        <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.82, 0.82]} />
          <meshBasicMaterial color={previewColor} transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}

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
  const selectedAccent = selectedAimTool
    ? getActionUiConfig(selectedAimTool.toolId).accent
    : "#ffffff";

  useEffect(() => {
    aimStateRef.current = aimState;
  }, [aimState]);

  useEffect(() => {
    const canvas = gl.domElement;

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
          myPlayer.position,
          snapshot.boardWidth,
          snapshot.boardHeight
        )
      };
    };

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

    const cancelAim = () => {
      aimStateRef.current = null;
      setAimState(null);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 2) {
        return;
      }

      event.preventDefault();
      cancelAim();
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 2) {
        return;
      }

      event.preventDefault();
      cancelAim();
    };

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
    return new Set(previewResolution?.path.map((position) => `${position.x},${position.y}`) ?? []);
  }, [previewResolution]);

  const previewColor = aimState ? getActionUiConfig(aimState.toolId).accent : "#6abf69";
  const previewLandingPosition =
    myPlayer &&
    previewResolution?.kind === "applied" &&
    (previewResolution.actor.position.x !== myPlayer.position.x ||
      previewResolution.actor.position.y !== myPlayer.position.y)
      ? previewResolution.actor.position
      : null;
  const previewHookedPlayerPosition =
    snapshot &&
    aimState?.toolId === "hookshot" &&
    previewResolution?.kind === "applied" &&
    previewResolution.affectedPlayers.length
      ? snapshot.players.find(
          (player) => player.id === previewResolution.affectedPlayers[0]?.playerId
        )?.position ?? null
      : null;

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
        />
      ))}

      {snapshot.players.map((player, index) => {
        const [x, , z] = toWorldPosition(player.position, snapshot.boardWidth, snapshot.boardHeight);
        const isActive = player.id === snapshot.turnInfo.currentPlayerId;
        const isMe = player.id === sessionId;
        const pointerProps = isMe ? { onPointerDown: handlePiecePointerDown } : {};
        const actionRingOffset = getActionRingOffset(
          player.position.x,
          player.position.y,
          snapshot.boardWidth,
          snapshot.boardHeight
        );
        const bob = isActive && isMe ? 0 : Math.sin(simulationTimeMs / 450 + index) * 0.05;
        const pieceEmissive =
          isMe && selectedAimTool && isMyTurn
            ? selectedAccent
            : isMe
              ? "#ffffff"
              : "#000000";
        const emissiveIntensity =
          isMe && selectedAimTool && isMyTurn ? 0.28 : isMe ? 0.12 : 0;

        return (
          <group key={player.id} position={[x, 0, z]}>
            {isMe && snapshot.turnInfo.currentPlayerId === sessionId && !isAiming ? (
              <SceneActionRing
                tools={player.tools}
                phase={snapshot.turnInfo.phase}
                position={[0, 1.78 + bob, 0]}
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
              <meshBasicMaterial color={isActive ? "#1f8f6a" : "#8c8f97"} />
            </mesh>
            {isMe ? (
              <mesh position={[0, 0.34 + bob, 0]} scale={[1.46, 1.85, 1.46]} {...pointerProps}>
                <sphereGeometry args={[0.34, 20, 20]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            ) : null}
            <mesh
              position={[0, 0.3 + bob, 0]}
              scale={[0.82, 1.18, 0.82]}
              castShadow
              {...pointerProps}
            >
              <sphereGeometry args={[0.34, 32, 32]} />
              <meshStandardMaterial
                color={player.color}
                emissive={pieceEmissive}
                emissiveIntensity={emissiveIntensity}
              />
            </mesh>
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
      {previewHookedPlayerPosition ? (
        <PreviewRing
          boardWidth={snapshot.boardWidth}
          boardHeight={snapshot.boardHeight}
          color={previewColor}
          opacity={0.68}
          position={previewHookedPlayerPosition}
          radius={0.52}
        />
      ) : null}

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
