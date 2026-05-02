import { getDiceRewardCode, type GridPosition, type PresentationEffectMetadata } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";
import { DiceRewardModel } from "../dice/DiceRewardModel";
import { sqrt } from "three/tsl";

export function DiceRewardClaimEffectAsset({
  boardHeight,
  boardWidth,
  metadata,
  position,
  progress
}: {
  boardHeight: number;
  boardWidth: number;
  metadata?: PresentationEffectMetadata | undefined;
  position: GridPosition;
  progress: number;
  tiles: GridPosition[];
}) {
  const [worldX, , worldZ] = toWorldPosition(position, boardWidth, boardHeight);
  const rewardCode = getDiceRewardCode(metadata, "rewardCode");
  const rise = Math.sqrt(Math.min(progress, 0.6)) * 2.0;
  // const opacity = Math.max(0, 1 - progress);
  // const scale = 0.56 + progress * 0.18;
  // const spin = progress * Math.PI * 0.38;

  return (
    <group position={[worldX, -0.5 + rise, worldZ]} rotation={[0, 0, 0]} scale={0.56}>
      <DiceRewardModel opacity={1.0} rewardCode={rewardCode} />
    </group>
  );
}
