Original prompt: 先阅读 `docs/AI开发指南.md`，理解项目，然后按照 `tmp/shared-movement-descriptor-migration.md` 指示对现有概念进行重构和收口。先前 AI 已经在这个任务上工作了一半，请继续完成。

# Progress

## 2026-05-02 Lucky Reward Dice and Villager

- Added the no-skill `villager` character and wired its portrait mapping.
- Added optional `initialSeeds` to `GAME_MAP_REGISTRY`; maps can pin `moveDieSeed` / `toolDieSeed`, while maps without seeds still use fresh time-derived match seeds.
- Added generic tile `state` and carried it through layout parsing/serialization, golden board summaries, server schema sync, client deserialization, and playback tile transitions.
- Added shared dice reward helpers for point rewards, fixed tool rewards, and random tool rewards. Lucky layout tokens now include `L1`-`L6`, `L:<toolId>`, and `L?`.
- Reworked Lucky so it never mutates into `emptyLucky`, has no per-turn limit, and grants its configured reward every time an in-turn stop triggers it.
- Added `DiceRewardModel` and `dice_reward_claim`; Lucky tiles render the configured die partly buried in the board, and Lucky/pig rewards use the same rising fading die effect with face-top rotation.
- The fading reward effect clones editable materials before changing opacity so it cannot leak transparency back into static board dice.
- Fixed the dev-server room creation crash by splitting reward-code enumeration from tool creation: `diceReward.ts` no longer imports the tool die registry during board/default map initialization, and runtime tool creation lives in `diceRewardTools.ts`.
- Reused the reward helper in dice pig death so pig carries and Lucky rewards share tool/point/random reward behavior.
- Added golden coverage for repeated Lucky triggers, point Lucky rewards, and fixed-tool Lucky rewards.
- Verified with shared/client/server typechecks, `npm.cmd run goldens` (`58/58`), `npm.cmd run build`, and develop-web-game browser runs for the Lucky fixed-tool case, dice-pig death reward effect, and `/mapeditor` route with no console/page errors. Screenshots confirmed dice pig carry dice and the rising/fading reward die.
- Follow-up verification for the TDZ fix: source-level `tsx` import of `packages/shared/src/index.ts` succeeds, dev server reaches `Watcher server ready at ws://localhost:2567`, and a Colyseus client can create a `watcher_room`.

## 2026-05-02 Player and Creature Placement Unification

- Moved `PetPiece` from `game/components` to `game/assets/player` so player piece rendering lives with the player asset set.
- Let `DicePigSummonAsset` reuse `PetPiece` for the pig body instead of maintaining separate cube-pet normalization logic; the carried die remains attached inside that model group.
- Upgraded `BoardScene` stack layout from player-only to a shared stackable entity list. Players and `kind: "creature"` summons now share entry serials, stack indices, vertical offsets, and fractional grid placement; `kind: "object"` summons still render as independent board objects.
- Added creature stack placement fields to `window.watcher_scene_debug.displayedSummons` for browser automation.
- Verified with client/shared typechecks, a develop-web-game golden smoke for `layout-symbol-spawns-dice-pig`, and a custom Playwright check that temporarily placed a dice pig on the actor cell and observed shared stack indices plus the stacked screenshot.

## 2026-05-02 Dice Pig Variants and Layout Descriptors

- Added generic summon `state` data and carried it through shared drafts, summon mutations, presentation transitions, server schema sync, client deserialization, and golden summaries.
- Expanded `dicePig` into 14 carry variants: movement points 1-6, the six tool die faces, random tool, and empty. Death rewards now follow the carried variant.
- Replaced the simple dice pig mesh with `animal-pig.glb` plus point/tool/random dice GLBs; point/tool face orientation reuses the dice roll face-top configuration.
- Upgraded layout rows to tab-separated cell descriptors. A cell can combine terrain and features, for example `.|p5` for a floor with an initial Movement 5 dice pig.
- Added and ran `scripts/migrate-layout-descriptors.mjs` to convert built-in boards and golden `layout` / `boardLayout` rows from legacy single-character maps.
- Added dice pig placement to the map editor. Painting terrain replaces the full cell descriptor and clears any initial summon; `R` now cycles variants for directional/faction terrain and dice pigs.
- Added golden coverage for point, specific-tool, and empty dice pig death rewards.
- Verified with `npm.cmd run typecheck`, `npm.cmd run goldens` (`56/56`), `npm.cmd run build`, a develop-web-game `/mapeditor` smoke, and a Playwright check that dice pig selection cycles `.|p1 -> .|p2 -> .|p3` with `R`.

## 2026-05-02 Creature Summons

- Added summon `kind` semantics: `object` summons remain board trigger objects, while `creature` summons are movable board entities.
- Extended projectile/entity targeting and `movementSystem` so player pieces and creature summons share the same displacement, terrain trigger, presentation, and summon mutation pipeline.
- Added summon `onDeath` and implemented `dicePig`; dice pigs die on lethal terrain and grant the current actor one random tool die reward.
- Added `LayoutSymbolDefinition.initialSummon` and temporary `P` layout support; the default free board now places one dice pig for testing.
- Added client summon motion playback and a simple 3D dice pig summon asset.
- Fixed creature playback so summon state transitions align to arrival frames, preventing creatures from flashing to the destination before the motion starts.
- Shared player/summon motion sampling for lift styles, reused the same scene pose logic for creature facing, leap lift, fall-side, and spin-drop animations, and added summon anchors so hookshot links track moving creatures.
- Added golden coverage for `P` spawning, dice pig displacement, and dice pig death rewards.
- Verified with `npm.cmd run typecheck`, `npm.cmd run goldens` (`53/53`), and `npm.cmd run build`.

## 2026-05-02 MovementDescriptor Timing Split

- Removed `timing` from `MovementDescriptor`; descriptors now only carry movement type, disposition, and tags.
- Added actor/player-id based movement timing for terrain, summon, and skill triggers via `movementTiming`.
- Removed `ToolContentDefinition.actorMovement` and made tool modules pass movement type/disposition explicitly to `resolveToolMovementDescriptor()`.
- Removed `createPassiveMovementDescriptor()` and migrated passive pushes/pulls to the unified descriptor helper.
- Added `wallet-passive-self-recoil-is-in-turn` to cover passive self movement that still happens in the acting player's turn.
- Verified with `npm.cmd run typecheck`, `npm.cmd run goldens` (`50/50`), and `npm.cmd run build`.

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

## 2026-05-01 Multi-Match, Race, Clipboard, and Audio Fixes

- Fixed same-room second-match movement playback by preserving the room-lifetime `nextPresentationSequence` when server match runtime is reset.
- Server match resets now seed movement/tool dice from current time so each new game starts from fresh random seeds instead of fixed defaults.
- Race mode now auto-finishes the final remaining racer when another racer reaches the goal and only one unfinished player remains; that final player receives the next rank and the runner-up's finish turn. Added `race-goal-autofinishes-final-unfinished-player`.
- Added clipboard fallback helper for room-code copy buttons in `LobbyScreen` and `HudSidebar`.
- Added global BGM/SFX toggle buttons at the root render layer, using `resources/icons/音乐.svg` and `resources/icons/音效.svg`, with persisted muted state.
- Updated `docs/arch/房间与大厅流程.md` and `docs/progress.md`.
- Verified with shared/server/client typecheck, `npm.cmd run goldens` (`49/49`), `npm.cmd run build`, a direct Colyseus two-match script confirming increasing presentation sequence and changed seeds, develop-web-game smoke, and Playwright UI checks for audio toggles and room-code copy.
