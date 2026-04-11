import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";
import { createBoardDefinition, type GameMapId } from "@watcher/shared";
import { BoardStaticTileLayer } from "./BoardStaticTileLayer";

const PREVIEW_CAMERA_TARGET = new Vector3(0, 0, 0);

function CreateRoomMapPreviewScene({ mapId }: { mapId: GameMapId }) {
  const board = useMemo(() => createBoardDefinition(mapId), [mapId]);
  const maxBoardSize = Math.max(board.width, board.height);

  useFrame(({ camera, clock }) => {
    const elapsedSeconds = clock.getElapsedTime();
    const radius = Math.max(11, maxBoardSize * 1.18);
    const height = Math.max(8, maxBoardSize * 1.16);
    const angle = elapsedSeconds * 0.1 + Math.PI * 0.18;

    camera.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    camera.lookAt(PREVIEW_CAMERA_TARGET);
  });

  return (
    <>
      <color attach="background" args={["#f3ead9"]} />
      <ambientLight intensity={1.02} />
      <directionalLight castShadow intensity={1.32} position={[7, 12, 4]} />
      <hemisphereLight args={["#fff5d8", "#c9d2c1", 0.74]} />
      <fog attach="fog" args={["#f3ead9", maxBoardSize * 1.4, maxBoardSize * 3.2]} />
      <mesh position={[0, -0.72, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[board.width + 6, board.height + 6]} />
        <meshStandardMaterial color="#d7d8c6" roughness={0.82} metalness={0.02} />
      </mesh>
      <BoardStaticTileLayer
        boardHeight={board.height}
        boardWidth={board.width}
        onTilePointerDown={undefined}
        tiles={board.tiles}
      />
    </>
  );
}

export function CreateRoomMapPreview({
  mapId,
  transitionDirection,
  transitionKey
}: {
  mapId: GameMapId;
  transitionDirection: "next" | "previous";
  transitionKey: number;
}) {
  return (
    <div className="create-room-map-preview" aria-hidden="true">
      <div
        key={transitionKey}
        className={`create-room-map-preview__page create-room-map-preview__page--${transitionDirection}`}
      >
        <Canvas
          camera={{ position: [10, 15, 10], fov: 32 }}
          dpr={[1, 1.5]}
          shadows
        >
          <CreateRoomMapPreviewScene mapId={mapId} />
        </Canvas>
      </div>
    </div>
  );
}
