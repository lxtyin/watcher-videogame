export {};

declare global {
  interface Window {
    render_game_to_text: (() => string) | undefined;
    advanceTime: ((ms: number) => void) | undefined;
    project_grid_to_client:
      | ((x: number, y: number, elevation?: number) => { x: number; y: number } | null)
      | undefined;
  }
}
