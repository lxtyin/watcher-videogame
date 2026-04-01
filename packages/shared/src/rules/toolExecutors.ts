import type { ToolId } from "../types";
import { resolveBuildWallTool, resolveDeployWalletTool } from "./executors/boardTools";
import { resolveBalanceTool, resolveBombThrowTool } from "./executors/characterTools";
import {
  resolveBrakeTool,
  resolveDashTool,
  resolveHookshotTool,
  resolveJumpTool,
  resolveMovementTool,
  resolveTeleportTool
} from "./executors/movementTools";
import { resolveBasketballTool, resolveRocketTool } from "./executors/projectileTools";
import type { ToolExecutor } from "./executors/types";

// Tool execution now resolves through grouped registries so adding a new tool no longer grows one file indefinitely.
export const TOOL_EXECUTORS: Record<ToolId, ToolExecutor> = {
  movement: resolveMovementTool,
  jump: resolveJumpTool,
  hookshot: resolveHookshotTool,
  dash: resolveDashTool,
  brake: resolveBrakeTool,
  buildWall: resolveBuildWallTool,
  bombThrow: resolveBombThrowTool,
  balance: resolveBalanceTool,
  deployWallet: resolveDeployWalletTool,
  basketball: resolveBasketballTool,
  rocket: resolveRocketTool,
  teleport: resolveTeleportTool
};
