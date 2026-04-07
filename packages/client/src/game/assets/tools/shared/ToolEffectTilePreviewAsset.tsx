import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../../utils/boardMath";

// Generic effect tiles stay separate from selection overlays so tool effects can specialize per tool.
export function ToolEffectTilePreviewAsset({
  boardHeight,
  boardWidth,
  color,
  position
}: {
  boardHeight: number;
  boardWidth: number;
  color: string;
  position: GridPosition;
}) {
  const [x, , z] = toWorldPosition(position, boardWidth, boardHeight);

  return (
    <group position={[x, -0.26, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.82, 0.82]} />
        <meshBasicMaterial color={color} transparent opacity={0.38} />
      </mesh>
    </group>
  );
}
