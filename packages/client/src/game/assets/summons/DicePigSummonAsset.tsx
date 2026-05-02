import {
  getDicePigCarryCode,
  type SummonSnapshot
} from "@watcher/shared";
import { DiceRewardModel } from "../dice/DiceRewardModel";
import { PetPiece } from "../player/PetPiece";

const DICE_OFFSET: [number, number, number] = [0, 1.0, -0.5];
const DICE_SCALE = 1.4;

export function DicePigSummonAsset({
  color,
  opacity = 1,
  summon
}: {
  color: string;
  opacity?: number;
  summon: SummonSnapshot;
}) {
  const carryCode = getDicePigCarryCode(summon.state);
  const transparent = opacity < 1;

  return (
    <group>
      <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.34, 28]} />
        <meshBasicMaterial color={color} transparent={transparent} opacity={opacity * 0.78} />
      </mesh>
      <PetPiece petId="animal-pig" position={[0, 0, 0]} rotation={[0, 0, 0]}>
        {carryCode === "none" ? null : (
          <group position={DICE_OFFSET} scale={DICE_SCALE}>
            <DiceRewardModel rewardCode={carryCode} />
          </group>
        )}
      </PetPiece>
    </group>
  );
}
