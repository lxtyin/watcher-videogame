import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";

export function TowerImpactEffectAsset({
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
  const pulseScale = 0.92 + progress * 0.82;

  return (
    <group>
      {tiles.map((tile) => {
        const [tileX, , tileZ] = toWorldPosition(tile, boardWidth, boardHeight);

        return (
          <mesh
            key={`tower-impact-tile-${tile.x}-${tile.y}`}
            position={[tileX, -0.23, tileZ]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1.04 + progress * 0.18, 1.04 + progress * 0.18, 1]}
          >
            <planeGeometry args={[1.02, 1.02]} />
            <meshBasicMaterial color="#c9d4ef" toneMapped={false} transparent opacity={0.18 * opacity} />
          </mesh>
        );
      })}
      <group position={[worldX, 0, worldZ]}>
        <mesh
          position={[0, -0.155, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[pulseScale, pulseScale, 1]}
        >
          <ringGeometry args={[0.16, 0.44, 32]} />
          <meshBasicMaterial color="#f6f8ff" toneMapped={false} transparent opacity={0.82 * opacity} />
        </mesh>
        <mesh
          position={[0, -0.152, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[0.64 + progress * 0.76, 0.64 + progress * 0.76, 1]}
        >
          <ringGeometry args={[0.4, 0.58, 32]} />
          <meshBasicMaterial color="#9eb6ff" toneMapped={false} transparent opacity={0.34 * opacity} />
        </mesh>
        <mesh
          position={[0, 0.48 + progress * 0.16, 0]}
          rotation={[progress * Math.PI * 0.3, progress * Math.PI * 0.25, progress * Math.PI * 0.4]}
          scale={[0.2 + progress * 0.08, 0.3 + progress * 0.12, 0.2 + progress * 0.08]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#dde7ff"
            emissive="#9fb7ff"
            emissiveIntensity={0.58}
            transparent
            opacity={0.6 * opacity}
          />
        </mesh>
        {[
          { x: -0.26, y: 0.18, z: -0.08 },
          { x: 0.18, y: 0.24, z: -0.2 },
          { x: -0.1, y: 0.28, z: 0.18 },
          { x: 0.24, y: 0.16, z: 0.14 },
          { x: 0.04, y: 0.22, z: -0.26 }
        ].map((shard, index) => (
          <mesh
            key={`tower-impact-shard-${index}`}
            position={[
              shard.x * (1 + progress * 0.75),
              shard.y + 0.14 + progress * 0.24,
              shard.z * (1 + progress * 0.75)
            ]}
            rotation={[
              progress * Math.PI * (index + 1) * 0.9,
              progress * Math.PI * 1.45,
              progress * Math.PI * 1.1
            ]}
            scale={[0.12, 0.08, 0.16]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#8f97aa"
              emissive="#6d82b9"
              emissiveIntensity={0.22}
              transparent
              opacity={0.92 * opacity}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
