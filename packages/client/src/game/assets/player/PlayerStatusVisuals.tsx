import {
  BONDAGE_MODIFIER_ID,
  BONDAGE_STACKS_TAG,
  STUN_MODIFIER_ID,
  getPlayerTagNumber,
  type ModifierId,
  type PlayerTagMap
} from "@watcher/shared";
import { BondageStatusAsset } from "./BondageStatusAsset";
import { StunStatusAsset } from "./StunStatusAsset";

export function PlayerStatusVisuals({
  modifiers,
  simulationTimeMs,
  tags
}: {
  modifiers: readonly ModifierId[];
  simulationTimeMs: number;
  tags: PlayerTagMap;
}) {
  const bondageStacks = getPlayerTagNumber(tags, BONDAGE_STACKS_TAG);
  const hasBondage = modifiers.includes(BONDAGE_MODIFIER_ID) || bondageStacks > 0;
  const hasStun = modifiers.includes(STUN_MODIFIER_ID);

  return (
    <>
      {hasBondage ? <BondageStatusAsset stacks={bondageStacks || 1} timeMs={simulationTimeMs} /> : null}
      {hasStun ? <StunStatusAsset timeMs={simulationTimeMs} /> : null}
    </>
  );
}
