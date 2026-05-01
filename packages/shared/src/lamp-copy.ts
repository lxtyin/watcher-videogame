import { nextDeterministicSeed } from "./dice";
import { getPlayerTagNumber } from "./playerTags";
import type {
  PlayerTagMap,
  ToolHistoryEntrySnapshot,
  ToolLoadoutDefinition,
  ToolParameterValueMap
} from "./types";

export const LAMP_LAST_TURN_END_TAG = "lamp:last-turn-end-turn-number";
export const LAMP_COPY_HISTORY_INDEX_TAG = "lamp:copy-history-index";

export interface LampCopyCandidate {
  historyIndex: number;
  historyEntry: ToolHistoryEntrySnapshot;
}

interface LampHistoryLike {
  params: ToolParameterValueMap;
  playerId: string;
  source: string;
  toolId: string;
  turnNumber: number;
}

function cloneToolParams(params: ToolParameterValueMap): ToolParameterValueMap {
  return {
    ...params
  };
}

export function buildLampCopyChoiceId(historyIndex: number): string {
  return `history:${historyIndex}`;
}

export function parseLampCopyChoiceId(choiceId: string): number | null {
  if (!choiceId.startsWith("history:")) {
    return null;
  }

  const historyIndex = Number.parseInt(choiceId.slice("history:".length), 10);
  return Number.isFinite(historyIndex) && historyIndex >= 0 ? historyIndex : null;
}

export function getLampLastTurnEndNumber(tags: PlayerTagMap): number {
  return getPlayerTagNumber(tags, LAMP_LAST_TURN_END_TAG);
}

export function getLampCopyHistoryIndex(tags: PlayerTagMap): number | null {
  const historyIndex = getPlayerTagNumber(tags, LAMP_COPY_HISTORY_INDEX_TAG);
  return historyIndex >= 0 ? historyIndex : null;
}

export function getLampEligibleHistoryEntries<TEntry extends LampHistoryLike>(
  actorId: string,
  tags: PlayerTagMap,
  toolHistory: readonly TEntry[],
  currentTurnNumber: number
): Array<{ historyEntry: TEntry; historyIndex: number }> {
  const lastTurnEndNumber = getLampLastTurnEndNumber(tags);

  return toolHistory.flatMap((historyEntry, historyIndex) => {
    if (historyEntry.playerId === actorId || historyEntry.toolId === "lampCopy") {
      return [];
    }

    if (
      historyEntry.turnNumber <= lastTurnEndNumber ||
      historyEntry.turnNumber >= currentTurnNumber
    ) {
      return [];
    }

    return [
      {
        historyIndex,
        historyEntry: {
          ...historyEntry,
          params: cloneToolParams(historyEntry.params)
        }
      }
    ];
  });
}

export function sampleLampCopyCandidates(
  candidates: readonly LampCopyCandidate[],
  limit: number,
  seed: number
): LampCopyCandidate[] {
  const pool = [...candidates];
  const selected: LampCopyCandidate[] = [];
  let nextSeed = seed;

  while (pool.length > 0 && selected.length < limit) {
    nextSeed = nextDeterministicSeed(nextSeed);
    const candidateIndex = nextSeed % pool.length;
    const [candidate] = pool.splice(candidateIndex, 1);

    if (candidate) {
      selected.push(candidate);
    }
  }

  return selected;
}

export function getLampCopyCandidates(
  actorId: string,
  tags: PlayerTagMap,
  toolHistory: readonly ToolHistoryEntrySnapshot[],
  currentTurnNumber: number,
  seed: number
): LampCopyCandidate[] {
  return sampleLampCopyCandidates(
    getLampEligibleHistoryEntries(actorId, tags, toolHistory, currentTurnNumber),
    3,
    seed
  );
}

export function findLampCopyCandidateByHistoryIndex(
  actorId: string,
  tags: PlayerTagMap,
  toolHistory: readonly ToolHistoryEntrySnapshot[],
  currentTurnNumber: number,
  seed: number,
  historyIndex: number
): LampCopyCandidate | null {
  return (
    getLampCopyCandidates(actorId, tags, toolHistory, currentTurnNumber, seed).find(
      (candidate) => candidate.historyIndex === historyIndex
    ) ?? null
  );
}

export function toLampCopiedToolLoadout(candidate: LampCopyCandidate): ToolLoadoutDefinition {
  return {
    toolId: candidate.historyEntry.toolId,
    params: cloneToolParams(candidate.historyEntry.params),
    source: candidate.historyEntry.source
  };
}
