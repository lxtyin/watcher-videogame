import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";

// Lucky claim effect replays the block as a rising phantom so the real tile can hide immediately.
export function LuckyClaimEffectAsset({
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
  const rise = progress * 0.55;
  const opacity = 1 - progress;
  const scale = 1 + progress * 0.18;

  return (
    <group position={[worldX, rise, worldZ]}>
      <mesh position={[0, -0.02, 0]} castShadow scale={[scale, scale, scale]}>
        <boxGeometry args={[0.48, 0.34, 0.48]} />
        <meshBasicMaterial color="#f1cc59" toneMapped={false} transparent opacity={0.72 * opacity} />
      </mesh>
      <mesh position={[0, 0.01, 0]} scale={[scale, scale, scale]}>
        <boxGeometry args={[0.5, 0.3, 0.15]} />
        <meshBasicMaterial color="#fff5c9" toneMapped={false} transparent opacity={0.8 * opacity} />
      </mesh>
      <mesh position={[0, 0.01, 0]} scale={[scale, scale, scale]}>
        <boxGeometry args={[0.15, 0.3, 0.5]} />
        <meshBasicMaterial color="#fff5c9" toneMapped={false} transparent opacity={0.8 * opacity} />
      </mesh>
      <mesh
        position={[0, -0.18, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1 + progress * 1.1, 1 + progress * 1.1, 1]}
      >
        <ringGeometry args={[0.18, 0.28, 28]} />
        <meshBasicMaterial color="#fff0a6" toneMapped={false} transparent opacity={0.64 * opacity} />
      </mesh>
    </group>
  );
}
