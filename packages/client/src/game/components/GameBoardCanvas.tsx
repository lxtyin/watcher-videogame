import { Canvas } from "@react-three/fiber";
import { BoardScene } from "./BoardScene";

export function GameBoardCanvas() {
  return (
    <div className="board-shell">
      <Canvas camera={{ position: [11, 15.6, 10], fov: 34 }} shadows>
        <BoardScene />
      </Canvas>
    </div>
  );
}
