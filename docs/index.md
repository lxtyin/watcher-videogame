# 文档索引

## 文档地图

- [架构总览](./arch/架构总览.md)
  - workspace 分层、主数据流、关键入口文件。
- [共享规则层](./arch/共享规则层.md)
  - shared 中的回合编排、动作结算、移动系统、地形、召唤物、能力管线。
- [能力系统统一模型](./arch/能力系统统一模型.md)
  - `Tool / Interaction / Skill / Modifier / Character / Player.tags / Player.modifiers / Turn Phase` 的正式定义与禁止事项。
- [交互层统一原型](./arch/交互层统一原型.md)
  - 用户如何操作一个Tool，如何进行Preview。
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
