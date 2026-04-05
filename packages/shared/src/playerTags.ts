import type { PlayerTagMap, PlayerTagValue } from "./types";

function normalizePlayerTags(tags: PlayerTagMap): PlayerTagMap {
  return Object.fromEntries(
    Object.entries(tags).filter(([, value]) => value !== undefined)
  );
}

export function clonePlayerTags(tags: PlayerTagMap): PlayerTagMap {
  return {
    ...tags
  };
}

export function getPlayerTagBoolean(tags: PlayerTagMap, key: string): boolean {
  return tags[key] === true;
}

export function getPlayerTagNumber(tags: PlayerTagMap, key: string): number {
  const value = tags[key];

  return typeof value === "number" ? value : 0;
}

export function setPlayerTagValue(
  tags: PlayerTagMap,
  key: string,
  value: PlayerTagValue | undefined
): PlayerTagMap {
  const nextTags = {
    ...tags
  };

  if (value === undefined) {
    delete nextTags[key];
  } else {
    nextTags[key] = value;
  }

  return normalizePlayerTags(nextTags);
}
