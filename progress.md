# 进展记录

## 当前状态

- 已形成 `shared / server / client` 三层 workspace。
- 已接入大厅、准备、开局、结算后回房的联机流程。
- 已实现工具、地形、召唤物、角色跨回合状态、竞速模式、golden 测试与本地回放。
- 已建立 shared `ActionPresentation` 播放链路，客户端可按语义事件做动画与显示态回滚。

## 2026-04-04

- 将回合编排正式收口到 `packages/shared/src/gameOrchestration.ts`。
- `WatcherRoom.ts` 改为 shared orchestration 的适配层：
  - 只负责生命周期、消息入口、schema 映射、timer 调度。
- `packages/shared/src/simulation/engine.ts` 改为 shared orchestration 的本地包装层。
- 新增 room 的 snapshot/runtime 映射：
  - `roomStateMappers.ts`
  - `roomStateMutations.ts`
- 保留竞速 finish 动画延迟推进，但推进动作本身改为调用 shared `advanceTurn()`。
- 清理文档入口与核心架构文档，明确后续 AI 不应在 room 或 simulator 中编写回合逻辑。

## 最近验证

- `npm.cmd run typecheck`
- `npm.cmd run goldens`
- 结果：`20/20` golden cases passed

## 下一阶段建议

- 继续清理角色系统文档，使其与当前 `characterRuntime.ts` 完全对齐。
- 逐步减少 server/client 侧 JSON 字符串字段，收敛为更明确的 codec 或 schema 子结构。
- 继续拆分客户端场景层，降低 `BoardScene.tsx` 的输入、预览、播放耦合。
