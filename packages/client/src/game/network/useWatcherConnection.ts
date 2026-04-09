import { useCallback, useEffect, useRef } from "react";
import type { Room } from "colyseus.js";
import { Client } from "colyseus.js";
import {
  WATCHER_ROOM_NAME,
  getToolAvailability,
  type CustomMapDefinition,
  type GameMapId
} from "@watcher/shared";
import { getRandomPetId, resolvePetId } from "../content/pets";
import { useGameStore } from "../state/useGameStore";
import { deserializeRoomState } from "../utils/deserializeRoomState";

interface CreateRoomInput {
  customMap?: CustomMapDefinition;
  mapId?: GameMapId | "custom";
  petId: string;
  playerName: string;
}

interface JoinRoomInput {
  petId: string;
  playerName: string;
  roomCode: string;
}

interface StoredRoomSession {
  petId: string;
  playerName: string;
  reconnectionToken: string;
  roomCode: string;
}

interface StoredPlayerProfile {
  petId: string;
  playerName: string;
}

interface WatcherConnectionControls {
  clearStoredRoomSession: () => void;
  createRoom: (input: CreateRoomInput) => Promise<string | null>;
  joinRoom: (input: JoinRoomInput) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  reconnectToStoredRoom: (roomCode?: string | null) => Promise<boolean>;
}

const PLAYER_NAME_STORAGE_KEY = "watcher.player_name";
const PLAYER_PET_STORAGE_KEY = "watcher.player_pet";
const ROOM_SESSION_STORAGE_KEY = "watcher.room_session";

function getServerUrl(): string {
  return import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";
}

function normalizePlayerName(playerName: string | null | undefined): string {
  return typeof playerName === "string" ? playerName.trim() : "";
}

function normalizePetId(petId: string): string {
  return resolvePetId(petId);
}

function normalizeRoomCode(roomCode: string | null | undefined): string {
  return typeof roomCode === "string" ? roomCode.trim() : "";
}

function createRandomPlayerName(): string {
  return `玩家-${Math.floor(100 + Math.random() * 900)}`;
}

function loadStoredPlayerName(): string {
  try {
    return window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function loadStoredPetId(): string {
  try {
    return window.localStorage.getItem(PLAYER_PET_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function persistStoredPlayerProfile(profile: StoredPlayerProfile): void {
  try {
    window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, profile.playerName);
    window.localStorage.setItem(PLAYER_PET_STORAGE_KEY, normalizePetId(profile.petId));
  } catch {
    // Prototype persistence is best-effort only.
  }
}

export function getStoredPlayerProfile(): StoredPlayerProfile {
  const profile = {
    playerName: normalizePlayerName(loadStoredPlayerName()) || createRandomPlayerName(),
    petId: normalizePetId(loadStoredPetId() || getRandomPetId())
  };

  persistStoredPlayerProfile(profile);
  return profile;
}

export function getStoredPlayerName(): string {
  return getStoredPlayerProfile().playerName;
}

export function getStoredPetId(): string {
  return getStoredPlayerProfile().petId;
}

export function hasStoredRoomSessionForRoom(roomCode: string): boolean {
  const storedSession = loadStoredRoomSession();
  return storedSession?.roomCode === normalizeRoomCode(roomCode);
}

function loadStoredRoomSession(): StoredRoomSession | null {
  try {
    const raw = window.localStorage.getItem(ROOM_SESSION_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredRoomSession>;

    if (
      typeof parsed.playerName !== "string" ||
      typeof parsed.reconnectionToken !== "string" ||
      typeof parsed.roomCode !== "string"
    ) {
      return null;
    }

    return {
      petId: normalizePetId(
        typeof parsed.petId === "string" ? parsed.petId : getStoredPlayerProfile().petId
      ),
      playerName: parsed.playerName,
      reconnectionToken: parsed.reconnectionToken,
      roomCode: parsed.roomCode
    };
  } catch {
    return null;
  }
}

function persistRoomSession(room: Room, profile: StoredPlayerProfile): void {
  try {
    window.localStorage.setItem(
      ROOM_SESSION_STORAGE_KEY,
      JSON.stringify({
        petId: normalizePetId(profile.petId),
        playerName: profile.playerName,
        reconnectionToken: room.reconnectionToken,
        roomCode: room.roomId
      } satisfies StoredRoomSession)
    );
  } catch {
    // Prototype persistence is best-effort only.
  }
}

function clearStoredRoomSession(): void {
  try {
    window.localStorage.removeItem(ROOM_SESSION_STORAGE_KEY);
  } catch {
    // Prototype persistence is best-effort only.
  }
}

// Room connection commands stay explicit so home, lobby, and reconnect flows can share one source.
export function useWatcherConnection(roomCode: string | null): WatcherConnectionControls {
  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);
  const setLastError = useGameStore((state) => state.setLastError);
  const setSession = useGameStore((state) => state.setSession);
  const setSnapshot = useGameStore((state) => state.setSnapshot);
  const setSelectedToolInstanceId = useGameStore((state) => state.setSelectedToolInstanceId);
  const clearSession = useGameStore((state) => state.clearSession);
  const activeRoomRef = useRef<Room | null>(null);
  const manualLeaveRef = useRef(false);
  const reconnectAttemptedForRoomRef = useRef<string | null>(null);

  const bindRoom = useCallback(
    (client: Client, room: Room, profile: StoredPlayerProfile) => {
      activeRoomRef.current = room;
      persistStoredPlayerProfile(profile);
      persistRoomSession(room, profile);
      setSession(client, room);

      room.onStateChange((state) => {
        const snapshot = deserializeRoomState(state);
        const currentState = useGameStore.getState();
        const me = snapshot.players.find((entry) => entry.id === currentState.sessionId) ?? null;
        const selectedTool = me?.tools.find(
          (tool) => tool.instanceId === currentState.selectedToolInstanceId
        );
        const selectedToolStillUsable =
          snapshot.roomPhase === "in_game" &&
          selectedTool &&
          getToolAvailability(selectedTool, me?.tools ?? []).usable;

        if (!selectedToolStillUsable) {
          setSelectedToolInstanceId(null);
        }

        setSnapshot(snapshot);
      });

      room.onLeave((code) => {
        activeRoomRef.current = null;
        clearSession();

        if (manualLeaveRef.current) {
          manualLeaveRef.current = false;
          return;
        }

        clearStoredRoomSession();
        setLastError(code === 4001 ? "You were removed from the room." : `Room closed with code ${code}.`);
      });

      room.onError((code, message) => {
        setConnectionStatus("error");
        setLastError(code === 4001 ? message || "You were removed from the room." : `Colyseus error ${code}: ${message}`);
      });
    },
    [clearSession, setConnectionStatus, setLastError, setSelectedToolInstanceId, setSession, setSnapshot]
  );

  const connectToRoom = useCallback(
    async (
      connect: (client: Client) => Promise<Room>,
      profile: StoredPlayerProfile
    ): Promise<Room | null> => {
      const normalizedProfile = {
        playerName: normalizePlayerName(profile.playerName),
        petId: normalizePetId(profile.petId)
      };

      if (!normalizedProfile.playerName) {
        setLastError("Please enter a player name.");
        setConnectionStatus("error");
        return null;
      }

      if (activeRoomRef.current) {
        manualLeaveRef.current = true;
        clearStoredRoomSession();
        await activeRoomRef.current.leave(true);
      }

      const client = new Client(getServerUrl());
      setConnectionStatus("connecting");
      setLastError(null);

      try {
        const room = await connect(client);
        bindRoom(client, room, normalizedProfile);
        return room;
      } catch (error: unknown) {
        setConnectionStatus("error");
        setLastError(error instanceof Error ? error.message : "Unknown connection error");
        return null;
      }
    },
    [bindRoom, setConnectionStatus, setLastError]
  );

  const createRoom = useCallback(
    async ({ customMap, mapId, petId, playerName }: CreateRoomInput): Promise<string | null> => {
      const room = await connectToRoom(
        (client) =>
          client.create(WATCHER_ROOM_NAME, {
            mapId: customMap ? "custom" : mapId,
            customMap,
            requestedPetId: normalizePetId(petId),
            requestedPlayerName: normalizePlayerName(playerName)
          }),
        { playerName, petId }
      );

      return room?.roomId ?? null;
    },
    [connectToRoom]
  );

  const joinRoom = useCallback(
    async ({ petId, playerName, roomCode }: JoinRoomInput): Promise<boolean> => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);

      if (!normalizedRoomCode) {
        setLastError("Please enter a room code.");
        setConnectionStatus("error");
        return false;
      }

      const room = await connectToRoom(
        (client) =>
          client.joinById(normalizedRoomCode, {
            requestedPetId: normalizePetId(petId),
            requestedPlayerName: normalizePlayerName(playerName)
          }),
        { playerName, petId }
      );

      return room !== null;
    },
    [connectToRoom, setConnectionStatus, setLastError]
  );

  const reconnectToStoredRoom = useCallback(
    async (expectedRoomCode?: string | null): Promise<boolean> => {
      const storedSession = loadStoredRoomSession();

      if (!storedSession) {
        return false;
      }

      if (expectedRoomCode && storedSession.roomCode !== expectedRoomCode) {
        return false;
      }

      const room = await connectToRoom(
        (client) => client.reconnect(storedSession.reconnectionToken),
        {
          playerName: storedSession.playerName,
          petId: storedSession.petId
        }
      );

      return room !== null;
    },
    [connectToRoom]
  );

  const leaveRoom = useCallback(async (): Promise<void> => {
    clearStoredRoomSession();
    setLastError(null);

    if (activeRoomRef.current) {
      manualLeaveRef.current = true;
      await activeRoomRef.current.leave(true);
      activeRoomRef.current = null;
    } else {
      clearSession();
    }
  }, [clearSession, setLastError]);

  useEffect(() => {
    if (!roomCode || activeRoomRef.current || reconnectAttemptedForRoomRef.current === roomCode) {
      return;
    }

    reconnectAttemptedForRoomRef.current = roomCode;
    void reconnectToStoredRoom(roomCode);
  }, [reconnectToStoredRoom, roomCode]);

  return {
    clearStoredRoomSession,
    createRoom,
    joinRoom,
    leaveRoom,
    reconnectToStoredRoom
  };
}
