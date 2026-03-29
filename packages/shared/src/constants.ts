export const WATCHER_ROOM_NAME = "watcher_room";
export const BOARD_WIDTH = 9;
export const BOARD_HEIGHT = 7;
export const DEFAULT_MOVE_POINTS = 0;
export const DEFAULT_MOVEMENT_ACTIONS = 0;
export const BASE_MOVEMENT_ACTIONS_PER_TURN = 1;

export const MOVEMENT_DIE_FACES = [1, 2, 3, 4, 5, 6] as const;

export const PLAYER_COLORS = ["#ec6f5a", "#3d8f85", "#f3c969", "#5d7cf2"];

export const PLAYER_SPAWNS = [
  { x: 1, y: 0 },
  { x: BOARD_WIDTH - 2, y: BOARD_HEIGHT - 1 },
  { x: 1, y: BOARD_HEIGHT - 1 },
  { x: BOARD_WIDTH - 2, y: 0 }
];
