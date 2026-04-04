import type {
  GameSnapshot,
  PlayerSnapshot,
  SummonSnapshot,
  TileDefinition
} from "@watcher/shared";
import type { PendingStateTransitionPlayback } from "./presentationPlayback";

// Future state transitions are rolled back from the authoritative snapshot so visuals change at the right time.
export function resolveDisplayedTiles(
  snapshot: GameSnapshot,
  pendingTransitions: PendingStateTransitionPlayback[]
): TileDefinition[] {
  const tilesByKey = new Map(
    snapshot.tiles.map((tile) => [
      tile.key,
      {
        ...tile
      }
    ] as const)
  );

  for (const transition of pendingTransitions) {
    for (const tileTransition of transition.tileTransitions) {
      const currentTile = tilesByKey.get(tileTransition.key);

      if (!currentTile) {
        continue;
      }

      tilesByKey.set(tileTransition.key, {
        ...currentTile,
        type: tileTransition.before.type,
        durability: tileTransition.before.durability,
        direction: tileTransition.before.direction
      });
    }
  }

  return Array.from(tilesByKey.values());
}

export function resolveDisplayedSummons(
  snapshot: GameSnapshot,
  pendingTransitions: PendingStateTransitionPlayback[]
): SummonSnapshot[] {
  const summonsById = new Map(
    snapshot.summons.map((summon) => [
      summon.instanceId,
      {
        ...summon
      }
    ] as const)
  );

  for (const transition of pendingTransitions) {
    for (const summonTransition of transition.summonTransitions) {
      if (summonTransition.before && !summonTransition.after) {
        summonsById.set(summonTransition.instanceId, {
          ...summonTransition.before
        });
        continue;
      }

      if (!summonTransition.before && summonTransition.after) {
        summonsById.delete(summonTransition.instanceId);
        continue;
      }

      if (summonTransition.before) {
        summonsById.set(summonTransition.instanceId, {
          ...summonTransition.before
        });
      }
    }
  }

  return Array.from(summonsById.values());
}

export function resolveDisplayedPlayers(
  snapshot: GameSnapshot,
  pendingTransitions: PendingStateTransitionPlayback[]
): PlayerSnapshot[] {
  const playersById = new Map(
    snapshot.players.map((player) => {
      const clonedPlayer: PlayerSnapshot = {
        ...player,
        characterState: { ...player.characterState },
        position: { ...player.position },
        spawnPosition: { ...player.spawnPosition },
        tools: player.tools.map((tool) => ({
          ...tool,
          params: { ...tool.params }
        })),
        turnFlags: [...player.turnFlags]
      };

      return [player.id, clonedPlayer] as const;
    })
  );

  for (const transition of pendingTransitions) {
    for (const playerTransition of transition.playerTransitions) {
      const currentPlayer = playersById.get(playerTransition.playerId);

      if (!currentPlayer) {
        continue;
      }

      playersById.set(playerTransition.playerId, {
        ...currentPlayer,
        boardVisible: playerTransition.before.boardVisible
      });
    }
  }

  return Array.from(playersById.values());
}
