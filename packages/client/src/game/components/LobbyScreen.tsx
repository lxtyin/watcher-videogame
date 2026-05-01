import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  getCharacterDefinition,
  getCharacterIds,
  type CharacterId,
  type GameMode,
  type PlayerSnapshot
} from "@watcher/shared";
import { UiIcon } from "../assets/ui/icons";
import { getCharacterPortraitUrl } from "../content/characterPortraits";
import { useGameStore } from "../state/useGameStore";
import { copyTextToClipboard } from "../utils/clipboard";
import { PetThumbnail } from "./PetThumbnail";

const CHARACTER_OPTIONS = getCharacterIds();

const CONNECTION_STATUS_LABELS = {
  idle: "空闲",
  connecting: "连接中",
  connected: "已连接",
  disconnected: "已断开",
  error: "错误"
} as const;

const MODE_LABELS: Record<GameMode, string> = {
  bedwars: "起床战争",
  free: "自由模式",
  race: "竞速模式"
};

function getReadyLabel(isReady: boolean): string {
  return isReady ? "已准备" : "未准备";
}

function hasRequiredBedwarsTeams(players: PlayerSnapshot[], mode: GameMode): boolean {
  if (mode !== "bedwars") {
    return true;
  }

  const teamIds = new Set(
    players
      .filter((player) => player.isConnected)
      .map((player) => player.teamId)
      .filter((teamId): teamId is NonNullable<PlayerSnapshot["teamId"]> => teamId !== null)
  );

  return teamIds.has("white") && teamIds.has("black");
}

function LobbyCharacterCard({
  characterId,
  className = ""
}: {
  characterId: CharacterId;
  className?: string;
}) {
  const character = getCharacterDefinition(characterId);
  const portraitUrl = getCharacterPortraitUrl(character.portraitId);

  return (
    <div className={["character-card-frame", "room-lobby-character-frame", className].filter(Boolean).join(" ")}>
      <div className="character-card">
        {portraitUrl ? (
          <img
            className="character-card__portrait"
            src={portraitUrl}
            alt={`${character.nativeName}立绘`}
          />
        ) : (
          <div className="character-card__portrait-fallback" />
        )}
        <div className="character-card__copy">
          <div className="character-card__name-row">
            <strong>{character.nativeName}</strong>
            <span> / {character.label}</span>
          </div>
          <p className="character-card__summary">{character.summary}</p>
          <p className="character-card__flavor">“{character.flavorText}”</p>
        </div>
      </div>
    </div>
  );
}

function PlayerLobbyCard({
  canKick,
  isMe,
  isRoomHost,
  onKick,
  onOpenCharacterPicker,
  player
}: {
  canKick: boolean;
  isMe: boolean;
  isRoomHost: boolean;
  onKick: () => void;
  onOpenCharacterPicker: () => void;
  player: PlayerSnapshot;
}) {
  const character = getCharacterDefinition(player.characterId);

  return (
    <article
      className={["room-lobby-player-card", isMe ? "is-me" : "", !player.isConnected ? "is-offline" : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ "--player-accent": player.color } as CSSProperties}
    >
      {isMe ? (
        <button
          type="button"
          className="room-lobby-character-button"
          data-testid="lobby-open-character-picker"
          aria-label="切换角色"
          onClick={onOpenCharacterPicker}
        >
          <LobbyCharacterCard characterId={player.characterId} />
          <span className="room-lobby-character-action">切换</span>
        </button>
      ) : (
        <LobbyCharacterCard characterId={player.characterId} />
      )}

      <div className="room-lobby-player-info">
        <PetThumbnail color={player.color} fallbackSeed={player.id} petId={player.petId} />
        <div className="room-lobby-player-copy">
          <div className="player-name-line">
            <span className="player-swatch" />
            <strong>{player.name}</strong>
            {isRoomHost ? <span className="mini-pill">房主</span> : null}
          </div>
          <p>{`${character.nativeName} / ${character.label}`}</p>
          <div className="lobby-player-flags">
            <span className={`mini-pill ${player.isConnected ? "" : "offline"}`}>
              {player.isConnected ? "在线" : "离线保留中"}
            </span>
            <span className={`mini-pill ${player.isReady ? "ready" : ""}`}>
              {getReadyLabel(player.isReady)}
            </span>
          </div>
        </div>
      </div>

      {canKick ? (
        <div className="room-lobby-card-actions">
          <button
            type="button"
            className="ghost-button"
            data-testid={`kick-player-${player.id}`}
            onClick={onKick}
          >
            踢出玩家
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function LobbyScreen({ onLeaveRoom }: { onLeaveRoom: () => void }) {
  const snapshot = useGameStore((state) => state.snapshot);
  const sessionId = useGameStore((state) => state.sessionId);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const lastError = useGameStore((state) => state.lastError);
  const toolNotice = useGameStore((state) => state.toolNotice);
  const setReady = useGameStore((state) => state.setReady);
  const kickPlayer = useGameStore((state) => state.kickPlayer);
  const startGame = useGameStore((state) => state.startGame);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const showToolNotice = useGameStore((state) => state.showToolNotice);
  const [isCharacterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);

  const connectedPlayers = useMemo(
    () => snapshot?.players.filter((player) => player.isConnected) ?? [],
    [snapshot]
  );
  const me = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const isHost = Boolean(sessionId && snapshot?.hostPlayerId === sessionId);
  const allConnectedPlayersReady =
    connectedPlayers.length > 0 && connectedPlayers.every((player) => player.isReady);
  const canStartGame = Boolean(
    snapshot &&
      isHost &&
      allConnectedPlayersReady &&
      hasRequiredBedwarsTeams(snapshot.players, snapshot.mode)
  );

  useEffect(() => {
    if (!isCharacterPickerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCharacterPickerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCharacterPickerOpen]);

  if (!snapshot) {
    return (
      <main className="room-lobby-shell">
        <section className="room-lobby-empty">
          <span className={`status-pill status-${connectionStatus}`}>
            {CONNECTION_STATUS_LABELS[connectionStatus]}
          </span>
          <p>正在等待房间状态同步。</p>
          {lastError ? <p className="error-copy">{lastError}</p> : null}
        </section>
      </main>
    );
  }

  const copyRoomCode = async () => {
    if (await copyTextToClipboard(snapshot.roomCode)) {
      setCopiedRoomCode(true);
      window.setTimeout(() => setCopiedRoomCode(false), 1400);
      return;
    }

    showToolNotice("当前浏览器无法复制房间号。");
  };

  const handleCharacterPick = (characterId: CharacterId) => {
    setCharacter(characterId);
    setCharacterPickerOpen(false);
  };

  return (
    <main className="room-lobby-shell">
      <header className="room-lobby-header">
        <div className="room-lobby-title-block">
          <p className="eyebrow">Watcher Room</p>
          <h1>{snapshot.mapLabel}</h1>
          <div className="room-lobby-meta-row">
            <span className="status-pill status-connected">{MODE_LABELS[snapshot.mode]}</span>
            <span className={`status-pill status-${connectionStatus}`}>
              {CONNECTION_STATUS_LABELS[connectionStatus]}
            </span>
            <span className="room-lobby-player-count">{`${connectedPlayers.length}/${snapshot.players.length} 在线`}</span>
          </div>
        </div>

        <div className="room-lobby-code-panel">
          <span className="room-code-label">房间号</span>
          <div className="room-code-row">
            <strong>{snapshot.roomCode}</strong>
            <button
              type="button"
              className="room-code-copy-button"
              aria-label="复制房间号"
              onClick={() => void copyRoomCode()}
            >
              <UiIcon name="copy" />
              <span>{copiedRoomCode ? "已复制" : "复制"}</span>
            </button>
            <button
              type="button"
              className="room-home-button"
              aria-label="返回主页"
              title="返回主页"
              onClick={onLeaveRoom}
            >
              <UiIcon name="home" />
            </button>
          </div>
        </div>
      </header>

      <section className="room-lobby-player-grid" aria-label="房间玩家">
        {snapshot.players.map((player) => (
          <PlayerLobbyCard
            key={player.id}
            canKick={isHost && player.id !== sessionId}
            isMe={player.id === sessionId}
            isRoomHost={snapshot.hostPlayerId === player.id}
            onKick={() => kickPlayer(player.id)}
            onOpenCharacterPicker={() => setCharacterPickerOpen(true)}
            player={player}
          />
        ))}
      </section>

      <footer className="room-lobby-footer">
        <div className="room-lobby-status-line">
          {lastError ? <span className="error-copy">{lastError}</span> : null}
          {toolNotice ? <span>{toolNotice.message}</span> : null}
          {!lastError && !toolNotice ? (
            <span>{allConnectedPlayersReady ? "所有在线玩家已准备" : "等待玩家准备"}</span>
          ) : null}
        </div>
        <div className="room-lobby-footer-actions">
          <button
            type="button"
            className="room-lobby-ready-button"
            data-testid="lobby-ready-button"
            onClick={() => setReady(!(me?.isReady ?? false))}
            disabled={!me}
          >
            {me?.isReady ? "取消准备" : "准备"}
          </button>
          <button
            type="button"
            className="room-lobby-start-button"
            data-testid="start-game-button"
            onClick={() => startGame()}
            disabled={!canStartGame}
          >
            开始游戏
          </button>
        </div>
      </footer>

      {isCharacterPickerOpen ? (
        <div
          className="room-lobby-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCharacterPickerOpen(false);
            }
          }}
        >
          <section
            className="room-lobby-character-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-lobby-character-modal-title"
          >
            <div className="room-lobby-character-modal__header">
              <div>
                <p className="eyebrow">角色</p>
                <h2 id="room-lobby-character-modal-title">选择角色</h2>
              </div>
              <button
                type="button"
                className="room-lobby-modal-close"
                aria-label="关闭选角"
                onClick={() => setCharacterPickerOpen(false)}
              >
                x
              </button>
            </div>

            <div className="room-lobby-character-grid">
              {CHARACTER_OPTIONS.map((characterId) => {
                const isSelected = me?.characterId === characterId;

                return (
                  <button
                    key={characterId}
                    type="button"
                    className={["room-lobby-character-choice", isSelected ? "selected" : ""]
                      .filter(Boolean)
                      .join(" ")}
                    data-testid={`lobby-character-option-${characterId}`}
                    onClick={() => handleCharacterPick(characterId)}
                  >
                    <LobbyCharacterCard characterId={characterId} />
                    {isSelected ? <span className="room-lobby-selected-mark">当前角色</span> : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
