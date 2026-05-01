import { useEffect, useState } from "react";
import { UiIcon } from "../assets/ui/icons";
import { gameAudioRuntime } from "../audio/audioRuntime";

export function AudioToggleBar() {
  const [muteState, setMuteState] = useState(() => gameAudioRuntime.getMuteState());

  useEffect(() => {
    gameAudioRuntime.setBgmMuted(muteState.bgmMuted);
    gameAudioRuntime.setSfxMuted(muteState.sfxMuted);
  }, [muteState.bgmMuted, muteState.sfxMuted]);

  return (
    <div className="audio-toggle-bar" aria-label="音频开关">
      <button
        type="button"
        className={["audio-toggle-button", muteState.bgmMuted ? "is-muted" : ""].filter(Boolean).join(" ")}
        aria-label={muteState.bgmMuted ? "开启背景音乐" : "关闭背景音乐"}
        aria-pressed={muteState.bgmMuted}
        data-testid="audio-toggle-bgm"
        title={muteState.bgmMuted ? "开启背景音乐" : "关闭背景音乐"}
        onClick={() => setMuteState((current) => ({ ...current, bgmMuted: !current.bgmMuted }))}
      >
        <UiIcon name="music" />
      </button>
      <button
        type="button"
        className={["audio-toggle-button", muteState.sfxMuted ? "is-muted" : ""].filter(Boolean).join(" ")}
        aria-label={muteState.sfxMuted ? "开启音效" : "关闭音效"}
        aria-pressed={muteState.sfxMuted}
        data-testid="audio-toggle-sfx"
        title={muteState.sfxMuted ? "开启音效" : "关闭音效"}
        onClick={() => setMuteState((current) => ({ ...current, sfxMuted: !current.sfxMuted }))}
      >
        <UiIcon name="sound" />
      </button>
    </div>
  );
}
