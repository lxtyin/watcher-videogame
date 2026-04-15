import type { Direction } from "@watcher/shared";
import type { CSSProperties } from "react";
import { TerrainThumbnail } from "../assets/board/TerrainThumbnail";
import type { SceneInspectionCardData } from "../content/inspectables";

interface SceneInspectionCardProps {
  inspection: SceneInspectionCardData | null;
}

const DIRECTION_TOKENS: Record<Direction, string> = {
  up: "↑",
  right: "→",
  down: "↓",
  left: "←"
};

// The inspection card is a scene overlay that appears only while the pointer is held.
export function SceneInspectionCard({ inspection }: SceneInspectionCardProps) {
  if (!inspection) {
    return null;
  }

  return (
    <div className="scene-inspection-overlay">
      <div
        className="scene-inspection-card"
        style={{ "--inspection-accent": inspection.accent } as CSSProperties}
      >
        <div className="scene-inspection-card__thumb">
          {inspection.terrainThumbnail ? (
            <TerrainThumbnail
              entry={inspection.terrainThumbnail.entry}
              thumbnailUrl={inspection.terrainThumbnail.thumbnailUrl}
            />
          ) : (
            <span className="scene-inspection-card__token">{inspection.thumbnailToken}</span>
          )}
          {!inspection.terrainThumbnail && inspection.direction ? (
            <span className="scene-inspection-card__direction">
              {DIRECTION_TOKENS[inspection.direction]}
            </span>
          ) : null}
        </div>
        <div className="scene-inspection-card__copy">
          <p className="scene-inspection-card__kind">{inspection.kindLabel}</p>
          <strong>{inspection.title}</strong>
          {inspection.subtitle ? (
            <p className="scene-inspection-card__subtitle">{inspection.subtitle}</p>
          ) : null}
          <p className="scene-inspection-card__description">{inspection.description}</p>
          {inspection.details?.length ? (
            <div className="scene-inspection-card__details">
              {inspection.details.map((detail) => (
                <span key={detail}>{detail}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
