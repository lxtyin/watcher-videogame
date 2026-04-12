import { create } from "zustand";
import type { Client as ColyseusClient, Room } from "colyseus.js";
import {
  type CharacterId,
  type GameSnapshot,
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
import {
  createDiceRollAnimation,
  type DiceRollAnimation
} from "./diceRollAnimation";

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
  diceRollAnimation: DiceRollAnimation | null;
  pendingDiceRollSnapshot: GameSnapshot | null;
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
  "actionPresentationQueue" | "activeActionPresentation" | "diceRollAnimation"
>): boolean {
  return Boolean(state.diceRollAnimation || state.activeActionPresentation || state.actionPresentationQueue.length);
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

function applyIncomingSnapshotWithDiceRollGate(
  state: Pick<
    GameStore,
    | "snapshot"
    | "actionPresentationQueue"
    | "activeActionPresentation"
    | "activeActionPresentationStartedAtMs"
    | "lastQueuedPresentationSequence"
    | "simulationTimeMs"
    | "diceRollAnimation"
    | "pendingDiceRollSnapshot"
  >,
  snapshot: GameSnapshot
): Pick<
  GameStore,
  | "snapshot"
  | "actionPresentationQueue"
  | "activeActionPresentation"
  | "activeActionPresentationStartedAtMs"
  | "lastQueuedPresentationSequence"
  | "diceRollAnimation"
  | "pendingDiceRollSnapshot"
> {
  if (state.diceRollAnimation) {
    return {
      snapshot: state.snapshot,
      actionPresentationQueue: state.actionPresentationQueue,
      activeActionPresentation: state.activeActionPresentation,
      activeActionPresentationStartedAtMs: state.activeActionPresentationStartedAtMs,
      lastQueuedPresentationSequence: state.lastQueuedPresentationSequence,
      diceRollAnimation: state.diceRollAnimation,
      pendingDiceRollSnapshot: snapshot
    };
  }

  const diceRollAnimation = state.snapshot
    ? createDiceRollAnimation(state.snapshot, snapshot, state.simulationTimeMs)
    : null;

  if (diceRollAnimation) {
    return {
      snapshot: state.snapshot,
      actionPresentationQueue: state.actionPresentationQueue,
      activeActionPresentation: state.activeActionPresentation,
      activeActionPresentationStartedAtMs: state.activeActionPresentationStartedAtMs,
      lastQueuedPresentationSequence: state.lastQueuedPresentationSequence,
      diceRollAnimation,
      pendingDiceRollSnapshot: snapshot
    };
  }

  return {
    ...applyIncomingSnapshot(state, snapshot),
    diceRollAnimation: null,
    pendingDiceRollSnapshot: null
  };
}

function advanceTimedState(
  state: Pick<
    GameStore,
    | "snapshot"
    | "actionPresentationQueue"
    | "activeActionPresentation"
    | "activeActionPresentationStartedAtMs"
    | "lastQueuedPresentationSequence"
    | "simulationTimeMs"
    | "diceRollAnimation"
    | "pendingDiceRollSnapshot"
  >,
  simulationTimeMs: number
): Pick<
  GameStore,
  | "snapshot"
  | "actionPresentationQueue"
  | "activeActionPresentation"
  | "activeActionPresentationStartedAtMs"
  | "lastQueuedPresentationSequence"
  | "simulationTimeMs"
  | "diceRollAnimation"
  | "pendingDiceRollSnapshot"
> {
  if (
    state.diceRollAnimation &&
    state.pendingDiceRollSnapshot &&
    simulationTimeMs - state.diceRollAnimation.startedAtMs >= state.diceRollAnimation.durationMs
  ) {
    const nextState = {
      ...state,
      simulationTimeMs,
      diceRollAnimation: null,
      pendingDiceRollSnapshot: null
    };

    return {
      simulationTimeMs,
      diceRollAnimation: null,
      pendingDiceRollSnapshot: null,
      ...applyIncomingSnapshot(nextState, state.pendingDiceRollSnapshot)
    };
  }

  return {
    simulationTimeMs,
    diceRollAnimation: state.diceRollAnimation,
    pendingDiceRollSnapshot: state.pendingDiceRollSnapshot,
    snapshot: state.snapshot,
    lastQueuedPresentationSequence: state.lastQueuedPresentationSequence,
    ...advancePresentationClock({
      actionPresentationQueue: state.actionPresentationQueue,
      activeActionPresentation: state.activeActionPresentation,
      activeActionPresentationStartedAtMs: state.activeActionPresentationStartedAtMs,
      simulationTimeMs
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
  diceRollAnimation: null,
  pendingDiceRollSnapshot: null,
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
      diceRollAnimation: null,
      pendingDiceRollSnapshot: null,
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
      diceRollAnimation: null,
      pendingDiceRollSnapshot: null,
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
      diceRollAnimation: null,
      pendingDiceRollSnapshot: null,
      selectedToolInstanceId: null,
      connectionStatus: "idle",
      lastError: null
    });
  },
  setSnapshot: (snapshot) => {
    set((state) => applyIncomingSnapshotWithDiceRollGate(state, snapshot));
  },
  setLocalSnapshot: (snapshot) => {
    set((state) => applyIncomingSnapshotWithDiceRollGate(state, snapshot));
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
        manualTimeControl: true,
        ...advanceTimedState(state, simulationTimeMs)
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

      return advanceTimedState(state, simulationTimeMs);
    });
  }
}));
