import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";

export function StunClearEffectAsset({
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
  const ringScale = 0.62 + progress * 0.58;

  return (
    <group position={[worldX, 1.1 + progress * 0.22, worldZ]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[ringScale, ringScale, 1]}>
        <ringGeometry args={[0.18, 0.32, 30]} />
        <meshBasicMaterial color="#ffe37a" toneMapped={false} transparent opacity={0.7 * opacity} />
      </mesh>
      {Array.from({ length: 3 }, (_, index) => {
        const angle = progress * Math.PI * 1.4 + (index * Math.PI * 2) / 3;
        const radius = 0.16 + progress * 0.18;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <mesh
            key={`stun-clear-star-${index}`}
            position={[x, 0.08 + progress * 0.18 + index * 0.02, z]}
            rotation={[progress * Math.PI * 0.45, angle, Math.PI / 4]}
            scale={[0.08, 0.12, 0.08]}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color="#fff1a8"
              emissive="#ffcd4b"
              emissiveIntensity={0.55}
              transparent
              opacity={0.94 * opacity}
            />
          </mesh>
        );
      })}
    </group>
  );
}
