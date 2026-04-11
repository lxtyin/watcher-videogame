import { buildRaceStandings, type GameSnapshot } from "@watcher/shared";
import { useMemo } from "react";
import { UiIcon } from "../assets/ui/icons";
import { PetThumbnail } from "./PetThumbnail";

export function RaceSettlementOverlay({
  onBackToHome,
  onBackToRoom,
  snapshot
}: {
  onBackToHome: () => void;
  onBackToRoom: () => void;
  snapshot: GameSnapshot;
}) {
  const standings = useMemo(
    () =>
      buildRaceStandings(snapshot.players)
        .map((entry) => {
          const player = snapshot.players.find((candidate) => candidate.id === entry.playerId);

          return player
            ? {
                ...entry,
                player
              }
            : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [snapshot.players]
  );

  return (
    <div className="settlement-overlay">
      <section className="settlement-card">
        <div className="settlement-card__header">
          <div>
            <p className="eyebrow">Race Result</p>
            <h2>竞速结算</h2>
            <p className="lead">
              所有玩家都已经到达终点，当前展示的是本局排行榜。
            </p>
          </div>
          <span className="status-pill status-connected">已完赛</span>
        </div>

        <div className="settlement-list">
          {standings.map(({ finishedTurnNumber, player, rank }) => (
            <article key={player.id} className="settlement-row">
              <div className="settlement-rank">#{rank}</div>
              <PetThumbnail color={player.color} fallbackSeed={player.id} petId={player.petId} />
              <div className="settlement-player-meta">
                <strong>{player.name}</strong>
                <span>{player.id}</span>
              </div>
              <div className="settlement-turn-meta">
                <span>到达回合</span>
                <strong>{finishedTurnNumber}</strong>
              </div>
            </article>
          ))}
        </div>

        <div className="settlement-actions">
          <button type="button" onClick={onBackToRoom}>
            <UiIcon name="return" />
            <span>回到房间</span>
          </button>
          <button type="button" onClick={onBackToHome}>
            <UiIcon name="home" />
            <span>回到主页</span>
          </button>
        </div>
      </section>
    </div>
  );
}
