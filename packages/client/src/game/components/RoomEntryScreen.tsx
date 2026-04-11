import { useState } from "react";
import { UiIcon } from "../assets/ui/icons";

interface JoinRoomInput {
  playerName: string;
  roomCode: string;
}

interface RoomEntryScreenProps {
  busy: boolean;
  canReconnect: boolean;
  initialPlayerName: string;
  lastError: string | null;
  onBackHome: () => void;
  onJoinRoom: (input: JoinRoomInput) => Promise<void>;
  onReconnect: () => Promise<void>;
  roomCode: string;
}

// Direct room links try reconnect first, then fall back to a simple join form.
export function RoomEntryScreen({
  busy,
  canReconnect,
  initialPlayerName,
  lastError,
  onBackHome,
  onJoinRoom,
  onReconnect,
  roomCode
}: RoomEntryScreenProps) {
  const [playerName, setPlayerName] = useState(initialPlayerName);

  return (
    <div className="home-shell">
      <section className="home-hero">
        <p className="eyebrow">Watcher Room</p>
        <h1>房间 {roomCode}</h1>
        <p className="lead">如果这是你刚刚刷新的页面，可以优先尝试恢复上次会话。</p>
      </section>

      <section className="home-card room-entry-card">
        <div className="room-entry-actions">
          <button
            type="button"
            data-testid="room-reconnect-button"
            onClick={() => void onReconnect()}
            disabled={busy || !canReconnect}
          >
            恢复上次会话
          </button>
          <button
            type="button"
            data-testid="room-entry-back-home-button"
            className="ghost-button"
            onClick={onBackHome}
            disabled={busy}
          >
            <UiIcon name="return" />
            <span>返回主页</span>
          </button>
        </div>

        <form
          className="home-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onJoinRoom({
              playerName,
              roomCode
            });
          }}
        >
          <label className="home-field">
            <span>用户名</span>
            <input
              data-testid="room-entry-player-name-input"
              type="text"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="输入你的名字"
              maxLength={24}
            />
          </label>

          <button type="submit" data-testid="room-entry-join-button" disabled={busy}>
            {busy ? "正在连接..." : "加入这个房间"}
          </button>
        </form>

        {lastError ? <p className="error-copy home-error">{lastError}</p> : null}
        {!canReconnect ? (
          <p className="hint-copy">当前浏览器里没有这个房间的恢复凭证，将按新玩家加入。</p>
        ) : null}
      </section>
    </div>
  );
}
