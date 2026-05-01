import type { PresentationAnchor, SoundPresentationEvent } from "@watcher/shared";
import {
  BGM_TRACKS,
  pickSoundCueVariant,
  SOUND_CUE_ASSETS,
  type BgmTrackId
} from "../assets/audio/audioRegistry";

const BGM_MUTED_STORAGE_KEY = "watcher-audio-bgm-muted";
const SFX_MUTED_STORAGE_KEY = "watcher-audio-sfx-muted";

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume));
}

function readStoredBoolean(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeStoredBoolean(key: string, value: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // Audio state still applies for the current page even if storage is unavailable.
  }
}

class GameAudioRuntime {
  private activeSfx = new Set<HTMLAudioElement>();
  private bgmMuted = readStoredBoolean(BGM_MUTED_STORAGE_KEY);
  private bgmElement: HTMLAudioElement | null = null;
  private currentBgmTrackId: BgmTrackId | null = null;
  private requestedBgmTrackId: BgmTrackId | null = null;
  private sfxMuted = readStoredBoolean(SFX_MUTED_STORAGE_KEY);
  private sfxVolumeScale = 1;
  private unlocked = false;

  getMuteState(): { bgmMuted: boolean; sfxMuted: boolean } {
    return {
      bgmMuted: this.bgmMuted,
      sfxMuted: this.sfxMuted
    };
  }

  setBgmMuted(muted: boolean): void {
    this.bgmMuted = muted;
    writeStoredBoolean(BGM_MUTED_STORAGE_KEY, muted);
    this.syncBgmTrack();
  }

  setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted;
    writeStoredBoolean(SFX_MUTED_STORAGE_KEY, muted);

    if (!muted) {
      return;
    }

    for (const audio of this.activeSfx) {
      audio.pause();
    }
    this.activeSfx.clear();
  }

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

    if (!requestedTrackId || this.bgmMuted) {
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

    if (this.sfxMuted || !this.unlocked || typeof Audio === "undefined") {
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
