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
