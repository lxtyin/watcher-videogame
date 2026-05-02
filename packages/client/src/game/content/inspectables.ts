import {
  getCharacterDefinition,
  getDicePigCarryCode,
  getSummonDefinition,
  getTerrainAccent,
  getTerrainTextDescription,
  getToolDefinition,
  type Direction,
  type PlayerSnapshot,
  type SummonSnapshot,
  type TileDefinition
} from "@watcher/shared";
import {
  createTerrainThumbnailEntryForTile,
  resolveTerrainThumbnailSymbol,
  type TerrainThumbnailEntry
} from "../assets/board/terrainThumbnailCatalog";

export interface SceneInspectionCardData {
  accent: string;
  description: string;
  details?: readonly string[];
  direction?: Direction | null;
  kindLabel: string;
  subtitle?: string;
  terrainThumbnail?: {
    entry: TerrainThumbnailEntry;
    thumbnailUrl: string | null;
  };
  thumbnailToken: string;
  title: string;
}

// Tile inspection pulls all text from shared terrain modules; the client only chooses the thumbnail asset.
export function describeTileInspection(
  tile: TileDefinition,
  thumbnailUrls: Partial<Record<string, string>> = {}
): SceneInspectionCardData {
  const description = getTerrainTextDescription(tile);
  const details = description.details ?? [];
  const thumbnailSymbol = resolveTerrainThumbnailSymbol(tile);
  const terrainThumbnail = {
    entry: createTerrainThumbnailEntryForTile(tile),
    thumbnailUrl: thumbnailSymbol ? thumbnailUrls[thumbnailSymbol] ?? null : null
  };

  return {
    accent: getTerrainAccent(tile.type),
    description: description.description,
    direction: tile.direction,
    kindLabel: "地形",
    ...(details.length ? { details } : {}),
    subtitle: `坐标 (${tile.x}, ${tile.y})`,
    terrainThumbnail,
    thumbnailToken: description.title.slice(0, 1),
    title: description.title
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
  const carryCode = summon.summonId === "dicePig" ? getDicePigCarryCode(summon.state) : null;
  const dicePigSubtitle =
    carryCode === null
      ? null
      : carryCode === "none"
        ? "不携带奖励"
        : carryCode === "random_tool"
          ? "携带随机工具骰"
          : carryCode.startsWith("point:")
            ? `携带移动 ${carryCode.slice("point:".length)}`
            : `携带${getToolDefinition(carryCode.slice("tool:".length) as Parameters<typeof getToolDefinition>[0]).label}`;

  return {
    accent: "#8d7a3d",
    description: definition.description,
    kindLabel: "召唤物",
    subtitle: dicePigSubtitle ?? `所属者 ${summon.ownerId}`,
    thumbnailToken: definition.label.slice(0, 1),
    title: definition.label
  };
}
