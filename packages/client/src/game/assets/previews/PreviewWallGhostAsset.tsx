import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";

// Wall placement previews are treated like a ghost asset so build tools stay data-driven.
export function PreviewWallGhostAsset({
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
    <group position={[x, 0, z]}>
      <mesh position={[0, -0.15, 0]} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial color={color} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.34, 28]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}
