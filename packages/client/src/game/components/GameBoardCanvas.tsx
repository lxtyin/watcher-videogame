import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { MOUSE } from "three";
import { BoardScene } from "./BoardScene";

const DISABLED_MOUSE_BUTTON = -1 as MOUSE;

// The canvas owns camera behavior so board interactions can stay focused on gameplay input.
export function GameBoardCanvas() {
  return (
    <div className="board-shell">
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
        />
        <BoardScene />
      </Canvas>
    </div>
  );
}
