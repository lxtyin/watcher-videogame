import { useEffect, useState } from "react";
import { GameBoardCanvas } from "./game/components/GameBoardCanvas";
import { HudSidebar } from "./game/components/HudSidebar";
import { RaceSettlementOverlay } from "./game/components/RaceSettlementOverlay";
import { useAnimationClock } from "./game/hooks/useAnimationClock";
import { useAutomationBridge } from "./game/hooks/useAutomationBridge";
import { useKeyboardInteraction } from "./game/hooks/useKeyboardInteraction";
import { useWatcherConnection } from "./game/network/useWatcherConnection";
import { useGameStore } from "./game/state/useGameStore";

// The app shell now only wires global hooks and composes the sidebar with the scene surface.
export default function App() {
  useWatcherConnection();
  useKeyboardInteraction();
  useAnimationClock();
  useAutomationBridge();

  const toolNotice = useGameStore((state) => state.toolNotice);
  const snapshot = useGameStore((state) => state.snapshot);
  const [settlementDismissed, setSettlementDismissed] = useState(false);

  useEffect(() => {
    if (snapshot?.settlementState !== "complete") {
      setSettlementDismissed(false);
    }
  }, [snapshot?.mapId, snapshot?.settlementState]);

  const showSettlement =
    snapshot?.mode === "race" &&
    snapshot.settlementState === "complete" &&
    !settlementDismissed;

  return (
    <div className="app-shell">
      <HudSidebar />

      <main className="scene-panel">
        <GameBoardCanvas />
      </main>

      {toolNotice ? (
        <div className="ui-notice" role="status" aria-live="polite">
          {toolNotice.message}
        </div>
      ) : null}

      {showSettlement && snapshot ? (
        <RaceSettlementOverlay
          snapshot={snapshot}
          onBackToRoom={() => setSettlementDismissed(true)}
          onBackToHome={() => {
            window.location.assign("/");
          }}
        />
      ) : null}
    </div>
  );
}
