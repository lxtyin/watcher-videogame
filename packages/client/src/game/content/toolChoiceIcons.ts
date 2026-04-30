import basketballIconUrl from "../assets/tools/icons/basketball.svg";
import buildWallIconUrl from "../assets/tools/icons/build-wall.svg";
import dice1IconUrl from "../assets/tools/icons/dice-1.svg";
import dice2IconUrl from "../assets/tools/icons/dice-2.svg";
import dice3IconUrl from "../assets/tools/icons/dice-3.svg";
import dice4IconUrl from "../assets/tools/icons/dice-4.svg";
import dice5IconUrl from "../assets/tools/icons/dice-5.svg";
import dice6IconUrl from "../assets/tools/icons/dice-6.svg";
import hookIconUrl from "../assets/tools/icons/hook.svg";
import jumpIconUrl from "../assets/tools/icons/jump.svg";
import punchIconUrl from "../assets/tools/icons/punch.svg";
import rocketIconUrl from "../assets/tools/icons/rocket.svg";
import { getActionUiConfig } from "./actionUi";

interface ToolChoiceIconAsset {
  src: string;
}

const TOOL_CHOICE_ICON_ASSETS: Record<string, ToolChoiceIconAsset> = {
  "point:1": { src: dice1IconUrl },
  "point:2": { src: dice2IconUrl },
  "point:3": { src: dice3IconUrl },
  "point:4": { src: dice4IconUrl },
  "point:5": { src: dice5IconUrl },
  "point:6": { src: dice6IconUrl },
  "tool:basketball": { src: basketballIconUrl },
  "tool:buildWall": { src: buildWallIconUrl },
  "tool:hookshot": { src: hookIconUrl },
  "tool:jump": { src: jumpIconUrl },
  "tool:punch": { src: punchIconUrl },
  "tool:rocket": { src: rocketIconUrl }
};

export function getToolChoiceIconAsset(iconId: string | undefined): ToolChoiceIconAsset | null {
  if (!iconId) {
    return null;
  }

  return TOOL_CHOICE_ICON_ASSETS[iconId] ?? null;
}

export function getToolChoiceIconToken(iconId: string | undefined, fallbackLabel: string): string {
  if (iconId?.startsWith("point:")) {
    return iconId.slice("point:".length);
  }

  if (iconId?.startsWith("tool:")) {
    const toolId = iconId.slice("tool:".length) as Parameters<typeof getActionUiConfig>[0];
    return getActionUiConfig(toolId).token;
  }

  return fallbackLabel.slice(0, 1);
}
