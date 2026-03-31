import { useEffect } from "react";
import { useGameStore } from "../state/useGameStore";

// The animation clock keeps lightweight scene motion advancing outside of automated runs.
export function useAnimationClock(): void {
  const tickRealTime = useGameStore((state) => state.tickRealTime);

  useEffect(() => {
    let frameId = 0;
    let previousTime = performance.now();

    const loop = (currentTime: number) => {
      tickRealTime(currentTime - previousTime);
      previousTime = currentTime;
      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [tickRealTime]);
}
