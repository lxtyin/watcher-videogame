# AGENTS.md - Watcher Development Guide

This file provides guidance for AI agents operating in the Watcher codebase.

## Project Structure

Watcher is a three-layer TypeScript workspace:

- `packages/shared`: Shared rules, types, board data, and command payloads
- `packages/server`: Colyseus authoritative room server
- `packages/client`: React + Zustand + React Three Fiber client

## Build Commands

### Root Commands

```powershell
npm.cmd install         # Install all dependencies
npm.cmd run dev         # Run both server and client in dev mode
npm.cmd run dev:client  # Run only client in dev mode
npm.cmd run dev:server  # Run only server in dev mode
npm.cmd run build       # Build all packages
npm.cmd run typecheck   # Type-check all packages
npm.cmd run goldens     # Run golden case tests
npm.cmd run goldens -- --case <case-id>  # Run specific golden case
```

### Workspace Commands

```powershell
npm.cmd run build --workspace @watcher/shared
npm.cmd run build --workspace @watcher/server
npm.cmd run build --workspace @watcher/client

npm.cmd run typecheck --workspace @watcher/shared
npm.cmd run typecheck --workspace @watcher/server
npm.cmd run typecheck --workspace @watcher/client
```

### Testing

This project uses a **golden case** framework for testing located in `packages/shared/src/goldens/`. Run tests with:

```powershell
npm.cmd run goldens                       # Run all golden cases
npm.cmd run goldens -- --case basic-movement-right  # Run specific case
```

For browser-based testing, use:
- Server: `ws://localhost:2567`
- Client: `http://localhost:5173`
- Golden runner: `http://localhost:5173/goldens`

## Code Style Guidelines

### Language

- **Code and comments**: English (ASCII characters only for comments per `docs/AI开发指南.md`)
- **Documentation**: Chinese (文档使用中文编写)
- **UI strings**: Chinese (user-facing text in the client)

### TypeScript Configuration

The project uses strict TypeScript with these key settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

### Naming Conventions

- **Files**: kebab-case (e.g., `boardTileVisual.tsx`, `movementTools.ts`)
- **Types/Interfaces**: PascalCase (e.g., `GridPosition`, `ToolDefinition`)
- **Functions**: camelCase (e.g., `resolveGroundTraversal`, `useWatcherConnection`)
- **Constants**: PascalCase for type-level, SCREAMING_SNAKE_CASE for values (e.g., `TOOL_REGISTRY`)
- **Components**: PascalCase (e.g., `BoardScene.tsx`, `HudSidebar.tsx`)
- **Directories**: kebab-case (e.g., `packages/client/src/game/assets/board/`)

### Imports

- Use explicit relative imports for internal modules
- Use package imports for workspace packages: `@watcher/shared`, `@watcher/server`
- Order imports: external → workspace → relative
- Prefer named imports: `import { type GridPosition, resolvePath } from "./spatial"`
- Use `import type` for type-only imports

Example:
```typescript
import { useEffect, useState } from "react";
import type { GridPosition, ToolDefinition } from "@watcher/shared";
import { WatcherRoom } from "./rooms/WatcherRoom";
import { resolvePath } from "../shared/rules/spatial";
```

### Formatting

- Use 2 spaces for indentation
- Maximum line length: 120 characters (soft guideline)
- Trailing commas in multi-line objects/arrays
- Use semicolons
- Opening brace on same line for functions/classes

### Error Handling

- Use descriptive error messages
- Let errors propagate from shared validation to server authority
- Client should handle connection errors gracefully with user-visible messages
- Use `console.error` for unexpected runtime errors in development

### React Patterns

- Use functional components with hooks
- Prefer Zustand for global state management
- Use `useCallback` and `useMemo` for performance-critical callbacks
- Name custom hooks with `use` prefix: `useWatcherConnection`, `useAnimationClock`

### Shared Package Guidelines

The shared package (`@watcher/shared`) contains the authoritative game rules:

- All game logic must be implemented here first, then synced to server
- Use discriminated unions for action resolution results
- Define content registries in `packages/shared/src/content/`
- Add golden cases for new features in `packages/shared/src/goldens/cases/`

### Colyseus Server Guidelines

- Keep room logic focused on message handling
- Use helper files for state mutations: `roomStateMappers.ts`, `roomStateMutations.ts`
- Validate all client commands before applying
- Mirror shared resolution results into schema state

### Client Guidelines

- Keep rendering and local UX in the client
- Reuse shared types and resolvers for preview logic
- Use `data-testid` for automation hooks
- Support text-based debugging via `window.render_game_to_text()`

## Development Notes

- On Windows, use `npm.cmd` instead of `npm` due to PowerShell restrictions
- Build from the canonical path `E:\Develop\Watcher` to avoid server packaging issues
- Server runs on port 2567, client on port 5173
- Golden cases can be run from CLI or browser for validation

## Documentation

- Maintain `docs/index.md` as the entry point
- Update architecture docs in `docs/arch/` when making structural changes
- Remove outdated content when updating documentation
- Keep `progress.md` updated with completed work

## Debugging Helpers

- `window.render_game_to_text()` - Returns game state as text for automation
- `window.watcher_scene_debug` - Exposes scene-facing positions
- Golden runner UI at `/goldens` for visual test playback
