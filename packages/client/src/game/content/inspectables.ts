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
    title: "普通地块",
    thumbnailToken: "地",
    accent: "#d5c6a1",
    description: "基础地形。大多数工具都可以在这里通过或停留。"
  },
  wall: {
    title: "实体墙",
    thumbnailToken: "墙",
    accent: "#455062",
    description: "不可穿过、不可停留的阻挡地形。"
  },
  earthWall: {
    title: "土墙",
    thumbnailToken: "土",
    accent: "#bc7441",
    description: "需要撞上或消耗额外位移点数才能破坏的脆弱墙体。"
  },
  pit: {
    title: "坑洞",
    thumbnailToken: "坑",
    accent: "#8b705f",
    description: "停留在上方时会立即死亡并回到出生点。"
  },
  lucky: {
    title: "幸运方块",
    thumbnailToken: "运",
    accent: "#d6bf70",
    description: "停留在上方时会额外投掷一次工具骰，每回合限一次。"
  },
  conveyor: {
    title: "加速带",
    thumbnailToken: "带",
    accent: "#6db0c6",
    description: "仅在平移经过时生效，顺行加速，逆行或侧行会被强制转向。"
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

  return {
    accent: definition.accent,
    description: definition.description,
    direction: tile.type === "conveyor" ? tile.direction : null,
    kindLabel: "地形",
    subtitle:
      tile.type === "conveyor" && tile.direction
        ? `${DIRECTION_LABELS[tile.direction]}传送带`
        : `坐标 (${tile.x}, ${tile.y})`,
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
    subtitle: `所有者 ${summon.ownerId}`,
    thumbnailToken: definition.label.slice(0, 1),
    title: definition.label
  };
}
