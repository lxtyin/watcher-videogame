import { useState } from "react";
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

function CreateRoomIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M12 28 32 12l20 16v22a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M24 54V34h16v20M32 21v14M25 28h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function JoinRoomIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect
        x="10"
        y="16"
        width="30"
        height="32"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        d="M37 32h17M47 22l10 10-10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
              <CreateRoomIcon />
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
              <JoinRoomIcon />
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
