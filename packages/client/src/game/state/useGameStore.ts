import { create } from "zustand";
import type { Client as ColyseusClient, Room } from "colyseus.js";
import {
  findToolInstance,
  getToolAvailability,
  isDirectionalTool,
  isTileTargetTool,
  type Direction,
  type GameSnapshot,
  type GridPosition
} from "@watcher/shared";

type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";
export type SelectedToolInstanceId = string | null;

interface GameStore {
  connectionStatus: ConnectionStatus;
  lastError: string | null;
  toolNotice: {
    id: number;
    message: string;
  } | null;
  sessionId: string | null;
  room: Room | null;
  client: ColyseusClient | null;
  snapshot: GameSnapshot | null;
  simulationTimeMs: number;
  manualTimeControl: boolean;
  selectedToolInstanceId: SelectedToolInstanceId;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastError: (message: string | null) => void;
  clearToolNotice: () => void;
  setSession: (client: ColyseusClient, room: Room) => void;
  clearSession: () => void;
  setSnapshot: (snapshot: GameSnapshot) => void;
  setSelectedToolInstanceId: (toolInstanceId: SelectedToolInstanceId) => void;
  showToolNotice: (message: string) => void;
  rollDice: () => void;
  endTurn: () => void;
  useInstantTool: (toolInstanceId?: string | null) => void;
  performDirectionalAction: (direction: Direction, toolInstanceId?: string | null) => void;
  performTileTargetAction: (targetPosition: GridPosition, toolInstanceId?: string | null) => void;
  advanceTime: (ms: number) => void;
  tickRealTime: (ms: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  connectionStatus: "idle",
  lastError: null,
  toolNotice: null,
  sessionId: null,
  room: null,
  client: null,
  snapshot: null,
  simulationTimeMs: 0,
  manualTimeControl: false,
  selectedToolInstanceId: null,
  setConnectionStatus: (connectionStatus) => {
    set({ connectionStatus });
  },
  setLastError: (lastError) => {
    set({ lastError });
  },
  clearToolNotice: () => {
    set({ toolNotice: null });
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
      toolNotice: null,
      simulationTimeMs: 0,
      manualTimeControl: false,
      selectedToolInstanceId: null,
      connectionStatus: "disconnected"
    });
  },
  setSnapshot: (snapshot) => {
    set({ snapshot });
  },
  setSelectedToolInstanceId: (selectedToolInstanceId) => {
    set({ selectedToolInstanceId });
  },
  showToolNotice: (message) => {
    set({
      toolNotice: {
        id: Date.now(),
        message
      }
    });
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
  useInstantTool: (toolId) => {
    const room = get().room;
    const snapshot = get().snapshot;
    const sessionId = get().sessionId;
    const selectedToolInstanceId = toolId ?? get().selectedToolInstanceId;

    if (!room || !snapshot || !sessionId || !selectedToolInstanceId) {
      return;
    }

    const me = snapshot.players.find((player) => player.id === sessionId);
    const selectedTool = me ? findToolInstance(me.tools, selectedToolInstanceId) : undefined;

    if (!selectedTool || isDirectionalTool(selectedTool.toolId) || !getToolAvailability(selectedTool, me?.tools ?? []).usable) {
      return;
    }

    room.send("useTool", { toolInstanceId: selectedToolInstanceId });
  },
  performDirectionalAction: (direction, toolInstanceId) => {
    const room = get().room;
    const snapshot = get().snapshot;
    const sessionId = get().sessionId;
    const selectedToolInstanceId = toolInstanceId ?? get().selectedToolInstanceId;

    if (!room || !snapshot || !sessionId || !selectedToolInstanceId) {
      return;
    }

    const me = snapshot.players.find((player) => player.id === sessionId);
    const selectedTool = me ? findToolInstance(me.tools, selectedToolInstanceId) : undefined;

    if (!selectedTool || !isDirectionalTool(selectedTool.toolId) || !getToolAvailability(selectedTool, me?.tools ?? []).usable) {
      return;
    }

    room.send("useTool", { toolInstanceId: selectedToolInstanceId, direction });
  },
  performTileTargetAction: (targetPosition, toolInstanceId) => {
    const room = get().room;
    const snapshot = get().snapshot;
    const sessionId = get().sessionId;
    const selectedToolInstanceId = toolInstanceId ?? get().selectedToolInstanceId;

    if (!room || !snapshot || !sessionId || !selectedToolInstanceId) {
      return;
    }

    const me = snapshot.players.find((player) => player.id === sessionId);
    const selectedTool = me ? findToolInstance(me.tools, selectedToolInstanceId) : undefined;

    if (!selectedTool || !isTileTargetTool(selectedTool.toolId) || !getToolAvailability(selectedTool, me?.tools ?? []).usable) {
      return;
    }

    room.send("useTool", { toolInstanceId: selectedToolInstanceId, targetPosition });
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
