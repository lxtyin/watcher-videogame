import type { SummonStateMap } from "./types";

export function cloneSummonState(state: SummonStateMap | undefined): SummonStateMap {
  return {
    ...(state ?? {})
  };
}
