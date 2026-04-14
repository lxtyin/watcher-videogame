const SHADOW_CAMERA_MIN_BOUNDS = 8;
const SHADOW_CAMERA_MARGIN = 3;

export function estimateBoardShadowBounds(boardWidth: number, boardHeight: number): number {
  return Math.max(SHADOW_CAMERA_MIN_BOUNDS, Math.hypot(boardWidth, boardHeight) * 0.5 + SHADOW_CAMERA_MARGIN);
}
