import { DEFAULT_GAME_MAP_ID, type GameMapId } from "@watcher/shared";
import { useEffect, useRef, useState } from "react";
import { GameBoardCanvas } from "./game/components/GameBoardCanvas";
import { CreateRoomScreen } from "./game/components/CreateRoomScreen";
import { HomeScreen } from "./game/components/HomeScreen";
import { HudSidebar } from "./game/components/HudSidebar";
import { RaceSettlementOverlay } from "./game/components/RaceSettlementOverlay";
import { RoomEntryScreen } from "./game/components/RoomEntryScreen";
import { useAnimationClock } from "./game/hooks/useAnimationClock";
import { useAutomationBridge } from "./game/hooks/useAutomationBridge";
import { useKeyboardInteraction } from "./game/hooks/useKeyboardInteraction";
import {
  getStoredPlayerProfile,
  hasStoredRoomSessionForRoom,
  persistStoredPlayerProfile,
  useWatcherConnection
} from "./game/network/useWatcherConnection";
import { useGameStore } from "./game/state/useGameStore";

interface AppRoute {
  roomCode: string | null;
  screen: "create" | "home";
}

function readAppRoute(): AppRoute {
  const url = new URL(window.location.href);
  return {
    roomCode: url.searchParams.get("room")?.trim() || null,
    screen: url.searchParams.get("screen") === "create" ? "create" : "home"
  };
}

function writeAppRoute(route: AppRoute): void {
  const url = new URL(window.location.href);

  if (route.roomCode) {
    url.searchParams.set("room", route.roomCode);
  } else {
    url.searchParams.delete("room");
  }

  if (!route.roomCode && route.screen === "create") {
    url.searchParams.set("screen", "create");
  } else {
    url.searchParams.delete("screen");
  }

  window.history.pushState({}, "", url.toString());
}

// The app shell coordinates navigation between home, room entry, lobby, and active gameplay.
export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => readAppRoute());
  const [playerProfile, setPlayerProfile] = useState(() => getStoredPlayerProfile());
  const [selectedCreateMapId, setSelectedCreateMapId] = useState<GameMapId>(DEFAULT_GAME_MAP_ID);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  useEffect(() => {
    persistStoredPlayerProfile(playerProfile);
  }, [playerProfile]);

  const navigateHome = () => {
    const nextRoute = { roomCode: null, screen: "home" as const };
    writeAppRoute(nextRoute);
    setRoute(nextRoute);
  };

  const navigateToCreateScreen = () => {
    const nextRoute = { roomCode: null, screen: "create" as const };
    writeAppRoute(nextRoute);
    setRoute(nextRoute);
  };

  const navigateToRoom = (roomCode: string) => {
    const nextRoute = { roomCode, screen: "home" as const };
    writeAppRoute(nextRoute);
    setRoute(nextRoute);
  };

  const busy = connectionStatus === "connecting";
  const roomEntryBusy = busy || connectionStatus === "connected";
  const showSettlement =
    route.roomCode !== null &&
    snapshot?.mode === "race" &&
    snapshot.roomPhase === "settlement" &&
    snapshot.settlementState === "complete";

  if (!route.roomCode) {
    if (route.screen === "create") {
      return (
        <CreateRoomScreen
          busy={busy}
          lastError={lastError}
          mapId={selectedCreateMapId}
          onBack={navigateHome}
          onCreateRoom={async () => {
            const roomCode = await createRoom({
              mapId: selectedCreateMapId,
              petId: playerProfile.petId,
              playerName: playerProfile.playerName
            });

            if (roomCode) {
              navigateToRoom(roomCode);
            }
          }}
          onMapIdChange={setSelectedCreateMapId}
        />
      );
    }

    return (
      <HomeScreen
        busy={busy}
        lastError={lastError}
        onJoinRoom={async ({ petId, playerName, roomCode }) => {
          const joined = await joinRoom({ petId, playerName, roomCode });

          if (joined) {
            navigateToRoom(roomCode.trim());
          }
        }}
        onOpenCreateScreen={navigateToCreateScreen}
        onPetIdChange={(petId) => setPlayerProfile((current) => ({ ...current, petId }))}
        onPlayerNameChange={(playerName) =>
          setPlayerProfile((current) => ({ ...current, playerName }))
        }
        petId={playerProfile.petId}
        playerName={playerProfile.playerName}
      />
    );
  }

  const roomCode = route.roomCode;

  if (!snapshot) {
    return (
      <RoomEntryScreen
        busy={roomEntryBusy}
        canReconnect={hasStoredRoomSessionForRoom(roomCode)}
        initialPlayerName={playerProfile.playerName}
        lastError={lastError}
        onBackHome={() => {
          void leaveRoom().finally(() => {
            navigateHome();
          });
        }}
        onJoinRoom={async ({ playerName, roomCode }) => {
          const joined = await joinRoom({
            petId: playerProfile.petId,
            playerName,
            roomCode
          });

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
    <div className={["app-shell", sidebarCollapsed ? "sidebar-collapsed" : ""].filter(Boolean).join(" ")}>
      <button
        type="button"
        className="app-shell__sidebar-toggle"
        data-testid="sidebar-toggle-button"
        aria-expanded={!sidebarCollapsed}
        aria-label={sidebarCollapsed ? "展开左侧栏" : "收起左侧栏"}
        onClick={() => setSidebarCollapsed((current) => !current)}
      >
        {sidebarCollapsed ? ">" : "<"}
      </button>

      <div className="app-sidebar-slot">
        <HudSidebar
          onLeaveRoom={() => {
            void leaveRoom().finally(() => {
              navigateHome();
            });
          }}
        />
      </div>

      <main className="scene-panel">
        <GameBoardCanvas />
      </main>

      <div className="rotate-device-overlay" aria-hidden="true">
        <div className="rotate-device-card">
          <strong>请横屏游玩</strong>
          <span>横屏后左侧栏会保留在左边，双指可旋转和缩放视角。</span>
        </div>
      </div>

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
