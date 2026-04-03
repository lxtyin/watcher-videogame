import { useMemo } from "react";
import { getPetIds, getPetLabel, resolvePetId } from "../content/pets";
import { PetThumbnail } from "./PetThumbnail";

interface PlayerProfileCardProps {
  onPetIdChange: (petId: string) => void;
  onPlayerNameChange: (playerName: string) => void;
  petId: string;
  playerName: string;
}

const PET_IDS = getPetIds();

function getAdjacentPetId(currentPetId: string, offset: number): string {
  const currentIndex = PET_IDS.indexOf(resolvePetId(currentPetId));

  if (currentIndex < 0) {
    return PET_IDS[0] ?? currentPetId;
  }

  const nextIndex = (currentIndex + offset + PET_IDS.length) % PET_IDS.length;
  return PET_IDS[nextIndex] ?? currentPetId;
}

// The landing profile card keeps player identity editing in one compact place.
export function PlayerProfileCard({
  onPetIdChange,
  onPlayerNameChange,
  petId,
  playerName
}: PlayerProfileCardProps) {
  const resolvedPetId = useMemo(() => resolvePetId(petId), [petId]);

  return (
    <section className="player-profile-card">
      <div className="player-profile-card__preview">
        <PetThumbnail color="#dba84a" petId={resolvedPetId} />
      </div>

      <div className="player-profile-card__body">
        <label className="player-profile-card__field">
          <span>用户名</span>
          <input
            data-testid="profile-player-name-input"
            type="text"
            value={playerName}
            onChange={(event) => onPlayerNameChange(event.target.value)}
            maxLength={24}
            placeholder="输入你的名字"
          />
        </label>

        <div className="player-profile-card__pet-row">
          <span className="player-profile-card__pet-label">棋子</span>
          <div className="player-profile-card__pet-controls">
            <button
              type="button"
              className="icon-button"
              data-testid="profile-pet-prev"
              aria-label="选择上一个棋子"
              onClick={() => onPetIdChange(getAdjacentPetId(resolvedPetId, -1))}
            >
              ‹
            </button>

            <strong className="player-profile-card__pet-name">{getPetLabel(resolvedPetId)}</strong>

            <button
              type="button"
              className="icon-button"
              data-testid="profile-pet-next"
              aria-label="选择下一个棋子"
              onClick={() => onPetIdChange(getAdjacentPetId(resolvedPetId, 1))}
            >
              ›
            </button>

            <button
              type="button"
              className="chip-button"
              data-testid="profile-pet-random"
              onClick={() => onPetIdChange(PET_IDS[Math.floor(Math.random() * PET_IDS.length)] ?? resolvedPetId)}
            >
              随机
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
