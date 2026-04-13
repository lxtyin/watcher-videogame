import {
  getToolDefinition,
  type GameSnapshot,
  type RolledToolId
} from "@watcher/shared";

type DiceRollDieKind = "point" | "tool";

export interface DiceRollDieAnimation {
  finalLocalRotation: [number, number, number];
  finalYaw: number;
  key: string;
  kind: DiceRollDieKind;
  label: string;
  landingOffsetX: number;
  landingOffsetZ: number;
  resultLabel: string;
  spinTurnsX: number;
  spinTurnsZ: number;
  startOffsetX: number;
  startOffsetZ: number;
  wobblePhase: number;
}

export interface DiceRollAnimation {
  dice: DiceRollDieAnimation[];
  durationMs: number;
  holdMs: number;
  id: string;
  rollMs: number;
  startedAtMs: number;
}

const POINT_DIE_LABEL = "点数骰";
const TOOL_DIE_LABEL = "工具骰";
const DICE_ROLL_MS = 1000;
const DICE_HOLD_MS = 500;
export const DICE_ROLL_TOTAL_MS = DICE_ROLL_MS + DICE_HOLD_MS;

// Update these two arrays when the painted GLB face order is finalized.
// Their positions correspond to each die's *_FACE_TOP_ORIENTATIONS below.
export const POINT_DIE_FACE_ORDER = [1, 5, 2, 4, 6, 3] as const;
export const TOOL_DIE_FACE_ORDER: readonly RolledToolId[] = [
  "basketball",
  "punch",
  "buildWall",
  "jump",
  "hookshot",
  "rocket"
] as const;

export const ASSUMED_POINT_DIE_FACES = POINT_DIE_FACE_ORDER;
export const ASSUMED_TOOL_DIE_FACES = TOOL_DIE_FACE_ORDER;

// Each entry is the fixed local rotation that puts one cube face on top.
// The die's random final angle is applied as a separate world-y yaw in the renderer.
export const POINT_DIE_FACE_TOP_ORIENTATIONS: readonly [number, number, number][] = [
  [0, 0, 0],
  [0, 0, Math.PI / 2],
  [-Math.PI / 2, 0, 0],
  [Math.PI / 2, 0, 0],
  [0, 0, -Math.PI / 2],
  [Math.PI, 0, 0]
];

// Keep this separate from POINT_DIE_FACE_TOP_ORIENTATIONS because the two GLBs
// can paint their faces in different local directions even though both are cubes.
export const TOOL_DIE_FACE_TOP_ORIENTATIONS: readonly [number, number, number][] = [
  [0, 0, 0],
  [0, 0, Math.PI / 2],
  [-Math.PI / 2, 0, 0],
  [Math.PI / 2, 0, 0],
  [0, 0, -Math.PI / 2],
  [Math.PI, 0, 0]
];

function hashString(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function nextRandom(seedState: { value: number }): number {
  seedState.value = (seedState.value * 1664525 + 1013904223) >>> 0;

  return seedState.value / 0x100000000;
}

function randomBetween(seedState: { value: number }, min: number, max: number): number {
  return min + (max - min) * nextRandom(seedState);
}

function getNewDiceRolledEventId(previousSnapshot: GameSnapshot, nextSnapshot: GameSnapshot): string | null {
  const previousEventIds = new Set(previousSnapshot.eventLog.map((entry) => entry.id));
  const newDiceEvent = nextSnapshot.eventLog.find(
    (entry) => entry.type === "dice_rolled" && !previousEventIds.has(entry.id)
  );

  return newDiceEvent?.id ?? null;
}

function getPointFaceIndex(value: number): number {
  const faceIndex = POINT_DIE_FACE_ORDER.indexOf(value as (typeof POINT_DIE_FACE_ORDER)[number]);

  return faceIndex >= 0 ? faceIndex : 0;
}

function getToolFaceIndex(toolId: RolledToolId): number {
  const faceIndex = TOOL_DIE_FACE_ORDER.indexOf(toolId);

  return faceIndex >= 0 ? faceIndex : 0;
}

function getFinalLocalRotation(kind: DiceRollDieKind, faceIndex: number): [number, number, number] {
  const orientations =
    kind === "point" ? POINT_DIE_FACE_TOP_ORIENTATIONS : TOOL_DIE_FACE_TOP_ORIENTATIONS;
  const [x, y, z] = orientations[faceIndex] ?? orientations[0]!;

  return [x, y, z];
}

function toCenteredWorldPosition(
  position: { x: number; y: number },
  boardWidth: number,
  boardHeight: number
): { x: number; z: number } {
  return {
    x: position.x - (boardWidth / 2 - 0.5),
    z: position.y - (boardHeight / 2 - 0.5)
  };
}

function createDieAnimation(
  seedState: { value: number },
  input: {
    anchorX: number;
    anchorZ: number;
    faceIndex: number;
    index: number;
    kind: DiceRollDieKind;
    label: string;
    resultLabel: string;
    total: number;
  }
): DiceRollDieAnimation {
  const laneX = input.total === 1 ? 0 : (input.index - (input.total - 1) / 2) * 1.35;
  const landingOffsetX = input.anchorX + laneX + randomBetween(seedState, -0.22, 0.22);
  const landingOffsetZ = input.anchorZ + randomBetween(seedState, -0.34, 0.34);
  const yaw = randomBetween(seedState, 0, Math.PI * 2);

  return {
    finalLocalRotation: getFinalLocalRotation(input.kind, input.faceIndex),
    finalYaw: yaw,
    key: `${input.kind}:${input.index}:${input.resultLabel}`,
    kind: input.kind,
    label: input.label,
    landingOffsetX,
    landingOffsetZ,
    resultLabel: input.resultLabel,
    spinTurnsX: Math.floor(randomBetween(seedState, 3, 6)),
    spinTurnsZ: Math.floor(randomBetween(seedState, 2, 5)),
    startOffsetX: landingOffsetX + randomBetween(seedState, -0.38, 0.38),
    startOffsetZ: landingOffsetZ + randomBetween(seedState, -0.48, 0.48),
    wobblePhase: randomBetween(seedState, 0, Math.PI * 2)
  };
}

export function createDiceRollAnimation(
  previousSnapshot: GameSnapshot,
  nextSnapshot: GameSnapshot,
  startedAtMs: number
): DiceRollAnimation | null {
  const eventId = getNewDiceRolledEventId(previousSnapshot, nextSnapshot);

  if (
    !eventId ||
    previousSnapshot.roomPhase !== "in_game" ||
    nextSnapshot.roomPhase !== "in_game" ||
    previousSnapshot.turnInfo.phase !== "turn-start" ||
    nextSnapshot.turnInfo.phase !== "turn-action" ||
    previousSnapshot.turnInfo.currentPlayerId !== nextSnapshot.turnInfo.currentPlayerId
  ) {
    return null;
  }

  const seedState = {
    value: hashString(
      `${eventId}:${nextSnapshot.turnInfo.turnNumber}:${nextSnapshot.turnInfo.currentPlayerId}`
    )
  };
  const rollingPlayer = nextSnapshot.players.find(
    (player) => player.id === nextSnapshot.turnInfo.currentPlayerId
  );
  const diceAnchor = rollingPlayer
    ? toCenteredWorldPosition(rollingPlayer.position, nextSnapshot.boardWidth, nextSnapshot.boardHeight)
    : { x: 0, z: 0 };
  const diceInputs: Parameters<typeof createDieAnimation>[1][] = [
    {
      anchorX: diceAnchor.x,
      anchorZ: diceAnchor.z,
      faceIndex: getPointFaceIndex(nextSnapshot.turnInfo.lastRolledMoveDieValue),
      index: 0,
      kind: "point" as const,
      label: POINT_DIE_LABEL,
      resultLabel: String(nextSnapshot.turnInfo.lastRolledMoveDieValue),
      total: 1
    },
    ...(nextSnapshot.turnInfo.lastRolledToolId
      ? [
          {
            anchorX: diceAnchor.x,
            anchorZ: diceAnchor.z,
            faceIndex: getToolFaceIndex(nextSnapshot.turnInfo.lastRolledToolId),
            index: 1,
            kind: "tool" as const,
            label: TOOL_DIE_LABEL,
            resultLabel: getToolDefinition(nextSnapshot.turnInfo.lastRolledToolId).label,
            total: 2
          }
        ]
      : [])
  ].map((input, _index, inputs) => ({
    ...input,
    total: inputs.length
  }));

  return {
    dice: diceInputs.map((input, index) => createDieAnimation(seedState, { ...input, index })),
    durationMs: DICE_ROLL_TOTAL_MS,
    holdMs: DICE_HOLD_MS,
    id: eventId,
    rollMs: DICE_ROLL_MS,
    startedAtMs
  };
}
