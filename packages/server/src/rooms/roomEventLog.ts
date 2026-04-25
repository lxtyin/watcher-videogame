import {
  getToolDefinition,
  type EventType,
  type TriggeredSummonEffect,
  type TriggeredTerrainEffect
} from "@watcher/shared";
import { EventLogEntryState, WatcherState } from "../schema/WatcherState";

// Event logging keeps the synced room feed short so state patches stay lightweight.
export function pushRoomEvent(state: WatcherState, type: EventType, message: string): void {
  const entry = new EventLogEntryState();
  entry.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  entry.type = type;
  entry.message = message;
  entry.createdAt = Date.now();

  state.eventLog.push(entry);

  while (state.eventLog.length > 10) {
    state.eventLog.shift();
  }
}

// Terrain effect logs are derived from shared effect payloads instead of custom room logic.
export function pushTerrainEvents(
  state: WatcherState,
  actorId: string,
  triggeredTerrainEffects: TriggeredTerrainEffect[]
): void {
  for (const terrainEffect of triggeredTerrainEffects) {
    const affectedPlayer = state.players.get(terrainEffect.playerId);
    const actor = state.players.get(actorId);

    if (!affectedPlayer) {
      continue;
    }

    if (terrainEffect.kind === "pit") {
      pushRoomEvent(
        state,
        terrainEffect.respawnPosition ? "player_respawned" : "terrain_triggered",
        terrainEffect.respawnPosition
          ? `${affectedPlayer.name} fell through a pit and respawned at (${terrainEffect.respawnPosition.x}, ${terrainEffect.respawnPosition.y}).`
          : `${affectedPlayer.name} fell through a pit and was eliminated.`
      );
      continue;
    }

    if (terrainEffect.kind === "poison") {
      pushRoomEvent(
        state,
        terrainEffect.respawnPosition ? "player_respawned" : "terrain_triggered",
        terrainEffect.respawnPosition
          ? `${affectedPlayer.name} was knocked down by poison and respawned at (${terrainEffect.respawnPosition.x}, ${terrainEffect.respawnPosition.y}).`
          : `${affectedPlayer.name} was knocked down by poison and was eliminated.`
      );
      continue;
    }

    if (terrainEffect.kind === "cannon") {
      pushRoomEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} triggered a cannon facing ${terrainEffect.direction}.`
      );
      continue;
    }

    if (terrainEffect.kind === "lucky") {
      pushRoomEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} landed on a lucky block and gained ${getToolDefinition(terrainEffect.grantedTool.toolId).label}.`
      );
      continue;
    }

    if (terrainEffect.kind === "boxing_ball") {
      pushRoomEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} rammed a boxing ball for ${terrainEffect.impactStrength} and gained ${getToolDefinition(terrainEffect.grantedTool.toolId).label}.`
      );
      continue;
    }

    if (terrainEffect.kind === "team_camp") {
      pushRoomEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} used the team camp and gained ${getToolDefinition(terrainEffect.grantedTool.toolId).label}.`
      );
      continue;
    }

    if (terrainEffect.kind === "tower") {
      pushRoomEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} damaged the ${terrainEffect.teamId} tower. Remaining durability ${terrainEffect.remainingDurability}.`
      );
      continue;
    }

    if (terrainEffect.kind === "conveyor_boost" && actor) {
      pushRoomEvent(
        state,
        "terrain_triggered",
        `${actor.name} rode a conveyor for +${terrainEffect.bonusMovePoints} move points.`
      );
      continue;
    }

    if (terrainEffect.kind === "conveyor_turn" && actor) {
      pushRoomEvent(
        state,
        "terrain_triggered",
        `${actor.name} was redirected from ${terrainEffect.fromDirection} to ${terrainEffect.toDirection}.`
      );
    }
  }
}

export function pushSummonEvents(
  state: WatcherState,
  triggeredSummonEffects: TriggeredSummonEffect[]
): void {
  for (const summonEffect of triggeredSummonEffects) {
    if (summonEffect.kind !== "wallet_pickup") {
      continue;
    }

    const player = state.players.get(summonEffect.playerId);

    if (!player) {
      continue;
    }

    pushRoomEvent(
      state,
      "summon_triggered",
      `${player.name} picked up a wallet and gained ${getToolDefinition(summonEffect.grantedTool.toolId).label}.`
    );
  }
}
