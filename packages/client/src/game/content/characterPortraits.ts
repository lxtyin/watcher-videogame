import type { CharacterId } from "@watcher/shared";
import awmPortraitUrl from "../assets/characters/portraits/awm.jpg";
import blazePortraitUrl from "../assets/characters/portraits/blaze.jpg";
import chainPortraitUrl from "../assets/characters/portraits/chain.jpg";
import ehhPortraitUrl from "../assets/characters/portraits/ehh.jpg";
import fartherPortraitUrl from "../assets/characters/portraits/farther.jpg";
import lampPortraitUrl from "../assets/characters/portraits/lamp.png";
import latePortraitUrl from "../assets/characters/portraits/late.jpg";
import leaderPortraitUrl from "../assets/characters/portraits/leader.jpg";
import mountainPortraitUrl from "../assets/characters/portraits/mountain.png";
import volatyPortraitUrl from "../assets/characters/portraits/volaty.jpg";

const CHARACTER_PORTRAIT_URLS: Record<string, string> = {
  awm: awmPortraitUrl,
  blaze: blazePortraitUrl,
  chain: chainPortraitUrl,
  ehh: ehhPortraitUrl,
  farther: fartherPortraitUrl,
  lamp: lampPortraitUrl,
  late: latePortraitUrl,
  leader: leaderPortraitUrl,
  mountain: mountainPortraitUrl,
  volaty: volatyPortraitUrl
};

export function getCharacterPortraitUrl(portraitId: CharacterId | string): string | null {
  return CHARACTER_PORTRAIT_URLS[portraitId] ?? null;
}
