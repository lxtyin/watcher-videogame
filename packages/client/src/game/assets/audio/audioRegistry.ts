import type { PresentationSoundCueId } from "@watcher/shared";
import gameMarimbaTurnUrl from "./bgm/game-marimba-turn.mp3";
import menuPorchsidePauseUrl from "./bgm/menu-porchside-pause.mp3";
import footstepSoft01Url from "./sfx/footstep-soft-01.ogg";
import footstepSoft02Url from "./sfx/footstep-soft-02.ogg";
import footstepSoft03Url from "./sfx/footstep-soft-03.ogg";
import footstepSoft04Url from "./sfx/footstep-soft-04.ogg";
import footstepSoft05Url from "./sfx/footstep-soft-05.ogg";
import terrainEarthWallBreak01Url from "./sfx/terrain-earth-wall-break-01.ogg";
import toolBuff01Url from "./sfx/tool-buff-01.ogg";
import toolBuild01Url from "./sfx/tool-build-01.ogg";
import toolChain01Url from "./sfx/tool-chain-01.ogg";
import toolExplosion01Url from "./sfx/tool-explosion-01.wav";
import toolPunch01Url from "./sfx/tool-punch-01.ogg";
import toolShotBullet01Url from "./sfx/tool-shot-bullet-01.wav";
import toolShotHeavy01Url from "./sfx/tool-shot-heavy-01.ogg";
import toolTeleport01Url from "./sfx/tool-teleport-01.ogg";
import toolThrow01Url from "./sfx/tool-throw-01.ogg";

export type BgmTrackId = "gameplay" | "menu";

interface BgmTrackDefinition {
  loop: true;
  src: string;
  volume: number;
}

interface SoundCueAssetDefinition {
  variants: readonly string[];
  volume: number;
}

export const BGM_TRACKS: Record<BgmTrackId, BgmTrackDefinition> = {
  gameplay: {
    loop: true,
    src: gameMarimbaTurnUrl,
    volume: 0.34
  },
  menu: {
    loop: true,
    src: menuPorchsidePauseUrl,
    volume: 0.4
  }
};

export const SOUND_CUE_ASSETS: Record<PresentationSoundCueId, SoundCueAssetDefinition> = {
  footstep_soft: {
    variants: [
      footstepSoft01Url,
      footstepSoft02Url,
      footstepSoft03Url,
      footstepSoft04Url,
      footstepSoft05Url
    ],
    volume: 0.52
  },
  terrain_earth_wall_break: {
    variants: [terrainEarthWallBreak01Url],
    volume: 0.72
  },
  tool_buff: {
    variants: [toolBuff01Url],
    volume: 0.5
  },
  tool_build: {
    variants: [toolBuild01Url],
    volume: 0.62
  },
  tool_chain: {
    variants: [toolChain01Url],
    volume: 0.6
  },
  tool_explosion: {
    variants: [toolExplosion01Url],
    volume: 0.8
  },
  tool_punch: {
    variants: [toolPunch01Url],
    volume: 0.72
  },
  tool_shot_bullet: {
    variants: [toolShotBullet01Url],
    volume: 0.62
  },
  tool_shot_heavy: {
    variants: [toolShotHeavy01Url],
    volume: 0.68
  },
  tool_teleport: {
    variants: [toolTeleport01Url],
    volume: 0.54
  },
  tool_throw: {
    variants: [toolThrow01Url],
    volume: 0.58
  }
};

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function pickSoundCueVariant(cueId: PresentationSoundCueId, seedKey: string): string {
  const definition = SOUND_CUE_ASSETS[cueId];
  const variantIndex = hashString(`${cueId}:${seedKey}`) % definition.variants.length;

  return definition.variants[variantIndex] ?? definition.variants[0]!;
}
