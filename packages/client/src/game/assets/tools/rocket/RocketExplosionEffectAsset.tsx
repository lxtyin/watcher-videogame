import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../../utils/boardMath";

// Rocket explosion stays as an authored effect asset driven by semantic playback data.
export function RocketExplosionEffectAsset({
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
  const pulseScale = 0.5 + progress * 1.6;
  const pulseOpacity = 1 - progress;

  return (
    <group>
      {tiles.map((tile) => {
        const [tileX, , tileZ] = toWorldPosition(tile, boardWidth, boardHeight);

        return (
          <group key={`rocket-effect-tile-${tile.x}-${tile.y}`} position={[tileX, -0.23, tileZ]}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[1 + progress * 0.18, 1 + progress * 0.18, 1]}
            >
              <planeGeometry args={[0.86, 0.86]} />
              <meshBasicMaterial
                color="#ff6b57"
                toneMapped={false}
                transparent
                opacity={0.18 * pulseOpacity}
              />
            </mesh>
          </group>
        );
      })}
      <group position={[worldX, 0, worldZ]}>
        <mesh
          position={[0, -0.21, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[pulseScale, pulseScale, 1]}
        >
          <ringGeometry args={[0.2, 0.34, 28]} />
          <meshBasicMaterial
            color="#ffd8a8"
            toneMapped={false}
            transparent
            opacity={0.92 * pulseOpacity}
          />
        </mesh>
        <mesh
          position={[0, 0.08 + progress * 0.34, 0]}
          scale={[0.5 + progress * 0.45, 0.55 + progress * 0.75, 0.5 + progress * 0.45]}
        >
          <sphereGeometry args={[0.28, 20, 20]} />
          <meshBasicMaterial
            color="#ff8756"
            toneMapped={false}
            transparent
            opacity={0.35 * pulseOpacity}
          />
        </mesh>
        <mesh
          position={[0, 0.05 + progress * 0.18, 0]}
          scale={[0.26 + progress * 0.18, 0.18 + progress * 0.42, 0.26 + progress * 0.18]}
        >
          <cylinderGeometry args={[0.22, 0.34, 0.26, 16]} />
          <meshBasicMaterial
            color="#fff1cb"
            toneMapped={false}
            transparent
            opacity={0.56 * pulseOpacity}
          />
        </mesh>
      </group>
    </group>
  );
}
