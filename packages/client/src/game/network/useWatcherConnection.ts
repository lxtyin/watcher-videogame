import { useEffect } from "react";
import type { Room } from "colyseus.js";
import { Client } from "colyseus.js";
import { WATCHER_ROOM_NAME } from "@watcher/shared";
import { useGameStore } from "../state/useGameStore";
import { deserializeRoomState } from "../utils/deserializeRoomState";

function createPlayerName(): string {
  return `Scout-${Math.random().toString(36).slice(2, 6)}`;
}

export function useWatcherConnection(): void {
  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);
  const setLastError = useGameStore((state) => state.setLastError);
  const setSession = useGameStore((state) => state.setSession);
  const setSnapshot = useGameStore((state) => state.setSnapshot);
  const setSelectedActionId = useGameStore((state) => state.setSelectedActionId);
  const clearSession = useGameStore((state) => state.clearSession);

  useEffect(() => {
    let disposed = false;
    let joinedRoom: Room | null = null;

    const serverUrl = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";
    const client = new Client(serverUrl);

    setConnectionStatus("connecting");

    // The client never computes room state locally. It only mirrors server snapshots.
    void client
      .joinOrCreate(WATCHER_ROOM_NAME, {
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
          const activePlayer =
            snapshot.players.find((entry) => entry.id === snapshot.turnInfo.currentPlayerId) ?? null;
          const selectedToolStillAvailable =
            currentState.selectedActionId !== "move" &&
            activePlayer?.availableTools.some((tool) => tool.id === currentState.selectedActionId);

          if (currentState.selectedActionId !== "move" && !selectedToolStillAvailable) {
            setSelectedActionId("move");
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
  }, [clearSession, setConnectionStatus, setLastError, setSelectedActionId, setSession, setSnapshot]);
}
