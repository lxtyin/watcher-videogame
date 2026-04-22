import type { PresentationAnchor, SoundPresentationEvent } from "@watcher/shared";
import {
  BGM_TRACKS,
  pickSoundCueVariant,
  SOUND_CUE_ASSETS,
  type BgmTrackId
} from "../assets/audio/audioRegistry";

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume));
}

class GameAudioRuntime {
  private activeSfx = new Set<HTMLAudioElement>();
  private bgmElement: HTMLAudioElement | null = null;
  private currentBgmTrackId: BgmTrackId | null = null;
  private requestedBgmTrackId: BgmTrackId | null = null;
  private sfxVolumeScale = 1;
  private unlocked = false;

  unlock(): void {
    this.unlocked = true;
    this.syncBgmTrack();
  }

  setBgmTrack(trackId: BgmTrackId | null): void {
    this.requestedBgmTrackId = trackId;
    this.syncBgmTrack();
  }

  playSoundEvent(sequence: number, event: SoundPresentationEvent): void {
    this.playCue(
      event.sound.cueId,
      `${sequence}:${event.id}`,
      event.sound.volume ?? 1,
      event.sound.anchor
    );
  }

  private ensureBgmElement(): HTMLAudioElement | null {
    if (typeof Audio === "undefined") {
      return null;
    }

    if (!this.bgmElement) {
      this.bgmElement = new Audio();
      this.bgmElement.preload = "auto";
    }

    return this.bgmElement;
  }

  private syncBgmTrack(): void {
    const bgmElement = this.ensureBgmElement();

    if (!bgmElement) {
      return;
    }

    const requestedTrackId = this.requestedBgmTrackId;

    if (!requestedTrackId) {
      bgmElement.pause();
      this.currentBgmTrackId = null;
      return;
    }

    const trackDefinition = BGM_TRACKS[requestedTrackId];

    if (this.currentBgmTrackId !== requestedTrackId) {
      bgmElement.pause();
      bgmElement.src = trackDefinition.src;
      bgmElement.currentTime = 0;
      bgmElement.loop = trackDefinition.loop;
      this.currentBgmTrackId = requestedTrackId;
    }

    bgmElement.volume = clampVolume(trackDefinition.volume);

    if (!this.unlocked) {
      return;
    }

    void bgmElement.play().catch(() => {
      // Browser autoplay policy can still reject transiently; the next unlock or route change retries.
    });
  }

  private playCue(
    cueId: keyof typeof SOUND_CUE_ASSETS,
    seedKey: string,
    volumeScale: number,
    anchor: PresentationAnchor | null
  ): void {
    void anchor;

    if (!this.unlocked || typeof Audio === "undefined") {
      return;
    }

    const cueDefinition = SOUND_CUE_ASSETS[cueId];
    const audio = new Audio(pickSoundCueVariant(cueId, seedKey));
    const cleanup = () => {
      this.activeSfx.delete(audio);
      audio.removeEventListener("ended", cleanup);
      audio.removeEventListener("error", cleanup);
    };

    audio.preload = "auto";
    audio.volume = clampVolume(cueDefinition.volume * volumeScale * this.sfxVolumeScale);
    audio.addEventListener("ended", cleanup);
    audio.addEventListener("error", cleanup);
    this.activeSfx.add(audio);
    void audio.play().catch(() => {
      cleanup();
    });
  }
}

export const gameAudioRuntime = new GameAudioRuntime();
