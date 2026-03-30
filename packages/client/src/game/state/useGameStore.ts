import { create } from "zustand";
import type { Client as ColyseusClient, Room } from "colyseus.js";
import {
  findToolInstance,
  getToolAvailability,
  isDirectionalTool,
  isTileTargetTool,
  type CharacterId,
  type Direction,
  type GameSnapshot,
  type GridPosition,
  type SequencedActionPresentation,
  type ToolId
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
  actionPresentationQueue: SequencedActionPresentation[];
  activeActionPresentation: SequencedActionPresentation | null;
  activeActionPresentationStartedAtMs: number | null;
  lastQueuedPresentationSequence: number;
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
  setCharacter: (characterId: CharacterId) => void;
  grantDebugTool: (toolId: ToolId) => void;
  useInstantTool: (toolInstanceId?: string | null) => void;
  performDirectionalAction: (direction: Direction, toolInstanceId?: string | null) => void;
  performTileTargetAction: (targetPosition: GridPosition, toolInstanceId?: string | null) => void;
  advanceTime: (ms: number) => void;
  tickRealTime: (ms: number) => void;
}

interface PresentationPlaybackState {
  actionPresentationQueue: SequencedActionPresentation[];
  activeActionPresentation: SequencedActionPresentation | null;
  activeActionPresentationStartedAtMs: number | null;
  simulationTimeMs: number;
}

// Presentation playback advances automatically so the scene can stay purely render-focused.
function pumpActionPresentationPlayback<T extends PresentationPlaybackState>(
  state: T
): Pick<
  T,
  "actionPresentationQueue" | "activeActionPresentation" | "activeActionPresentationStartedAtMs"
> {
  let activeActionPresentation = state.activeActionPresentation;
  let activeActionPresentationStartedAtMs = state.activeActionPresentationStartedAtMs;
  let actionPresentationQueue = state.actionPresentationQueue;

  while (
    activeActionPresentation &&
    activeActionPresentationStartedAtMs !== null &&
    state.simulationTimeMs - activeActionPresentationStartedAtMs >= activeActionPresentation.durationMs
  ) {
    activeActionPresentation = null;
    activeActionPresentationStartedAtMs = null;

    if (!actionPresentationQueue.length) {
      break;
    }

    activeActionPresentation = actionPresentationQueue[0] ?? null;
    activeActionPresentationStartedAtMs = state.simulationTimeMs;
    actionPresentationQueue = actionPresentationQueue.slice(1);
  }

  if (!activeActionPresentation && actionPresentationQueue.length) {
    activeActionPresentation = actionPresentationQueue[0] ?? null;
    activeActionPresentationStartedAtMs = state.simulationTimeMs;
    actionPresentationQueue = actionPresentationQueue.slice(1);
  }

  return {
    actionPresentationQueue,
    activeActionPresentation,
    activeActionPresentationStartedAtMs
  };
}

// The store keeps networking, UI selection, and lightweight simulation time in one place.
export const useGameStore = create<GameStore>((set, get) => ({
  connectionStatus: "idle",
  lastError: null,
  toolNotice: null,
  sessionId: null,
  room: null,
  client: null,
  snapshot: null,
  actionPresentationQueue: [],
  activeActionPresentation: null,
  activeActionPresentationStartedAtMs: null,
  lastQueuedPresentationSequence: 0,
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
      actionPresentationQueue: [],
      activeActionPresentation: null,
      activeActionPresentationStartedAtMs: null,
      lastQueuedPresentationSequence: 0,
      toolNotice: null,
      simulationTimeMs: 0,
      manualTimeControl: false,
      selectedToolInstanceId: null,
      connectionStatus: "disconnected"
    });
  },
  setSnapshot: (snapshot) => {
    set((state) => {
      let actionPresentationQueue = state.actionPresentationQueue;
      let lastQueuedPresentationSequence = state.lastQueuedPresentationSequence;

      if (!state.snapshot) {
        if (snapshot.latestPresentation) {
          lastQueuedPresentationSequence = snapshot.latestPresentation.sequence;
        }

        return {
          snapshot,
          lastQueuedPresentationSequence
        };
      }

      if (
        snapshot.latestPresentation &&
        snapshot.latestPresentation.sequence > lastQueuedPresentationSequence
      ) {
        actionPresentationQueue = [...actionPresentationQueue, snapshot.latestPresentation];
        lastQueuedPresentationSequence = snapshot.latestPresentation.sequence;
      }

      return {
        snapshot,
        lastQueuedPresentationSequence,
        ...pumpActionPresentationPlayback({
          actionPresentationQueue,
          activeActionPresentation: state.activeActionPresentation,
          activeActionPresentationStartedAtMs: state.activeActionPresentationStartedAtMs,
          simulationTimeMs: state.simulationTimeMs
        })
      };
    });
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
  setCharacter: (characterId) => {
    const room = get().room;

    if (!room) {
      return;
    }

    room.send("setCharacter", { characterId });
  },
  grantDebugTool: (toolId) => {
    const room = get().room;

    if (!room) {
      return;
    }

    room.send("grantDebugTool", { toolId });
  },
  // Instant tools execute immediately once the local selection passes shared availability checks.
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
  // Directional actions validate the local selection before sending intent to the room.
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
  // Tile-target actions share the same local guard path as other tool requests.
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
  // Automation can take over time progression for deterministic screenshot and state capture.
  advanceTime: (ms) => {
    set((state) => {
      const simulationTimeMs = state.simulationTimeMs + ms;

      return {
        simulationTimeMs,
        // Automated tests take over the clock once they call window.advanceTime.
        manualTimeControl: true,
        ...pumpActionPresentationPlayback({
          actionPresentationQueue: state.actionPresentationQueue,
          activeActionPresentation: state.activeActionPresentation,
          activeActionPresentationStartedAtMs: state.activeActionPresentationStartedAtMs,
          simulationTimeMs
        })
      };
    });
  },
  // Real-time ticking pauses automatically once automation starts controlling the clock.
  tickRealTime: (ms) => {
    if (get().manualTimeControl) {
      return;
    }

    set((state) => {
      const simulationTimeMs = state.simulationTimeMs + ms;

      return {
        simulationTimeMs,
        ...pumpActionPresentationPlayback({
          actionPresentationQueue: state.actionPresentationQueue,
          activeActionPresentation: state.activeActionPresentation,
          activeActionPresentationStartedAtMs: state.activeActionPresentationStartedAtMs,
          simulationTimeMs
        })
      };
    });
  }
}));
