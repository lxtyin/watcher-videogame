import type { ToolParameterId } from "./schema";

export { TOOL_DIE_FACES, TOOL_REGISTRY } from "../tool-modules";

export const TOOL_PARAMETER_LABELS: Record<
  ToolParameterId,
  { label: string; unit: "point" | "tile" | "count" }
> = {
  movePoints: { label: "移动点数", unit: "point" },
  jumpDistance: { label: "飞跃距离", unit: "tile" },
  hookLength: { label: "钩锁长度", unit: "tile" },
  dashBonus: { label: "冲刺加成", unit: "point" },
  brakeRange: { label: "制动距离", unit: "tile" },
  projectileRange: { label: "射程", unit: "tile" },
  projectileBounceCount: { label: "反弹次数", unit: "count" },
  projectilePushDistance: { label: "推动距离", unit: "tile" },
  wallDurability: { label: "墙体耐久", unit: "count" },
  targetRange: { label: "施放范围", unit: "tile" },
  rocketBlastLeapDistance: { label: "炸飞距离", unit: "tile" },
  rocketSplashPushDistance: { label: "爆风推力", unit: "tile" },
  pushDistance: { label: "位移距离", unit: "tile" }
};
