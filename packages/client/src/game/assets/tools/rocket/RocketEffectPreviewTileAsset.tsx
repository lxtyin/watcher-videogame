import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../../utils/boardMath";

// Rocket effect tiles use a dedicated blast marker instead of the generic effect square.
export function RocketEffectPreviewTileAsset({
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
        {/* <boxGeometry args={[1.1, 0.02, 1.1]} /> */}
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.34} />
      </mesh>
    </group>
  );
}
