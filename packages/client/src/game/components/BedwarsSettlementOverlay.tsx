import { getTeamDisplayLabel, type GameSnapshot, type TeamId } from "@watcher/shared";
import { UiIcon } from "../assets/ui/icons";
import { PetThumbnail } from "./PetThumbnail";

function getWinningTeamId(snapshot: GameSnapshot): TeamId | null {
  return snapshot.players.find((player) => player.boardVisible && player.teamId)?.teamId ?? null;
}

export function BedwarsSettlementOverlay({
  onBackToHome,
  onBackToRoom,
  snapshot
}: {
  onBackToHome: () => void;
  onBackToRoom: () => void;
  snapshot: GameSnapshot;
}) {
  const winningTeamId = getWinningTeamId(snapshot);
  const orderedPlayers = [...snapshot.players].sort((left, right) => {
    if ((left.teamId ?? "").localeCompare(right.teamId ?? "") !== 0) {
      return (left.teamId ?? "").localeCompare(right.teamId ?? "");
    }

    if (Number(right.boardVisible) !== Number(left.boardVisible)) {
      return Number(right.boardVisible) - Number(left.boardVisible);
    }

    return left.name.localeCompare(right.name);
  });

  return (
    <div className="settlement-overlay">
      <section className="settlement-card">
        <div className="settlement-card__header">
          <div>
            <p className="eyebrow">Bedwars Result</p>
            <h2>起床战争结算</h2>
            <p className="lead">
              {winningTeamId ? `${getTeamDisplayLabel(winningTeamId)}获得胜利。` : "本局已结束。"}
            </p>
          </div>
          <span className="status-pill status-connected">已结束</span>
        </div>

        <div className="settlement-list">
          {orderedPlayers.map((player) => (
            <article key={player.id} className="settlement-row">
              <div className="settlement-rank">{player.teamId ? getTeamDisplayLabel(player.teamId) : "-"}</div>
              <PetThumbnail color={player.color} fallbackSeed={player.id} petId={player.petId} />
              <div className="settlement-player-meta">
                <strong>{player.name}</strong>
                <span>{player.boardVisible ? "存活" : "已淘汰"}</span>
              </div>
              <div className="settlement-turn-meta">
                <span>角色</span>
                <strong>{player.characterId}</strong>
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

