import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { MOUSE, TOUCH } from "three";
import { BoardScene } from "./BoardScene";

const DISABLED_MOUSE_BUTTON = -1 as MOUSE;
const DISABLED_TOUCH_ACTION = -1 as TOUCH;

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

// The canvas owns camera behavior so board interactions can stay focused on gameplay input.
export function GameBoardCanvas() {
  return (
    <div className="board-shell">
      <Canvas camera={{ position: [11, 15.6, 10], fov: 34 }} shadows>
        <RenderStatsProbe />
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
        <BoardScene />
      </Canvas>
    </div>
  );
}
