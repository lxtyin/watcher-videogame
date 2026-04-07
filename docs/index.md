# 文档索引

## 阅读顺序

1. [AI开发指南](./AI开发指南.md)
   - 开发约束、文档约束与测试要求
2. [架构总览](./arch/架构总览.md)
   - 三层 workspace、关键入口与主数据流
3. [共享规则层](./arch/共享规则层.md)
   - shared 的模块边界、扩展入口与禁止事项
4. [能力系统统一模型](./arch/能力系统统一模型.md)
   - `Tool / Interaction / Skill / Modifier / Character / Player.tags / Player.modifiers / Turn Phase`
5. [交互层统一原型](./arch/交互层统一原型.md)
   - tool input、`InteractionSession` 与多段交互
6. [表现层原型](./arch/表现层原型.md)
   - `PreviewDescriptor / ActionPresentation / PlaybackEngine`
7. [内容注册与资源组织](./arch/内容注册与资源组织.md)
   - shared 内容注册与 client 资源目录
8. [前后端联机原型](./arch/前后端联机原型.md)
   - room、schema、snapshot、presentation 同步链路
9. [房间与大厅流程](./arch/房间与大厅流程.md)
   - room 生命周期、lobby、开局、结算、回房
10. [progress](../progress.md)
   - 最近完成的重构与验证记录

## 说明

- 文档只描述当前实现，不保留过时设计稿。
- 同一机制只保留一份权威定义，其他文档只做引用和边界说明。
- 旧的“角色系统原型”和早期需求稿已移出当前文档体系，避免后续 AI 混用新旧模型。
