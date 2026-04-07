import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";

// Earth-wall break effects emphasize the hit tile with dust and debris pulses.
export function EarthWallBreakEffectAsset({
  boardHeight,
  boardWidth,
  position,
  progress,
  tiles
}: {
  boardHeight: number;
  boardWidth: number;
  position: GridPosition;
  progress: number;
  tiles: GridPosition[];
}) {
  const [worldX, , worldZ] = toWorldPosition(position, boardWidth, boardHeight);
  const opacity = 1 - progress;
  const dustScale = 0.95 + progress * 1.15;

  return (
    <group>
      {tiles.map((tile) => {
        const [tileX, , tileZ] = toWorldPosition(tile, boardWidth, boardHeight);

        return (
          <mesh
            key={`earth-wall-break-tile-${tile.x}-${tile.y}`}
            position={[tileX, -0.23, tileZ]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1.06 + progress * 0.22, 1.06 + progress * 0.22, 1]}
          >
            <planeGeometry args={[1.02, 1.02]} />
            <meshBasicMaterial color="#c98b4f" toneMapped={false} transparent opacity={0.26 * opacity} />
          </mesh>
        );
      })}
      <group position={[worldX, 0, worldZ]}>
        <mesh
          position={[0, 0.07 + progress * 0.2, 0]}
          scale={[0.36 + progress * 0.26, 0.26 + progress * 0.34, 0.36 + progress * 0.26]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#f2d6ac" toneMapped={false} transparent opacity={0.34 * opacity} />
        </mesh>
        <mesh
          position={[0, -0.16, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[dustScale, dustScale, 1]}
        >
          <ringGeometry args={[0.12, 0.42, 28]} />
          <meshBasicMaterial color="#f8deb5" toneMapped={false} transparent opacity={0.88 * opacity} />
        </mesh>
        <mesh
          position={[0, -0.155, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[0.7 + progress * 0.9, 0.7 + progress * 0.9, 1]}
        >
          <ringGeometry args={[0.38, 0.52, 28]} />
          <meshBasicMaterial color="#ffb36b" toneMapped={false} transparent opacity={0.32 * opacity} />
        </mesh>
        <mesh
          position={[0, 0.52 + progress * 0.2, 0]}
          rotation={[progress * Math.PI * 0.35, progress * Math.PI * 0.2, progress * Math.PI * 0.45]}
          scale={[0.18 + progress * 0.08, 0.28 + progress * 0.14, 0.18 + progress * 0.08]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#ffd39a"
            emissive="#ff9a52"
            emissiveIntensity={0.6}
            transparent
            opacity={0.64 * opacity}
          />
        </mesh>
        {[
          { x: -0.28, y: 0.24, z: -0.1 },
          { x: 0.2, y: 0.28, z: -0.22 },
          { x: -0.1, y: 0.34, z: 0.2 },
          { x: 0.28, y: 0.2, z: 0.16 },
          { x: 0.04, y: 0.3, z: -0.28 },
          { x: -0.24, y: 0.18, z: 0.26 }
        ].map((debris, index) => (
          <mesh
            key={`earth-wall-debris-${index}`}
            position={[
              debris.x * (1 + progress * 0.7),
              debris.y + 0.16 + progress * 0.32,
              debris.z * (1 + progress * 0.7)
            ]}
            rotation={[
              progress * Math.PI * (index + 1),
              progress * Math.PI * 1.6,
              progress * Math.PI * 1.1
            ]}
            scale={[0.11, 0.11, 0.11]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#be7d43"
              emissive="#8f4a1d"
              emissiveIntensity={0.22}
              transparent
              opacity={0.96 * opacity}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
