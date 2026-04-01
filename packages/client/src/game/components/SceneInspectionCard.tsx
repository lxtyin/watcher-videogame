import { Html } from "@react-three/drei";
import type { Direction } from "@watcher/shared";
import type { CSSProperties } from "react";
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
    <Html fullscreen>
      <div className="scene-inspection-overlay">
        <div
          className="scene-inspection-card"
          style={{ "--inspection-accent": inspection.accent } as CSSProperties}
        >
          <div className="scene-inspection-card__thumb">
            <span className="scene-inspection-card__token">{inspection.thumbnailToken}</span>
            {inspection.direction ? (
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
          </div>
        </div>
      </div>
    </Html>
  );
}
