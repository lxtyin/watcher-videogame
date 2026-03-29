import { OrbitControls } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { Camera, Plane, Raycaster, Vector2, Vector3 } from "three";
import {
  TOOL_DEFINITIONS,
  isDirectionalTool,
  type Direction,
  type TileDefinition
} from "@watcher/shared";
import { useGameStore } from "../state/useGameStore";
import {
  buildActionPreview,
  directionFromAxis,
  toWorldPosition
} from "../utils/boardMath";

interface DragState {
  startWorldX: number;
  startWorldZ: number;
  direction: Direction | null;
}

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

function Tile({
  tile,
  boardWidth,
  boardHeight,
  previewActive,
  previewColor,
  onSelect
}: {
  tile: TileDefinition;
  boardWidth: number;
  boardHeight: number;
  previewActive: boolean;
  previewColor: string;
  onSelect: (tile: TileDefinition) => void;
}) {
  const [x, , z] = toWorldPosition({ x: tile.x, y: tile.y }, boardWidth, boardHeight);
  const height = tile.type === "wall" ? 1.15 : tile.type === "earthWall" ? 0.7 : 0.22;
  const color = tile.type === "wall" ? "#455062" : tile.type === "earthWall" ? "#bc7441" : "#d5c6a1";

  return (
    <group>
      <mesh position={[x, height / 2 - 0.5, z]} castShadow receiveShadow onClick={() => onSelect(tile)}>
        <boxGeometry args={[0.96, height, 0.96]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {previewActive ? (
        <mesh position={[x, -0.35, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.82, 0.82]} />
          <meshBasicMaterial color={previewColor} transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}

export function BoardScene() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const snapshot = useGameStore((state) => state.snapshot);
  const sessionId = useGameStore((state) => state.sessionId);
  const selectedActionId = useGameStore((state) => state.selectedActionId);
  const performDirectionalAction = useGameStore((state) => state.performDirectionalAction);
  const simulationTimeMs = useGameStore((state) => state.simulationTimeMs);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const dragRaycaster = useMemo(() => new Raycaster(), []);
  const dragPointer = useMemo(() => new Vector2(), []);
  const dragIntersection = useMemo(() => new Vector3(), []);

  const isDirectionalSelection =
    selectedActionId === "move" || isDirectionalTool(selectedActionId);

  const myPlayer = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const isMyTurn =
    Boolean(snapshot && sessionId && snapshot.turnInfo.currentPlayerId === sessionId) &&
    snapshot?.turnInfo.phase === "action";
  const canDragToAim = Boolean(myPlayer && isMyTurn && isDirectionalSelection);

  useEffect(() => {
    if (!dragState || !canDragToAim) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      setDragState((currentState) => {
        if (!currentState) {
          return currentState;
        }

        const projectedPoint = projectClientToGround(
          event.clientX,
          event.clientY,
          gl.domElement,
          camera,
          dragRaycaster,
          dragPointer,
          dragPlane,
          dragIntersection
        );

        if (!projectedPoint) {
          return currentState;
        }

        return {
          ...currentState,
          direction: getDragDirection(
            projectedPoint.x - currentState.startWorldX,
            projectedPoint.z - currentState.startWorldZ
          )
        };
      });
    };

    const onPointerUp = () => {
      if (dragState.direction) {
        performDirectionalAction(dragState.direction);
      }

      setDragState(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [
    camera,
    canDragToAim,
    dragIntersection,
    dragPlane,
    dragPointer,
    dragRaycaster,
    dragState,
    gl,
    performDirectionalAction
  ]);

  const previewResolution = useMemo(() => {
    if (!snapshot || !sessionId || !dragState?.direction || !canDragToAim) {
      return null;
    }

    // The board preview uses the same shared action resolver as the server so
    // the drag hint matches the authoritative outcome as closely as possible.
    return buildActionPreview(snapshot, sessionId, selectedActionId, dragState.direction);
  }, [canDragToAim, dragState?.direction, selectedActionId, sessionId, snapshot]);

  const previewKeys = useMemo(() => {
    return new Set(previewResolution?.path.map((position) => `${position.x},${position.y}`) ?? []);
  }, [previewResolution]);

  const previewColor =
    selectedActionId === "move" ? "#6abf69" : TOOL_DEFINITIONS[selectedActionId].color;

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

  const handlePiecePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!canDragToAim || !myPlayer) {
      return;
    }

    event.stopPropagation();
    const [startWorldX, , startWorldZ] = toWorldPosition(
      myPlayer.position,
      snapshot.boardWidth,
      snapshot.boardHeight
    );

    setDragState({
      startWorldX,
      startWorldZ,
      direction: null
    });
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
          onSelect={(selectedTile) => {
            if (!canDragToAim || !myPlayer) {
              return;
            }

            const direction = directionFromAxis(myPlayer.position, {
              x: selectedTile.x,
              y: selectedTile.y
            });

            if (direction) {
              performDirectionalAction(direction);
            }
          }}
        />
      ))}

      {snapshot.players.map((player, index) => {
        const [x, , z] = toWorldPosition(player.position, snapshot.boardWidth, snapshot.boardHeight);
        const isActive = player.id === snapshot.turnInfo.currentPlayerId;
        const isMe = player.id === sessionId;
        const pointerProps = isMe ? { onPointerDown: handlePiecePointerDown } : {};
        // A small bob helps the placeholder piece read as a character, not a static prop.
        const bob = Math.sin(simulationTimeMs / 450 + index) * 0.05;
        const pieceEmissive =
          isMe && isDirectionalSelection && isMyTurn ? previewColor : isMe ? "#ffffff" : "#000000";
        const emissiveIntensity =
          isMe && isDirectionalSelection && isMyTurn ? 0.28 : isMe ? 0.12 : 0;

        return (
          <group key={player.id} position={[x, 0, z]}>
            <mesh position={[0, -0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.35, 0.46, 40]} />
              <meshBasicMaterial color={isActive ? "#1f8f6a" : "#8c8f97"} />
            </mesh>
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

      <OrbitControls enablePan={false} enabled={!dragState} minPolarAngle={0.55} maxPolarAngle={1.3} />
    </>
  );
}
