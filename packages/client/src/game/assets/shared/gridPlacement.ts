// Fractional grid sampling needs the same centered board transform as tile placement.
export function toWorldPositionFromGrid(
  x: number,
  y: number,
  boardWidth: number,
  boardHeight: number
): [number, number, number] {
  const offsetX = boardWidth / 2 - 0.5;
  const offsetZ = boardHeight / 2 - 0.5;

  return [x - offsetX, 0, y - offsetZ];
}
