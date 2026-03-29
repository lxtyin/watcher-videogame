import { Canvas } from "@react-three/fiber";
import { BoardScene } from "./BoardScene";

export function GameBoardCanvas() {
  return (
    <div className="board-shell">
      <Canvas camera={{ position: [5.5, 7.5, 6.8], fov: 42 }} shadows>
        <BoardScene />
      </Canvas>
    </div>
  );
}
