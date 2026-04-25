import { appendDraftPresentationEvents } from "../rules/actionDraft";
import { createEffectEvent } from "../rules/actionPresentation";
import {
  appendTerrainTrigger,
  mutateTerrainTile
} from "./helpers";
import type { TerrainModule } from "./types";

const TOWER_IMPACT_EFFECT_MS = 360;

export const TOWER_TERRAIN_MODULE: TerrainModule = {
  accent: "#8e8ea0",
  getTextDescription: (tile) => ({
    title: tile.faction === "black" ? "黑队塔" : "白队塔",
    description: "会阻挡移动。敌方角色撞击时耐久 -1，耐久归零后被击碎。",
    details: [`当前耐久 ${Math.max(0, tile.durability)}`]
  }),
  label: "塔",
  onImpact: (context) => {
    if (
      context.source.kind !== "player" ||
      !context.tile.faction ||
      !context.source.player.teamId ||
      context.source.player.teamId === context.tile.faction
    ) {
      return;
    }

    appendDraftPresentationEvents(context.draft, [
      createEffectEvent(
        `${context.draft.sourceId}:tower-impact:${context.tile.key}`,
        "tower_impact",
        context.position,
        [context.position],
        context.startMs,
        TOWER_IMPACT_EFFECT_MS
      )
    ]);

    const remainingDurability = Math.max(0, context.tile.durability - 1);
    mutateTerrainTile(
      context.draft,
      context.tile,
      remainingDurability > 0 ? "tower" : "floor",
      remainingDurability,
      context.startMs
    );
    appendTerrainTrigger(context.draft, {
      kind: "tower",
      playerId: context.source.player.id,
      position: context.position,
      remainingDurability,
      teamId: context.tile.faction,
      tileKey: context.tile.key
    });
  },
  type: "tower"
};
