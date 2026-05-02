import type { BoardDefinition, BoardSummonState, GridPosition } from "@watcher/shared";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { MOUSE, TOUCH } from "three";
import { MapEditorScene } from "./MapEditorScene";
import type { TerrainLibraryEntry } from "./terrainCatalog";

const DISABLED_MOUSE_BUTTON = -1 as MOUSE;
const DISABLED_TOUCH_ACTION = -1 as TOUCH;

export function MapEditorCanvas({
  board,
  summons,
  hoveredPosition,
  isPainting,
  onHoverPosition,
  onPaintPosition,
  onPointerUp,
  selectedTerrain
}: {
  board: BoardDefinition;
  summons: BoardSummonState[];
  hoveredPosition: GridPosition | null;
  isPainting: boolean;
  onHoverPosition: (position: GridPosition | null) => void;
  onPaintPosition: (position: GridPosition) => void;
  onPointerUp: () => void;
  selectedTerrain: TerrainLibraryEntry | null;
}) {
  return (
    <div className="board-shell map-editor-board-shell" onPointerUp={onPointerUp}>
      <Canvas camera={{ position: [11, 15.6, 10], fov: 34 }} shadows>
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
        <MapEditorScene
          board={board}
          summons={summons}
          hoveredPosition={hoveredPosition}
          isPainting={isPainting}
          onHoverPosition={onHoverPosition}
          onPaintPosition={onPaintPosition}
          selectedTerrain={selectedTerrain}
        />
      </Canvas>
    </div>
  );
}
