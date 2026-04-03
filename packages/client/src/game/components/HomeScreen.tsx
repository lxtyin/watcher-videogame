import { useMemo, useState } from "react";
import {
  DEFAULT_GAME_MAP_ID,
  getGameMapDefinition,
  getGameMapIds,
  type GameMapId
} from "@watcher/shared";

interface CreateRoomInput {
  mapId: GameMapId;
  playerName: string;
}

interface JoinRoomInput {
  playerName: string;
  roomCode: string;
}

interface HomeScreenProps {
  busy: boolean;
  initialPlayerName: string;
  lastError: string | null;
  onCreateRoom: (input: CreateRoomInput) => Promise<void>;
  onJoinRoom: (input: JoinRoomInput) => Promise<void>;
}

function describeMapMode(mode: "free" | "race"): string {
  return mode === "race" ? "竞速模式" : "自由模式";
}

// The home screen keeps create/join simple while exposing map choice before room creation.
export function HomeScreen({
  busy,
  initialPlayerName,
  lastError,
  onCreateRoom,
  onJoinRoom
}: HomeScreenProps) {
  const [activeMode, setActiveMode] = useState<"create" | "join">("create");
  const [createPlayerName, setCreatePlayerName] = useState(initialPlayerName);
  const [joinPlayerName, setJoinPlayerName] = useState(initialPlayerName);
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [selectedMapId, setSelectedMapId] = useState<GameMapId>(DEFAULT_GAME_MAP_ID);
  const mapIds = useMemo(() => getGameMapIds(), []);

  return (
    <div className="home-shell">
      <section className="home-hero">
        <p className="eyebrow">Watcher Prototype</p>
        <h1>Watcher</h1>
        <p className="lead">
          先组房，再进局。房主选择地图，所有玩家准备完成后开始游戏；结算后还能回到同一房间继续下一局。
        </p>
      </section>

      <section className="home-card">
        <div className="home-mode-toggle">
          <button
            type="button"
            data-testid="home-mode-create"
            className={activeMode === "create" ? "selected" : ""}
            onClick={() => setActiveMode("create")}
          >
            创建房间
          </button>
          <button
            type="button"
            data-testid="home-mode-join"
            className={activeMode === "join" ? "selected" : ""}
            onClick={() => setActiveMode("join")}
          >
            加入房间
          </button>
        </div>

        {activeMode === "create" ? (
          <form
            className="home-form"
            onSubmit={(event) => {
              event.preventDefault();
              void onCreateRoom({
                mapId: selectedMapId,
                playerName: createPlayerName
              });
            }}
          >
            <label className="home-field">
              <span>用户名</span>
              <input
                data-testid="create-player-name-input"
                type="text"
                value={createPlayerName}
                onChange={(event) => setCreatePlayerName(event.target.value)}
                placeholder="输入你的名字"
                maxLength={24}
              />
            </label>

            <div className="home-map-list">
              {mapIds.map((mapId) => {
                const definition = getGameMapDefinition(mapId);
                const selected = selectedMapId === mapId;

                return (
                  <button
                    key={mapId}
                    type="button"
                    data-testid={`create-map-option-${mapId}`}
                    className={`home-map-card${selected ? " selected" : ""}`}
                    onClick={() => setSelectedMapId(mapId)}
                  >
                    <strong>{definition.label}</strong>
                    <span>{describeMapMode(definition.mode)}</span>
                    <p>{definition.allowDebugTools ? "允许调试与自由试验" : "正式规则，关闭调试发牌"}</p>
                  </button>
                );
              })}
            </div>

            <button type="submit" data-testid="create-room-submit" disabled={busy}>
              {busy ? "正在创建..." : "创建并进入房间"}
            </button>
          </form>
        ) : (
          <form
            className="home-form"
            onSubmit={(event) => {
              event.preventDefault();
              void onJoinRoom({
                playerName: joinPlayerName,
                roomCode: joinRoomCode
              });
            }}
          >
            <label className="home-field">
              <span>房间号</span>
              <input
                data-testid="join-room-code-input"
                type="text"
                value={joinRoomCode}
                onChange={(event) => setJoinRoomCode(event.target.value)}
                placeholder="输入房间号"
              />
            </label>

            <label className="home-field">
              <span>用户名</span>
              <input
                data-testid="join-player-name-input"
                type="text"
                value={joinPlayerName}
                onChange={(event) => setJoinPlayerName(event.target.value)}
                placeholder="输入你的名字"
                maxLength={24}
              />
            </label>

            <button type="submit" data-testid="join-room-submit" disabled={busy}>
              {busy ? "正在加入..." : "加入房间"}
            </button>
          </form>
        )}

        {lastError ? <p className="error-copy home-error">{lastError}</p> : null}
      </section>
    </div>
  );
}
