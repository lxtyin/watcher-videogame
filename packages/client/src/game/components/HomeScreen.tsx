import { useState } from "react";
import { UiIcon } from "../assets/ui/icons";
import { PlayerProfileCard } from "./PlayerProfileCard";

interface JoinRoomInput {
  petId: string;
  playerName: string;
  roomCode: string;
}

interface HomeScreenProps {
  busy: boolean;
  lastError: string | null;
  onJoinRoom: (input: JoinRoomInput) => Promise<void>;
  onOpenCreateScreen: () => void;
  onPetIdChange: (petId: string) => void;
  onPlayerNameChange: (playerName: string) => void;
  petId: string;
  playerName: string;
}

// The landing page focuses on identity setup first, then a single create or join action.
export function HomeScreen({
  busy,
  lastError,
  onJoinRoom,
  onOpenCreateScreen,
  onPetIdChange,
  onPlayerNameChange,
  petId,
  playerName
}: HomeScreenProps) {
  const [joinExpanded, setJoinExpanded] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState("");

  return (
    <div className="landing-shell">
      <div className="landing-title-block">
        <p className="eyebrow">Watcher Prototype</p>
        <h1>Watcher</h1>
      </div>

      <PlayerProfileCard
        onPetIdChange={onPetIdChange}
        onPlayerNameChange={onPlayerNameChange}
        petId={petId}
        playerName={playerName}
      />

      <div className="landing-action-grid">
        <article className="landing-action-card landing-action-card--create">
          <button
            type="button"
            className="landing-action-hitbox"
            data-testid="home-open-create"
            onClick={onOpenCreateScreen}
            disabled={busy}
          >
            <span className="landing-action-icon">
              <UiIcon name="create-room" />
            </span>
            <strong>创建房间</strong>
          </button>
        </article>

        <article
          className={`landing-action-card landing-action-card--join${joinExpanded ? " expanded" : ""}`}
        >
          <button
            type="button"
            className="landing-action-hitbox"
            data-testid="home-open-join"
            onClick={() => setJoinExpanded((expanded) => !expanded)}
            disabled={busy}
          >
            <span className="landing-action-icon">
              <UiIcon name="join-room" />
            </span>
            <strong>加入房间</strong>
          </button>

          {joinExpanded ? (
            <form
              className="landing-join-form"
              onSubmit={(event) => {
                event.preventDefault();
                void onJoinRoom({
                  petId,
                  playerName,
                  roomCode: joinRoomCode
                });
              }}
            >
              <input
                data-testid="join-room-code-input"
                type="text"
                value={joinRoomCode}
                onChange={(event) => setJoinRoomCode(event.target.value)}
                placeholder="输入房间号"
              />
              <button type="submit" data-testid="join-room-submit" disabled={busy}>
                {busy ? "加入中..." : "加入"}
              </button>
            </form>
          ) : null}
        </article>
      </div>

      {lastError ? <p className="error-copy home-error">{lastError}</p> : null}
    </div>
  );
}
