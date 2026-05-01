Original prompt: 先阅读 `docs/AI开发指南.md`，理解项目，然后按照 `tmp/shared-movement-descriptor-migration.md` 指示对现有概念进行重构和收口。先前 AI 已经在这个任务上工作了一半，请继续完成。

# Progress

## 2026-05-01

- Read `docs/AI开发指南.md`, `docs/index.md`, and `tmp/shared-movement-descriptor-migration.md`.
- Confirmed the current migration goal: remove incomplete movement descriptor concepts and make tool/passive helpers produce complete `MovementDescriptor` values before calling `movementSystem`.
- Removed `MovementDescriptorInput`, `createMovementDescriptorInput()`, `materializeMovementDescriptor()`, `ToolMovementPlan`, `createToolMovementPlan()`, and `createPassiveToolMovementPlan()` from shared source code.
- Added `resolveToolMovementDescriptor()` and `createPassiveMovementDescriptor()` as the tool-layer descriptor helpers.
- Updated `movementSystem` to consume complete `MovementDescriptor` values and only clone landing variants for leap landing semantics.
- Updated active movement tools and passive push/pull tools to pass complete descriptors into displacement resolvers.
- Verified with `npm.cmd run typecheck --workspace @watcher/shared`, `npm.cmd run goldens -- --case leader-wallet-active-translate-pass`, `npm.cmd run goldens`, and `npm.cmd run typecheck`.

## 2026-05-01 Phase Entry Stop Timing

- Investigated `applyPhaseEntryStop()` and found wallet differed from lucky because `beginTurnFor()` and `bootstrapExistingTurnStartPhase()` invoked a summon-only stop trigger during `turn-start`.
- Removed the turn-start summon-only `applyPhaseEntryStop()` calls so terrain and summons both trigger stop effects when entering `turn-action`.
- Updated the wallet golden case from `wallet-turn-start-pickup-on-stand` to `wallet-turn-action-pickup-on-stand`.
- Verified with `npm.cmd run typecheck --workspace @watcher/shared`, targeted wallet/lucky/stun golden cases, `npm.cmd run goldens`, and `npm.cmd run typecheck`.

## 2026-05-01 Lobby Redesign

- Added an independent client lobby screen for `roomPhase === "lobby"` so created/joined rooms no longer mount the gameplay board before the match starts.
- Built the lobby around four-column player cards with the existing character-card presentation, pet thumbnail, color swatch, name, online/ready state, ready action, host mark, and host kick action.
- Added a character picker modal opened from the local player's role card; it renders every current character as four-column cards and switches via `setCharacter`.
- Added shared `DEFAULT_CHARACTER_ID = "ehh"` and used it for new server room players and shared simulation fallback.
- Updated `docs/arch/房间与大厅流程.md` and `docs/progress.md`.
- Verified with `npm.cmd run typecheck`, `npm.cmd run goldens` (`48/48` passed), `npm.cmd run build --workspace @watcher/client`, the `develop-web-game` Playwright smoke script, and a DOM Playwright smoke that confirmed lobby phase, no `.scene-panel`, default `ehh`, 10 character options, character switching, ready sync, and no console/page errors.
- Follow-up layout pass: lobby and picker character cards now keep the HUD character card internals unchanged and only scale the whole card wrapper; player cards use fixed narrow columns, and ready buttons no longer stretch across the whole card. Verified with client typecheck, client build, Playwright screenshot inspection, and DOM size checks.
- Follow-up high-resolution pass: character card wrappers now scale up at wider desktop breakpoints while preserving HUD-card internals. The ready button moved to the footer next to Start Game, and player cards no longer render the duplicate bottom host mark. Verified with client typecheck, client build, develop-web-game smoke, and 1280/1920 Playwright screenshots plus DOM measurements.
- Follow-up proportional-card pass: HUD, lobby, and picker character cards now share `character-card-frame` plus container-width based internal sizing. The lobby no longer uses manual transform scale or wide-screen scale breakpoints, and the player grid width uses `clamp()` so 1280x720 stays clear of the footer while 1920x1080 still grows naturally. Verified with client typecheck, client build, develop-web-game smoke, and Playwright DOM/screenshot checks across 1280x720 and 1920x1080; lobby, modal, and HUD character cards all measured 4:5 with no console/page errors.
