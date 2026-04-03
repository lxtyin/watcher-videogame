import { useEffect, useRef, useState } from "react";
import { GameBoardCanvas } from "./game/components/GameBoardCanvas";
import { HomeScreen } from "./game/components/HomeScreen";
import { HudSidebar } from "./game/components/HudSidebar";
import { RaceSettlementOverlay } from "./game/components/RaceSettlementOverlay";
import { RoomEntryScreen } from "./game/components/RoomEntryScreen";
import { useAnimationClock } from "./game/hooks/useAnimationClock";
import { useAutomationBridge } from "./game/hooks/useAutomationBridge";
import { useKeyboardInteraction } from "./game/hooks/useKeyboardInteraction";
import {
  getStoredPlayerName,
  hasStoredRoomSessionForRoom,
  useWatcherConnection
} from "./game/network/useWatcherConnection";
import { useGameStore } from "./game/state/useGameStore";

interface AppRoute {
  roomCode: string | null;
}

function readAppRoute(): AppRoute {
  const url = new URL(window.location.href);
  return {
    roomCode: url.searchParams.get("room")?.trim() || null
  };
}

function writeAppRoute(roomCode: string | null): void {
  const url = new URL(window.location.href);

  if (roomCode) {
    url.searchParams.set("room", roomCode);
  } else {
    url.searchParams.delete("room");
  }

  window.history.pushState({}, "", url.toString());
}

// The app shell coordinates navigation between home, room entry, lobby, and active gameplay.
export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => readAppRoute());
  const previousRoomCodeRef = useRef<string | null>(route.roomCode);

  useKeyboardInteraction();
  useAnimationClock();
  useAutomationBridge();

  const snapshot = useGameStore((state) => state.snapshot);
  const room = useGameStore((state) => state.room);
  const toolNotice = useGameStore((state) => state.toolNotice);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const lastError = useGameStore((state) => state.lastError);
  const sendReturnToRoom = useGameStore((state) => state.returnToRoom);
  const {
    createRoom,
    joinRoom,
    leaveRoom,
    reconnectToStoredRoom
  } = useWatcherConnection(route.roomCode);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(readAppRoute());
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const previousRoomCode = previousRoomCodeRef.current;

    if (previousRoomCode !== null && route.roomCode === null && room) {
      void leaveRoom();
    }

    previousRoomCodeRef.current = route.roomCode;
  }, [leaveRoom, room, route.roomCode]);

  const navigateHome = () => {
    writeAppRoute(null);
    setRoute({ roomCode: null });
  };

  const navigateToRoom = (roomCode: string) => {
    writeAppRoute(roomCode);
    setRoute({ roomCode });
  };

  const busy = connectionStatus === "connecting";
  const roomEntryBusy = busy || connectionStatus === "connected";
  const showSettlement =
    route.roomCode !== null &&
    snapshot?.mode === "race" &&
    snapshot.roomPhase === "settlement" &&
    snapshot.settlementState === "complete";

  if (!route.roomCode) {
    return (
      <HomeScreen
        busy={busy}
        initialPlayerName={getStoredPlayerName()}
        lastError={lastError}
        onCreateRoom={async ({ mapId, playerName }) => {
          const roomCode = await createRoom({ mapId, playerName });

          if (roomCode) {
            navigateToRoom(roomCode);
          }
        }}
        onJoinRoom={async ({ playerName, roomCode }) => {
          const joined = await joinRoom({ playerName, roomCode });

          if (joined) {
            navigateToRoom(roomCode.trim());
          }
        }}
      />
    );
  }

  const roomCode = route.roomCode;

  if (!snapshot) {
    return (
      <RoomEntryScreen
        busy={roomEntryBusy}
        canReconnect={hasStoredRoomSessionForRoom(roomCode)}
        initialPlayerName={getStoredPlayerName()}
        lastError={lastError}
        onBackHome={() => {
          void leaveRoom().finally(() => {
            navigateHome();
          });
        }}
        onJoinRoom={async ({ playerName, roomCode }) => {
          const joined = await joinRoom({ playerName, roomCode });

          if (joined) {
            navigateToRoom(roomCode.trim());
          }
        }}
        onReconnect={async () => {
          const reconnected = await reconnectToStoredRoom(roomCode);

          if (reconnected) {
            navigateToRoom(roomCode);
          }
        }}
        roomCode={roomCode}
      />
    );
  }

  return (
    <div className="app-shell">
      <HudSidebar
        onLeaveRoom={() => {
          void leaveRoom().finally(() => {
            navigateHome();
          });
        }}
      />

      <main className="scene-panel">
        <GameBoardCanvas />
      </main>

      {toolNotice ? (
        <div className="ui-notice" role="status" aria-live="polite">
          {toolNotice.message}
        </div>
      ) : null}

      {showSettlement ? (
        <RaceSettlementOverlay
          snapshot={snapshot}
          onBackToRoom={() => sendReturnToRoom()}
          onBackToHome={() => {
            void leaveRoom().finally(() => {
              navigateHome();
            });
          }}
        />
      ) : null}
    </div>
  );
}
