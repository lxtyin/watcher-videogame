import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";

// Wallet is the first summon asset and acts as the template for future deployables.
export function WalletSummonAsset({
  boardHeight,
  boardWidth,
  color,
  opacity = 1,
  position
}: {
  boardHeight: number;
  boardWidth: number;
  color: string;
  opacity?: number;
  position: GridPosition;
}) {
  const [x, , z] = toWorldPosition(position, boardWidth, boardHeight);
  const transparent = opacity < 1;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.32, 28]} />
        <meshBasicMaterial color={color} transparent={transparent} opacity={opacity * 0.82} />
      </mesh>
      <mesh position={[0, -0.03, 0]} castShadow>
        <boxGeometry args={[0.34, 0.2, 0.24]} />
        <meshStandardMaterial color="#ffe188" transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.11, 0.03, 12, 22]} />
        <meshStandardMaterial color="#f6e8bd" transparent={transparent} opacity={opacity * 0.9} />
      </mesh>
      <mesh position={[0, 0.02, 0.13]}>
        <boxGeometry args={[0.1, 0.08, 0.04]} />
        <meshStandardMaterial color="#f8edcb" transparent={transparent} opacity={opacity * 0.92} />
      </mesh>
    </group>
  );
}
