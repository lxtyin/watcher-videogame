import type { GridPosition } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";
import { BoxingBallSharedAsset } from "./BoxingBallSharedAsset";

export function BoxingBallHitEffectAsset({
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
  const swingRotationZ = Math.sin(progress * Math.PI * 3.2) * (1 - progress) * 0.52;
  const opacity = 0.86 - progress * 0.28;

  return (
    <group position={[worldX, 0.02, worldZ]}>
      <BoxingBallSharedAsset opacity={opacity} swingRotationZ={swingRotationZ} />
    </group>
  );
}
