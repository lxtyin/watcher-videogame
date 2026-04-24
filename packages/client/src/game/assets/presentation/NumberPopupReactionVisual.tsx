import { Html } from "@react-three/drei";
import type { ActiveNumberPopupReactionPlayback } from "../../animation/playbackEngine";
import { toWorldPosition } from "../../utils/boardMath";

export function NumberPopupReactionVisual({
  boardHeight,
  boardWidth,
  reaction
}: {
  boardHeight: number;
  boardWidth: number;
  reaction: ActiveNumberPopupReactionPlayback;
}) {
  const [worldX, , worldZ] = toWorldPosition(reaction.position, boardWidth, boardHeight);
  const rise = 0.78 + reaction.progress * 0.46;
  const opacity = 1 - reaction.progress;
  const scale = 0.88 + Math.sin(reaction.progress * Math.PI) * 0.2;
  const shadowOpacity = 0.32 + opacity * 0.18;

  return (
    <Html position={[worldX, rise, worldZ]} center>
      <div
        style={{
          opacity,
          pointerEvents: "none",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          willChange: "transform, opacity"
        }}
      >
        <div
          style={{
            background: "rgba(53, 19, 19, 0.78)",
            border: "1px solid rgba(255, 241, 184, 0.58)",
            borderRadius: "999px",
            boxShadow: `0 8px 24px rgba(53, 19, 19, ${shadowOpacity})`,
            color: "#fff1b8",
            fontSize: "1rem",
            fontWeight: 800,
            lineHeight: 1,
            minWidth: "2rem",
            padding: "0.22rem 0.48rem",
            textAlign: "center"
          }}
        >
          {String(reaction.value)}
        </div>
      </div>
    </Html>
  );
}
