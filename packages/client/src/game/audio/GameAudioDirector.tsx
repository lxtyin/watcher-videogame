import type { SoundPresentationEvent } from "@watcher/shared";
import { useEffect } from "react";
import type { BgmTrackId } from "../assets/audio/audioRegistry";
import { useGameStore } from "../state/useGameStore";
import { gameAudioRuntime } from "./audioRuntime";

interface GameAudioDirectorProps {
  bgmTrackId: BgmTrackId | null;
}

export function GameAudioDirector({ bgmTrackId }: GameAudioDirectorProps) {
  const activeActionPresentation = useGameStore((state) => state.activeActionPresentation);
  const activeActionPresentationStartedAtMs = useGameStore(
    (state) => state.activeActionPresentationStartedAtMs
  );

  useEffect(() => {
    gameAudioRuntime.setBgmTrack(bgmTrackId);
  }, [bgmTrackId]);

  useEffect(() => {
    const unlockAudio = () => {
      gameAudioRuntime.unlock();
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!activeActionPresentation || activeActionPresentationStartedAtMs === null) {
      return;
    }

    const currentSimulationTimeMs = useGameStore.getState().simulationTimeMs;
    const elapsedMs = Math.max(0, currentSimulationTimeMs - activeActionPresentationStartedAtMs);
    const soundEvents = activeActionPresentation.events.filter(
      (event): event is SoundPresentationEvent => event.kind === "sound"
    );
    const timeoutIds: number[] = [];

    for (const soundEvent of soundEvents) {
      const playSound = () => {
        gameAudioRuntime.playSoundEvent(activeActionPresentation.sequence, soundEvent);
      };
      const remainingDelayMs = soundEvent.startMs - elapsedMs;

      if (remainingDelayMs <= 0) {
        playSound();
        continue;
      }

      timeoutIds.push(window.setTimeout(playSound, remainingDelayMs));
    }

    return () => {
      timeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, [activeActionPresentation?.sequence, activeActionPresentationStartedAtMs]);

  return null;
}
