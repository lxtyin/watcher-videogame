import { create } from "zustand";
import type { Client as ColyseusClient, Room } from "colyseus.js";
import type {
  CharacterId,
  Direction,
  GameSnapshot,
  GridPosition,
  SequencedActionPresentation,
  ToolId
} from "@watcher/shared";
import { pumpActionPresentationPlayback } from "./presentationPlayback";
import {
  sendDirectionalToolIfUsable,
  sendEndTurn,
  sendGrantDebugTool,
  sendInstantToolIfUsable,
  sendRollDice,
  sendSetCharacter,
  sendTileTargetToolIfUsable
} from "./roomCommands";

type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";
export type SelectedToolInstanceId = string | null;

interface ToolNotice {
  id: number;
  message: string;
}

interface GameStore {
  connectionStatus: ConnectionStatus;
  lastError: string | null;
  toolNotice: ToolNotice | null;
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

function advancePresentationClock(state: Pick<
  GameStore,
  | "actionPresentationQueue"
  | "activeActionPresentation"
  | "activeActionPresentationStartedAtMs"
  | "simulationTimeMs"
>): Pick<
  GameStore,
  "actionPresentationQueue" | "activeActionPresentation" | "activeActionPresentationStartedAtMs"
> {
  return pumpActionPresentationPlayback(state);
}

// The store owns shared session state, while focused helpers handle playback and room-command policy.
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
        ...advancePresentationClock({
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
    sendRollDice(get().room);
  },
  endTurn: () => {
    sendEndTurn(get().room);
  },
  setCharacter: (characterId) => {
    sendSetCharacter(get().room, characterId);
  },
  grantDebugTool: (toolId) => {
    sendGrantDebugTool(get().room, toolId);
  },
  useInstantTool: (toolInstanceId) => {
    const state = get();

    sendInstantToolIfUsable(
      state.room,
      state.snapshot,
      state.sessionId,
      toolInstanceId ?? state.selectedToolInstanceId
    );
  },
  performDirectionalAction: (direction, toolInstanceId) => {
    const state = get();

    sendDirectionalToolIfUsable(
      state.room,
      state.snapshot,
      state.sessionId,
      toolInstanceId ?? state.selectedToolInstanceId,
      direction
    );
  },
  performTileTargetAction: (targetPosition, toolInstanceId) => {
    const state = get();

    sendTileTargetToolIfUsable(
      state.room,
      state.snapshot,
      state.sessionId,
      toolInstanceId ?? state.selectedToolInstanceId,
      targetPosition
    );
  },
  // Automation can take over time progression for deterministic text checks.
  advanceTime: (ms) => {
    set((state) => {
      const simulationTimeMs = state.simulationTimeMs + ms;

      return {
        simulationTimeMs,
        manualTimeControl: true,
        ...advancePresentationClock({
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
        ...advancePresentationClock({
          actionPresentationQueue: state.actionPresentationQueue,
          activeActionPresentation: state.activeActionPresentation,
          activeActionPresentationStartedAtMs: state.activeActionPresentationStartedAtMs,
          simulationTimeMs
        })
      };
    });
  }
}));
