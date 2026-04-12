import type { ToolContentDefinition, ToolDieFaceContentDefinition } from "../content/schema";
import type { ToolExecutor } from "../rules/executors/types";
import { AWM_SHOOT_TOOL_MODULE } from "./awm-shoot";
import { BALANCE_TOOL_MODULE } from "./balance";
import { BASKETBALL_TOOL_MODULE } from "./basketball";
import { BLAZE_PREPARE_BOMB_TOOL_MODULE } from "./blaze-prepare-bomb";
import { BOMB_THROW_TOOL_MODULE } from "./bomb-throw";
import { BRAKE_TOOL_MODULE } from "./brake";
import { BUILD_WALL_TOOL_MODULE } from "./build-wall";
import { DASH_TOOL_MODULE } from "./dash";
import { DEPLOY_WALLET_TOOL_MODULE } from "./deploy-wallet";
import { HOOKSHOT_TOOL_MODULE } from "./hookshot";
import { JUMP_TOOL_MODULE } from "./jump";
import { MOVEMENT_TOOL_MODULE } from "./movement";
import { PUNCH_TOOL_MODULE } from "./punch";
import { ROCKET_TOOL_MODULE } from "./rocket";
import { TELEPORT_TOOL_MODULE } from "./teleport";
import type { ToolModule } from "./types";
import { VOLATY_SKIP_TOOL_DIE_TOOL_MODULE } from "./volaty-skip-tool-die";

function defineToolModules<const Modules extends readonly ToolModule[]>(modules: Modules): Modules {
  return modules;
}

export const TOOL_MODULES = defineToolModules([
  MOVEMENT_TOOL_MODULE,
  JUMP_TOOL_MODULE,
  HOOKSHOT_TOOL_MODULE,
  DASH_TOOL_MODULE,
  BRAKE_TOOL_MODULE,
  BUILD_WALL_TOOL_MODULE,
  BASKETBALL_TOOL_MODULE,
  ROCKET_TOOL_MODULE,
  PUNCH_TOOL_MODULE,
  TELEPORT_TOOL_MODULE,
  DEPLOY_WALLET_TOOL_MODULE,
  BOMB_THROW_TOOL_MODULE,
  BLAZE_PREPARE_BOMB_TOOL_MODULE,
  VOLATY_SKIP_TOOL_DIE_TOOL_MODULE,
  BALANCE_TOOL_MODULE,
  AWM_SHOOT_TOOL_MODULE
] as const);

export const TOOL_REGISTRY = Object.fromEntries(
  TOOL_MODULES.map((module) => [module.id, module.definition] as const)
) as unknown as Record<(typeof TOOL_MODULES)[number]["id"], ToolContentDefinition>;

export const TOOL_EXECUTOR_REGISTRY = Object.fromEntries(
  TOOL_MODULES.map((module) => [module.id, module.execute] as const)
) as unknown as Record<(typeof TOOL_MODULES)[number]["id"], ToolExecutor>;


export const TOOL_DIE_FACES = [
  JUMP_TOOL_MODULE,
  HOOKSHOT_TOOL_MODULE,
  BASKETBALL_TOOL_MODULE,
  BUILD_WALL_TOOL_MODULE,
  ROCKET_TOOL_MODULE,
  PUNCH_TOOL_MODULE
].flatMap((module) =>
  module.dieFace
    ? [
        {
          toolId: module.id,
          ...module.dieFace
        }
      ]
    : []
) as readonly ({
  toolId: (typeof TOOL_MODULES)[number]["id"];
} & Omit<ToolDieFaceContentDefinition, "toolId">)[];
