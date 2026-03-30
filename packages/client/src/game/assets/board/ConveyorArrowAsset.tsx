import type { Direction } from "@watcher/shared";

const DIRECTION_ROTATION_Y: Record<Direction, number> = {
  up: 0,
  right: -Math.PI / 2,
  down: Math.PI,
  left: Math.PI / 2
};

// Conveyor arrows are authored as a reusable board-surface asset.
export function ConveyorArrowAsset({
  color = "#6db0c6",
  direction
}: {
  color?: string;
  direction: Direction;
}) {
  return (
    <group rotation={[0, DIRECTION_ROTATION_Y[direction], 0]}>
      <mesh position={[0, -0.2, -0.3]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.2]}>
        <coneGeometry args={[0.27, 0.2, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.2]}>
        <coneGeometry args={[0.27, 0.2, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.2, 0.3]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.2]}>
        <coneGeometry args={[0.27, 0.2, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
