# 文档索引

## 阅读顺序

1. [AI开发指南](./AI开发指南.md)
2. [架构总览](./arch/架构总览.md)
3. [共享规则层](./arch/共享规则层.md)
4. [前后端联机原型](./arch/前后端联机原型.md)
5. [内容注册与资源组织](./arch/内容注册与资源组织.md)
6. [角色系统原型](./arch/角色系统原型.md)
7. [房间与大厅流程](./arch/房间与大厅流程.md)
8. [progress](../progress.md)

## 当前硬约束

- 回合编排的唯一实现位于 `packages/shared/src/gameOrchestration.ts`。
- `packages/server/src/rooms/WatcherRoom.ts` 只能做房间生命周期、消息入口、状态映射、计时器调度，不能编写回合推进、换人、结算逻辑。
- `packages/shared/src/simulation/engine.ts` 只是 shared orchestration 的本地包装层，不能重新实现回合逻辑。
- 新增工具、地形、召唤物、角色能力时，优先扩展 shared 规则层与内容注册，不要把规则散落到 room、simulator 或 client。
- 架构文档只描述当前实现与扩展边界；历史过程、试验记录放到 `progress.md`。

## 文档地图

- [架构总览](./arch/架构总览.md)
  - workspace 分层、核心数据流、关键入口文件。
- [共享规则层](./arch/共享规则层.md)
  - shared 中的回合编排、移动系统、工具/地形/召唤物/角色运行时边界。
- [前后端联机原型](./arch/前后端联机原型.md)
  - Colyseus room、schema 映射、客户端同步与表现层播放链路。
- [内容注册与资源组织](./arch/内容注册与资源组织.md)
  - shared 内容注册、客户端资源目录、扩展时应修改的位置。
- [角色系统原型](./arch/角色系统原型.md)
  - 角色状态、回合开始动作、角色专属工具与跨回合状态。
- [房间与大厅流程](./arch/房间与大厅流程.md)
  - 大厅、准备、开局、结算后回房等房间阶段流转。
- [progress](../progress.md)
  - 迭代记录与最近完成项。
