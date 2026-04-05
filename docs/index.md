# 文档索引

## 阅读顺序

1. [AI开发指南](./AI开发指南.md)
2. [架构总览](./arch/架构总览.md)
3. [共享规则层](./arch/共享规则层.md)
4. [能力系统统一模型](./arch/能力系统统一模型.md)
5. [内容注册与资源组织](./arch/内容注册与资源组织.md)
6. [角色与能力组织](./arch/角色系统原型.md)
7. [前后端联机原型](./arch/前后端联机原型.md)
8. [房间与大厅流程](./arch/房间与大厅流程.md)
9. [progress](../progress.md)

## 当前硬约束

- 回合编排的唯一实现位于 `packages/shared/src/gameOrchestration.ts`。
- `packages/server/src/rooms/WatcherRoom.ts` 只能做房间生命周期、命令入口、状态映射和计时调度，不能再编写回合推进逻辑。
- `packages/shared/src/simulation/engine.ts` 只能包装 shared orchestration，不能再维护第二套 turn flow。
- 预览语义统一收敛到 `PreviewDescriptor`，表现语义统一收敛到 `ActionPresentation`，客户端播放统一收敛到 `packages/client/src/game/animation/playbackEngine.ts`。
- 能力系统的唯一权威模型以 [能力系统统一模型](./arch/能力系统统一模型.md) 为准。未经明确批准，不应引入新的顶层概念，也不应恢复旧系统。
- 架构文档只描述当前实现与已确认的稳定边界；历史过程、迁移记录、已完成事项统一写入 `progress.md`。

## 文档地图

- [架构总览](./arch/架构总览.md)
  - workspace 分层、主数据流、关键入口文件。
- [共享规则层](./arch/共享规则层.md)
  - shared 中的回合编排、动作结算、移动系统、地形、召唤物、能力管线。
- [能力系统统一模型](./arch/能力系统统一模型.md)
  - `Tool / Interaction / Skill / Modifier / Character / Player.tags / Player.modifiers / Turn Phase` 的正式定义与禁止事项。
- [内容注册与资源组织](./arch/内容注册与资源组织.md)
  - shared 与 client 的静态内容入口、资源目录与扩展落点。
- [角色与能力组织](./arch/角色系统原型.md)
  - 角色如何组合 `Skill`，以及 `Modifier`、`Tool`、`Player.tags`、`Player.modifiers` 的协作方式。
- [前后端联机原型](./arch/前后端联机原型.md)
  - Colyseus room、schema 映射、客户端同步，以及 `PreviewDescriptor / Presentation / PlaybackEngine` 链路。
- [房间与大厅流程](./arch/房间与大厅流程.md)
  - 房间生命周期、大厅、开局、结算、回房流程。
- [progress](../progress.md)
  - 最近完成的重构与验证记录。
