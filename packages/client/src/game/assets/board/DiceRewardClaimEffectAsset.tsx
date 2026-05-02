import { getDiceRewardCode, type GridPosition, type PresentationEffectMetadata } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";
import { DiceRewardModel } from "../dice/DiceRewardModel";

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
  const rise = progress * 0.92;
  const opacity = Math.max(0, 1 - progress);
  const scale = 0.56 + progress * 0.18;
  // const spin = progress * Math.PI * 0.38;

  return (
    <group position={[worldX, -0.5 + rise, worldZ]} rotation={[0, 0, 0]} scale={scale}>
      <DiceRewardModel opacity={opacity} rewardCode={rewardCode} />
      <mesh
        position={[0, -0.16, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1 + progress * 1.1, 1 + progress * 1.1, 1]}
      >
        <ringGeometry args={[0.26, 0.4, 30]} />
        <meshBasicMaterial color="#fff0a6" toneMapped={false} transparent opacity={0.5 * opacity} />
      </mesh>
    </group>
  );
}
