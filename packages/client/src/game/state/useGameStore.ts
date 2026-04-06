import { create } from "zustand";
import type { Client as ColyseusClient, Room } from "colyseus.js";
import {
  createChoiceSelection,
  createDirectionSelection,
  createTileSelection,
  type CharacterId,
  type Direction,
  type GameSnapshot,
  type GridPosition,
  type SequencedActionPresentation,
  type ToolId,
  type UseToolCommandPayload
} from "@watcher/shared";
import { pumpPresentationQueue } from "./presentationQueue";
import {
  sendEndTurn,
  sendKickPlayer,
  sendGrantDebugTool,
  sendReturnToRoom,
  sendRollDice,
  sendSetCharacter,
  sendSetReady,
  sendStartGame,
  sendToolPayloadIfUsable
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
  startLocalPlayback: (snapshot: GameSnapshot, sessionId?: string | null) => void;
  clearLocalPlayback: () => void;
  setSnapshot: (snapshot: GameSnapshot) => void;
  setLocalSnapshot: (snapshot: GameSnapshot) => void;
  setSelectedToolInstanceId: (toolInstanceId: SelectedToolInstanceId) => void;
  showToolNotice: (message: string) => void;
  rollDice: () => void;
  endTurn: () => void;
  setReady: (isReady: boolean) => void;
  kickPlayer: (playerId: string) => void;
  startGame: () => void;
  returnToRoom: () => void;
  setCharacter: (characterId: CharacterId) => void;
  grantDebugTool: (toolId: ToolId) => void;
  useInstantTool: (toolInstanceId?: string | null) => boolean;
  useChoiceTool: (choiceId: string, toolInstanceId?: string | null) => boolean;
  performDirectionalAction: (direction: Direction | null, toolInstanceId?: string | null) => boolean;
  performTileTargetAction: (
    targetPosition: GridPosition | null,
    toolInstanceId?: string | null
  ) => boolean;
  performTileDirectionAction: (
    targetPosition: GridPosition | null,
    direction: Direction | null,
    toolInstanceId?: string | null
  ) => boolean;
  useToolPayload: (
    payload?: Omit<UseToolCommandPayload, "toolInstanceId">,
    toolInstanceId?: string | null
  ) => boolean;
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
  return pumpPresentationQueue(state);
}

function isPresentationBusy(state: Pick<
  GameStore,
  "actionPresentationQueue" | "activeActionPresentation"
>): boolean {
  return Boolean(state.activeActionPresentation || state.actionPresentationQueue.length);
}

function applyIncomingSnapshot(
  state: Pick<
    GameStore,
    | "snapshot"
    | "actionPresentationQueue"
    | "activeActionPresentation"
    | "activeActionPresentationStartedAtMs"
    | "lastQueuedPresentationSequence"
    | "simulationTimeMs"
  >,
  snapshot: GameSnapshot
): Pick<
  GameStore,
  | "snapshot"
  | "actionPresentationQueue"
  | "activeActionPresentation"
  | "activeActionPresentationStartedAtMs"
  | "lastQueuedPresentationSequence"
> {
  let actionPresentationQueue = state.actionPresentationQueue;
  let lastQueuedPresentationSequence = state.lastQueuedPresentationSequence;

  if (!state.snapshot) {
    if (snapshot.latestPresentation) {
      lastQueuedPresentationSequence = snapshot.latestPresentation.sequence;
    }

    return {
      snapshot,
      actionPresentationQueue,
      activeActionPresentation: state.activeActionPresentation,
      activeActionPresentationStartedAtMs: state.activeActionPresentationStartedAtMs,
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
  startLocalPlayback: (snapshot, sessionId = null) => {
    set({
      client: null,
      room: null,
      sessionId,
      connectionStatus: "connected",
      lastError: null,
      toolNotice: null,
      snapshot,
      actionPresentationQueue: [],
      activeActionPresentation: null,
      activeActionPresentationStartedAtMs: null,
      lastQueuedPresentationSequence: snapshot.latestPresentation?.sequence ?? 0,
      simulationTimeMs: 0,
      manualTimeControl: false,
      selectedToolInstanceId: null
    });
  },
  clearLocalPlayback: () => {
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
      connectionStatus: "idle",
      lastError: null
    });
  },
  setSnapshot: (snapshot) => {
    set((state) => applyIncomingSnapshot(state, snapshot));
  },
  setLocalSnapshot: (snapshot) => {
    set((state) => applyIncomingSnapshot(state, snapshot));
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
    const state = get();

    if (isPresentationBusy(state)) {
      return;
    }

    sendRollDice(state.room);
  },
  endTurn: () => {
    const state = get();

    if (isPresentationBusy(state)) {
      return;
    }

    sendEndTurn(state.room);
  },
  setReady: (isReady) => {
    sendSetReady(get().room, { isReady });
  },
  kickPlayer: (playerId) => {
    sendKickPlayer(get().room, playerId);
  },
  startGame: () => {
    sendStartGame(get().room);
  },
  returnToRoom: () => {
    sendReturnToRoom(get().room);
  },
  setCharacter: (characterId) => {
    sendSetCharacter(get().room, characterId);
  },
  grantDebugTool: (toolId) => {
    const state = get();

    if (isPresentationBusy(state)) {
      return;
    }

    sendGrantDebugTool(state.room, toolId);
  },
  useInstantTool: (toolInstanceId) => {
    return get().useToolPayload({ input: {} }, toolInstanceId);
  },
  useChoiceTool: (choiceId, toolInstanceId) => {
    return get().useToolPayload(
      {
        input: {
          choiceId: createChoiceSelection(choiceId)
        }
      },
      toolInstanceId
    );
  },
  performDirectionalAction: (direction, toolInstanceId) => {
    if (!direction) {
      return false;
    }

    return get().useToolPayload(
      {
        input: {
          direction: createDirectionSelection(direction)
        }
      },
      toolInstanceId
    );
  },
  performTileTargetAction: (targetPosition, toolInstanceId) => {
    if (!targetPosition) {
      return false;
    }

    return get().useToolPayload(
      {
        input: {
          targetPosition: createTileSelection(targetPosition)
        }
      },
      toolInstanceId
    );
  },
  performTileDirectionAction: (targetPosition, direction, toolInstanceId) => {
    if (!targetPosition || !direction) {
      return false;
    }

    return get().useToolPayload(
      {
        input: {
          direction: createDirectionSelection(direction),
          targetPosition: createTileSelection(targetPosition)
        }
      },
      toolInstanceId
    );
  },
  useToolPayload: (payload = { input: {} }, toolInstanceId) => {
    const state = get();

    if (isPresentationBusy(state)) {
      return false;
    }

    const didSend = sendToolPayloadIfUsable(
      state.room,
      state.snapshot,
      state.sessionId,
      toolInstanceId ?? state.selectedToolInstanceId,
      payload
    );

    if (didSend) {
      set({ selectedToolInstanceId: null });
    }
    return didSend;
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
