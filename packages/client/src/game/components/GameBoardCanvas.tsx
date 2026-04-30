import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { MOUSE, TOUCH } from "three";
import { TerrainThumbnailCaptureDeck } from "../assets/board/TerrainThumbnailCaptureDeck";
import {
  expandTerrainThumbnailEntriesForCapture,
  TERRAIN_THUMBNAIL_ENTRIES
} from "../assets/board/terrainThumbnailCatalog";
import { useSceneOverlayStore } from "../state/useSceneOverlayStore";
import { BoardScene } from "./BoardScene";
import { SceneChoiceModal, type SceneChoiceModalState } from "./SceneChoiceModal";
import { SceneInspectionCard } from "./SceneInspectionCard";
import { SceneToolCancelZone } from "./SceneToolCancelZone";

const DISABLED_MOUSE_BUTTON = -1 as MOUSE;
const DISABLED_TOUCH_ACTION = -1 as TOUCH;
type CameraControlMode = "follow" | "orbit";

// Switch this to "orbit" to restore the previous OrbitControls camera.
const CAMERA_CONTROL_MODE_BY_CODE: CameraControlMode = "follow";

function getCameraControlMode(): CameraControlMode {
  return CAMERA_CONTROL_MODE_BY_CODE;
}

function RenderStatsProbe() {
  const gl = useThree((state) => state.gl);

  useFrame(() => {
    window.watcher_render_stats = {
      calls: gl.info.render.calls,
      frameAtMs: performance.now(),
      geometries: gl.info.memory.geometries,
      lines: gl.info.render.lines,
      points: gl.info.render.points,
      textures: gl.info.memory.textures,
      triangles: gl.info.render.triangles
    };
  });

  useEffect(() => {
    return () => {
      window.watcher_render_stats = undefined;
    };
  }, []);

  return null;
}

// The canvas owns the camera mode switch; follow controls share input arbitration in BoardScene.
export function GameBoardCanvas() {
  const cameraControlMode = getCameraControlMode();
  const [terrainThumbnailUrls, setTerrainThumbnailUrls] = useState<Partial<Record<string, string>>>({});
  const [choiceModal, setChoiceModal] = useState<SceneChoiceModalState | null>(null);
  const inspectionCard = useSceneOverlayStore((state) => state.inspectionCard);
  const resetSceneOverlays = useSceneOverlayStore((state) => state.reset);
  const toolCancelActive = useSceneOverlayStore((state) => state.toolCancelActive);
  const toolCancelVisible = useSceneOverlayStore((state) => state.toolCancelVisible);
  const thumbnailEntries = useMemo(
    () => expandTerrainThumbnailEntriesForCapture(TERRAIN_THUMBNAIL_ENTRIES),
    []
  );

  useEffect(() => {
    return () => {
      resetSceneOverlays();
    };
  }, [resetSceneOverlays]);

  return (
    <div className="board-shell">
      <TerrainThumbnailCaptureDeck
        entries={thumbnailEntries}
        thumbnailUrls={terrainThumbnailUrls}
        onCapture={(symbol, url) => {
          setTerrainThumbnailUrls((current) => {
            if (current[symbol] === url) {
              return current;
            }

            return {
              ...current,
              [symbol]: url
            };
          });
        }}
      />
      <Canvas camera={{ position: [11, 15.6, 10], fov: 34 }} shadows>
        <RenderStatsProbe />
        {cameraControlMode === "orbit" ? (
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            enablePan={false}
            enableZoom
            minDistance={10}
            maxDistance={24}
            minPolarAngle={0.45}
            maxPolarAngle={1.2}
            target={[0, 0, 0]}
            mouseButtons={{
              LEFT: DISABLED_MOUSE_BUTTON,
              MIDDLE: MOUSE.ROTATE,
              RIGHT: DISABLED_MOUSE_BUTTON
            }}
            touches={{
              ONE: DISABLED_TOUCH_ACTION,
              TWO: TOUCH.DOLLY_ROTATE
            }}
          />
        ) : null}
        <BoardScene
          cameraControlMode={cameraControlMode}
          setChoiceModal={setChoiceModal}
          terrainThumbnailUrls={terrainThumbnailUrls}
        />
      </Canvas>
      <div className="board-shell__ui-layer">
        <SceneChoiceModal modal={choiceModal} />
        <SceneToolCancelZone active={toolCancelActive} visible={toolCancelVisible} />
        <SceneInspectionCard inspection={inspectionCard} />
      </div>
    </div>
  );
}
