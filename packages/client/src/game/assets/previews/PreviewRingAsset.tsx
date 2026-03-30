import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";

// Landing and hit previews share one authored ring asset with configurable radius.
export function PreviewRingAsset({
  boardHeight,
  boardWidth,
  color,
  opacity,
  position,
  radius
}: {
  boardHeight: number;
  boardWidth: number;
  color: string;
  opacity: number;
  position: GridPosition;
  radius: number;
}) {
  const [x, , z] = toWorldPosition(position, boardWidth, boardHeight);

  return (
    <group position={[x, -0.27, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.08, radius, 40]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius - 0.12, 28]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.26} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius - 0.12, 0.028, 12, 36]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.84} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 20]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.48} />
      </mesh>
    </group>
  );
}
