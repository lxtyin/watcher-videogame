import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../../utils/boardMath";

const SHOCK_POINTS = [
  [0, 0, -0.34, 0],
  [0.26, 0, -0.2, Math.PI / 5],
  [-0.26, 0, -0.2, -Math.PI / 5],
  [0.28, 0, 0.18, -Math.PI / 5],
  [-0.28, 0, 0.18, Math.PI / 5],
  [0, 0, 0.34, Math.PI / 2]
] as const;

export function PunchPlayerHitEffectAsset({
  boardHeight,
  boardWidth,
  position,
  progress
}: {
  boardHeight: number;
  boardWidth: number;
  position: GridPosition;
  progress: number;
  tiles: GridPosition[];
}) {
  const [worldX, , worldZ] = toWorldPosition(position, boardWidth, boardHeight);
  const opacity = 1 - progress;
  const pulseScale = 0.45 + progress * 1.15;

  return (
    <group position={[worldX, 0, worldZ]}>
      <mesh
        position={[0, 0.25 + progress * 0.12, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[pulseScale, pulseScale, 1]}
      >
        <ringGeometry args={[0.12, 0.24, 7]} />
        <meshBasicMaterial color="#fff5f7" toneMapped={false} transparent opacity={0.82 * opacity} />
      </mesh>
      <mesh
        position={[0, 0.27 + progress * 0.18, 0]}
        scale={[
          0.24 + progress * 0.2,
          0.18 + progress * 0.22,
          0.24 + progress * 0.2
        ]}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff3270" toneMapped={false} transparent opacity={0.42 * opacity} />
      </mesh>
      {SHOCK_POINTS.map(([x, y, z, rotation], index) => (
        <mesh
          key={`punch-player-shock-${index}`}
          position={[
            x * (1 + progress * 0.9),
            0.28 + y + progress * 0.18,
            z * (1 + progress * 0.9)
          ]}
          rotation={[0, rotation, Math.PI / 4]}
          scale={[0.08, 0.08, 0.24 + progress * 0.18]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ffd8e4" toneMapped={false} transparent opacity={0.76 * opacity} />
        </mesh>
      ))}
    </group>
  );
}
