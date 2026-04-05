# 进展记录

## 当前状态

- 已形成 `shared / server / client` 三层 workspace。
- 已接入大厅、准备、开局、结算后回房的联机流程。
- 已实现工具、地形、召唤物、角色能力、竞速模式、golden 测试与本地回放。
- 已建立 shared `ActionPresentation` 播放链路，客户端可按语义事件做动画与显示态回滚。

## 2026-04-05

- 新增能力系统权威文档 `docs/arch/能力系统统一模型.md`，并冻结顶层概念边界。
- 将玩家跨回合状态容器从旧角色状态模型统一迁移为 `Player.tags` 的 `Tag Map`。
- 新增 `packages/shared/src/modifiers.ts` 与 `packages/shared/src/playerTags.ts`，正式定义 `Skill / Modifier / Player.tags` 运行时接口。
- 引入 `packages/shared/src/skills/`，把角色能力改为 `Character -> Skill -> Modifier`。
- 将 Blaze、Volaty 的回合开始能力改为 `turn-start` 阶段工具，并统一吞并到 `useTool`。
- 删除旧系统：
  - `packages/shared/src/characterRuntime.ts`
  - `packages/shared/src/turnStartActions.ts`
  - `packages/shared/src/content/turnStartActions.ts`
- 将 shared / server / client 全链路中的 `characterState` 迁移为 `tags`。
- 将客户端 HUD 改成统一工具环，不再保留独立的 turn-start action UI。
- 清理架构文档，去除已删除旧系统的现状描述。
- 将回合中段阶段名从 `action` 统一改为 `turn-action`，并同步 shared / server / client / 文档。
- 将 Modifier 阶段 hook 统一收敛为 `onTurnStart / onTurnActionStart / onTurnEnd`。
- 把单个 Tool 的定义与执行收拢到 `packages/shared/src/tool-modules/`，删除旧的分散式 `rules/executors/*` 工具实现文件。
- 将回合开始的停留结算从 `movementSystem.resolveCurrentTileStop` 收回 `gameOrchestration.ts`，由编排层统一处理地形与召唤物停留效果。
- 新增角色 `AWM` 与基础 Modifier `bondage`，验证“角色施加 tags，基础 Modifier 通过 tags 激活”的可插拔能力模型。
- 扩展 golden 断言以检查 `player.tags`，并新增 AWM / bondage 两条能力系统回归用例。

## 2026-04-04

- 将回合编排正式收口到 `packages/shared/src/gameOrchestration.ts`。
- `WatcherRoom.ts` 改为 shared orchestration 的适配层，只负责消息入口、schema 映射和 timer 调度。
- `packages/shared/src/simulation/engine.ts` 改为 shared orchestration 的本地包装层。
- 新增 room 的 snapshot/runtime 映射：
  - `roomStateMappers.ts`
  - `roomStateMutations.ts`
- 保留竞速 finish 动画延迟推进，但推进动作本身改为调用 shared `advanceTurn()`。

## 最近验证

- `npm.cmd run typecheck`
- `npm.cmd run goldens`
- 结果：`22/22` golden cases passed
