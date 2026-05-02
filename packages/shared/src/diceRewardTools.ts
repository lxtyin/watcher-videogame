import { rollToolDie } from "./dice";
import {
  createMovementToolInstance,
  createRolledToolInstance,
  TOOL_DIE_FACES
} from "./tools";
import type { DiceRewardCode } from "./diceReward";
import type { ToolDieFaceDefinition, TurnToolSnapshot } from "./types";

function findToolDieFace(toolId: TurnToolSnapshot["toolId"]): ToolDieFaceDefinition | null {
  return TOOL_DIE_FACES.find((face) => face.toolId === toolId) ?? null;
}

export function createDiceRewardTool(
  rewardCode: DiceRewardCode,
  seed: number,
  createInstanceId: (grantedToolId: string) => string
): {
  grantedTool: TurnToolSnapshot;
  nextToolDieSeed: number;
} {
  if (rewardCode === "random_tool") {
    const toolRoll = rollToolDie(seed);

    return {
      grantedTool: createRolledToolInstance(
        createInstanceId(toolRoll.value.toolId),
        toolRoll.value
      ),
      nextToolDieSeed: toolRoll.nextSeed
    };
  }

  if (rewardCode.startsWith("point:")) {
    const movePoints = Number.parseInt(rewardCode.slice("point:".length), 10);

    return {
      grantedTool: createMovementToolInstance(createInstanceId(`movement-${movePoints}`), movePoints),
      nextToolDieSeed: seed
    };
  }

  const toolId = rewardCode.slice("tool:".length) as TurnToolSnapshot["toolId"];
  const toolFace = findToolDieFace(toolId);

  return {
    grantedTool: createRolledToolInstance(
      createInstanceId(toolFace?.toolId ?? toolId),
      toolFace ?? { toolId }
    ),
    nextToolDieSeed: seed
  };
}
