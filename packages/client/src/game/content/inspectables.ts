import {
  getCharacterDefinition,
  getSummonDefinition,
  type Direction,
  type PlayerSnapshot,
  type SummonSnapshot,
  type TileDefinition,
  type TileType
} from "@watcher/shared";

export interface SceneInspectionCardData {
  accent: string;
  description: string;
  direction?: Direction | null;
  kindLabel: string;
  subtitle?: string;
  thumbnailToken: string;
  title: string;
}

interface TileInspectionDefinition {
  accent: string;
  description: string;
  thumbnailToken: string;
  title: string;
}

const TILE_INSPECTION_DEFINITIONS: Record<TileType, TileInspectionDefinition> = {
  floor: {
    title: "普通地板",
    thumbnailToken: "地",
    accent: "#d5c6a1",
    description: "基础地形。大多数工具都可以在这里经过、停留或落点。"
  },
  wall: {
    title: "墙壁",
    thumbnailToken: "墙",
    accent: "#455062",
    description: "阻挡地面移动和投射物，但飞跃仍然可以越过。"
  },
  earthWall: {
    title: "土墙",
    thumbnailToken: "土",
    accent: "#bc7441",
    description: "会阻挡投射物；地面移动撞上时会被撞碎并消耗额外移动点数。"
  },
  highwall: {
    title: "高墙",
    thumbnailToken: "高",
    accent: "#556273",
    description: "带铁栅栏的高墙，会阻挡地面移动、飞跃穿越与投射物。"
  },
  poison: {
    title: "毒气",
    thumbnailToken: "毒",
    accent: "#6da552",
    description: "停留在上面时会被毒气放倒，并立刻送回出生点。"
  },
  pit: {
    title: "坑洞",
    thumbnailToken: "坑",
    accent: "#8b705f",
    description: "经过时会直接坠落并送回出生点，不能停留结算后再触发。"
  },
  cannon: {
    title: "大炮",
    thumbnailToken: "炮",
    accent: "#8c6850",
    description: "停留时会立刻朝当前朝向发射一枚无来源火箭。"
  },
  lucky: {
    title: "幸运方块",
    thumbnailToken: "运",
    accent: "#d6bf70",
    description: "停留时会奖励一个工具，并立刻切换为空幸运方块。"
  },
  emptyLucky: {
    title: "空幸运方块",
    thumbnailToken: "空",
    accent: "#b7a36a",
    description: "已经被拾取的幸运方块，会在下一位玩家回合开始时恢复。"
  },
  start: {
    title: "出生点",
    thumbnailToken: "起",
    accent: "#7dc8be",
    description: "地图的起始位置。玩家被送回出生点时会回到这里。"
  },
  goal: {
    title: "终点",
    thumbnailToken: "终",
    accent: "#d97a70",
    description: "只会在自己的回合停留时触发，用于竞速模式的到达结算。"
  },
  conveyor: {
    title: "传送带",
    thumbnailToken: "带",
    accent: "#6db0c6",
    description: "平移经过时生效。顺行会加速，逆行或侧行会被强制转向。"
  }
};

const DIRECTION_LABELS: Record<Direction, string> = {
  up: "朝上",
  right: "朝右",
  down: "朝下",
  left: "朝左"
};

// Inspection content lives in one client registry so the scene can stay free of copy branches.
export function describeTileInspection(tile: TileDefinition): SceneInspectionCardData {
  const definition = TILE_INSPECTION_DEFINITIONS[tile.type];
  const directionalLabel =
    (tile.type === "conveyor" || tile.type === "cannon") && tile.direction
      ? `${DIRECTION_LABELS[tile.direction]}${tile.type === "cannon" ? "大炮" : "传送带"}`
      : `坐标 (${tile.x}, ${tile.y})`;

  return {
    accent: definition.accent,
    description: definition.description,
    direction: tile.type === "conveyor" || tile.type === "cannon" ? tile.direction : null,
    kindLabel: "地形",
    subtitle: directionalLabel,
    thumbnailToken: definition.thumbnailToken,
    title: definition.title
  };
}

// Player inspection cards reuse shared character metadata while keeping scene-facing color accents.
export function describePlayerInspection(player: PlayerSnapshot): SceneInspectionCardData {
  const character = getCharacterDefinition(player.characterId);

  return {
    accent: player.color,
    description: character.summary,
    kindLabel: "角色",
    subtitle: `${character.label} · 工具 ${player.tools.length} 个`,
    thumbnailToken: character.label.slice(0, 1),
    title: player.name
  };
}

// Summon inspection cards expose the summon purpose without coupling BoardScene to summon ids.
export function describeSummonInspection(summon: SummonSnapshot): SceneInspectionCardData {
  const definition = getSummonDefinition(summon.summonId);

  return {
    accent: "#8d7a3d",
    description: definition.description,
    kindLabel: "召唤物",
    subtitle: `所属者 ${summon.ownerId}`,
    thumbnailToken: definition.label.slice(0, 1),
    title: definition.label
  };
}
