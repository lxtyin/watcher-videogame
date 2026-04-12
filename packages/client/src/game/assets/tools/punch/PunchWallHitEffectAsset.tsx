import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../../utils/boardMath";

const CHIP_OFFSETS = [
  [-0.24, 0.2, -0.12],
  [0.18, 0.26, -0.22],
  [-0.08, 0.32, 0.2],
  [0.28, 0.18, 0.14],
  [0.02, 0.28, -0.3]
] as const;

export function PunchWallHitEffectAsset({
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
  const crackScale = 0.65 + progress * 0.42;

  return (
    <group position={[worldX, 0, worldZ]}>
      <mesh
        position={[0, -0.18, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.85 + progress * 0.35, 0.85 + progress * 0.35, 1]}
      >
        <ringGeometry args={[0.18, 0.34, 8]} />
        <meshBasicMaterial color="#ffe4c1" toneMapped={false} transparent opacity={0.66 * opacity} />
      </mesh>
      <mesh
        position={[0, 0.22, 0]}
        rotation={[0, progress * Math.PI * 0.2, Math.PI / 4]}
        scale={[crackScale, 0.08, crackScale]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#fff2dd" toneMapped={false} transparent opacity={0.74 * opacity} />
      </mesh>
      <mesh
        position={[0, 0.23, 0]}
        rotation={[0, -progress * Math.PI * 0.2, -Math.PI / 4]}
        scale={[crackScale, 0.07, crackScale]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffb06b" toneMapped={false} transparent opacity={0.56 * opacity} />
      </mesh>
      {CHIP_OFFSETS.map(([x, y, z], index) => (
        <mesh
          key={`punch-wall-chip-${index}`}
          position={[
            x * (1 + progress * 0.8),
            y + progress * 0.28,
            z * (1 + progress * 0.8)
          ]}
          rotation={[
            progress * Math.PI * (index + 1),
            progress * Math.PI * 1.4,
            progress * Math.PI * 0.9
          ]}
          scale={[0.09, 0.09, 0.09]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#c77745"
            emissive="#8d3e2a"
            emissiveIntensity={0.24}
            transparent
            opacity={0.9 * opacity}
          />
        </mesh>
      ))}
    </group>
  );
}
