import { getDiceRewardCode, type TileDefinition } from "@watcher/shared";
import { DiceRewardModel } from "../dice/DiceRewardModel";

// Lucky tiles expose only the top of the reward die above the board surface.
export function LuckyBlockAsset({ tile }: { tile: TileDefinition }) {
  return (
    <group position={[0, -0.49, 0]} scale={0.56}>
      <DiceRewardModel rewardCode={getDiceRewardCode(tile.state)} />
    </group>
  );
}
