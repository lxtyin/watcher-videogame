import { useEffect } from "react";
import type { Room } from "colyseus.js";
import { Client } from "colyseus.js";
import {
  DEFAULT_GAME_MAP_ID,
  WATCHER_ROOM_NAME,
  getToolAvailability,
  resolveGameMapId
} from "@watcher/shared";
import { useGameStore } from "../state/useGameStore";
import { deserializeRoomState } from "../utils/deserializeRoomState";

// Player names stay lightweight and local because identity is not a prototype focus yet.
function createPlayerName(): string {
  return `Scout-${Math.random().toString(36).slice(2, 6)}`;
}

function getRequestedMapId(): string {
  const url = new URL(window.location.href);
  return resolveGameMapId(url.searchParams.get("map") ?? DEFAULT_GAME_MAP_ID);
}

// Connection setup mirrors room state into the local store and keeps selection in sync.
export function useWatcherConnection(): void {
  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);
  const setLastError = useGameStore((state) => state.setLastError);
  const setSession = useGameStore((state) => state.setSession);
  const setSnapshot = useGameStore((state) => state.setSnapshot);
  const setSelectedToolInstanceId = useGameStore((state) => state.setSelectedToolInstanceId);
  const clearSession = useGameStore((state) => state.clearSession);

  useEffect(() => {
    let disposed = false;
    let joinedRoom: Room | null = null;

    const serverUrl = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";
    const client = new Client(serverUrl);
    const requestedMapId = getRequestedMapId();

    setConnectionStatus("connecting");

    // The client never computes room state locally. It only mirrors server snapshots.
    void client
      .joinOrCreate(WATCHER_ROOM_NAME, {
        mapId: requestedMapId,
        requestedPlayerName: createPlayerName()
      })
      .then((room) => {
        if (disposed) {
          void room.leave(true);
          return;
        }

        joinedRoom = room;
        setSession(client, room);
        room.onStateChange((state) => {
          // Convert Colyseus schema objects into plain UI-friendly data.
          const snapshot = deserializeRoomState(state);
          const currentState = useGameStore.getState();
          const me = snapshot.players.find((entry) => entry.id === currentState.sessionId) ?? null;
          const selectedTool = me?.tools.find(
            (tool) => tool.instanceId === currentState.selectedToolInstanceId
          );
          const selectedToolStillUsable =
            selectedTool && getToolAvailability(selectedTool, me?.tools ?? []).usable;

          if (!selectedToolStillUsable) {
            setSelectedToolInstanceId(null);
          }

          setSnapshot(snapshot);
        });

        room.onLeave((code) => {
          clearSession();
          setLastError(`Room closed with code ${code}.`);
        });

        room.onError((code, message) => {
          setConnectionStatus("error");
          setLastError(`Colyseus error ${code}: ${message}`);
        });
      })
      .catch((error: unknown) => {
        setConnectionStatus("error");
        setLastError(error instanceof Error ? error.message : "Unknown connection error");
      });

    return () => {
      disposed = true;

      if (joinedRoom) {
        void joinedRoom.leave(true);
      }

      clearSession();
    };
  }, [clearSession, setConnectionStatus, setLastError, setSelectedToolInstanceId, setSession, setSnapshot]);
}
