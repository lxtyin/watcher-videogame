import { create } from "zustand";
import type { Client as ColyseusClient, Room } from "colyseus.js";
import { isDirectionalTool, type Direction, type GameSnapshot, type ToolId } from "@watcher/shared";

type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";
export type SelectedActionId = "move" | ToolId;

interface GameStore {
  connectionStatus: ConnectionStatus;
  lastError: string | null;
  sessionId: string | null;
  room: Room | null;
  client: ColyseusClient | null;
  snapshot: GameSnapshot | null;
  simulationTimeMs: number;
  manualTimeControl: boolean;
  selectedActionId: SelectedActionId;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastError: (message: string | null) => void;
  setSession: (client: ColyseusClient, room: Room) => void;
  clearSession: () => void;
  setSnapshot: (snapshot: GameSnapshot) => void;
  setSelectedActionId: (actionId: SelectedActionId) => void;
  rollDice: () => void;
  endTurn: () => void;
  useInstantTool: () => void;
  performDirectionalAction: (direction: Direction) => void;
  advanceTime: (ms: number) => void;
  tickRealTime: (ms: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  connectionStatus: "idle",
  lastError: null,
  sessionId: null,
  room: null,
  client: null,
  snapshot: null,
  simulationTimeMs: 0,
  manualTimeControl: false,
  selectedActionId: "move",
  setConnectionStatus: (connectionStatus) => {
    set({ connectionStatus });
  },
  setLastError: (lastError) => {
    set({ lastError });
  },
  setSession: (client, room) => {
    set({
      client,
      room,
      sessionId: room.sessionId,
      connectionStatus: "connected",
      lastError: null
    });
  },
  clearSession: () => {
    set({
      client: null,
      room: null,
      sessionId: null,
      snapshot: null,
      simulationTimeMs: 0,
      manualTimeControl: false,
      selectedActionId: "move",
      connectionStatus: "disconnected"
    });
  },
  setSnapshot: (snapshot) => {
    set({ snapshot });
  },
  setSelectedActionId: (selectedActionId) => {
    set({ selectedActionId });
  },
  rollDice: () => {
    const room = get().room;

    if (!room) {
      return;
    }

    room.send("rollDice");
  },
  endTurn: () => {
    const room = get().room;

    if (!room) {
      return;
    }

    room.send("endTurn");
  },
  useInstantTool: () => {
    const room = get().room;
    const selectedActionId = get().selectedActionId;

    if (!room || selectedActionId === "move" || isDirectionalTool(selectedActionId)) {
      return;
    }

    room.send("useTool", { toolId: selectedActionId });
  },
  performDirectionalAction: (direction) => {
    const room = get().room;
    const selectedActionId = get().selectedActionId;

    if (!room) {
      return;
    }

    if (selectedActionId === "move") {
      room.send("move", { direction });
      return;
    }

    room.send("useTool", { toolId: selectedActionId, direction });
  },
  advanceTime: (ms) => {
    set((state) => ({
      simulationTimeMs: state.simulationTimeMs + ms,
      // Automated tests take over the clock once they call window.advanceTime.
      manualTimeControl: true
    }));
  },
  tickRealTime: (ms) => {
    if (get().manualTimeControl) {
      return;
    }

    set((state) => ({
      simulationTimeMs: state.simulationTimeMs + ms
    }));
  }
}));
