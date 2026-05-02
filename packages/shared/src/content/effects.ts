import type { PresentationEffectContentDefinition } from "./schema";

function defineEffectRegistry<const Registry extends Record<string, PresentationEffectContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

export const EFFECT_REGISTRY = defineEffectRegistry({
  boxing_ball_hit: {
    label: "拳击球摇摆",
    description: "拳击球被撞击后出现的摇摆表现。"
  },
  earth_wall_break: {
    label: "土墙碎裂",
    description: "土墙被撞碎时的破裂表现。"
  },
  lucky_claim: {
    label: "幸运方块消散",
    description: "幸运方块被领取时的上升与消散表现。"
  },
  dice_reward_claim: {
    label: "骰子奖励升起",
    description: "奖励骰子被拾取或掉落奖励时的上升虚化表现。"
  },
  stun_clear: {
    label: "Stun clear",
    description: "A short reaction when stun wears off and the turn is skipped."
  },
  punch_player_hit: {
    label: "拳击命中玩家",
    description: "拳击命中玩家时的冲击表现。"
  },
  punch_wall_hit: {
    label: "拳击命中墙壁",
    description: "拳击命中墙壁时的反震表现。"
  },
  tower_impact: {
    label: "Tower impact",
    description: "Impact pulse and debris when a tower is rammed."
  },
  rocket_explosion: {
    label: "火箭爆炸",
    description: "火箭命中后的范围爆炸表现。"
  }
} as const);
