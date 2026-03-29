# Watcher Docs Index

`docs/index.md` 是项目文档入口。
在修改玩法、架构或关键交互前，先阅读这里列出的文档。

## Current Scope

当前代码已经覆盖前两步原型能力：

- `shared / server / client` 三层 monorepo 工作区
- 基于 Colyseus 的权威多人房间原型
- 基础地形：`floor`、`wall`、`earthWall`
- 回合流程：掷骰阶段 `roll` 与行动阶段 `action`
- 双骰原型：移动骰子 + 工具骰子
- 基础工具：`Jump`、`Hookshot`、`Pivot`、`Dash`
- 3D 交互原型：在场景中拖动棋子选择方向，也支持点选同轴地块执行动作
- 占位素材：cube 场景与椭球棋子

## Reading Order

1. 先读玩法需求文档，明确规则目标和玩家体验。
2. 再读架构需求文档，明确分层和职责边界。
3. 然后阅读 `docs/arch` 下的实现文档，了解当前代码结构。
4. 实际改代码前，再阅读 AI 开发指南。

## Requirement Docs

- [玩法设计_需求文档](./玩法设计_需求文档.md)
  - 描述玩法目标、棋盘元素、工具方向和角色设想。
- [架构设计_需求文档](./架构设计_需求文档.md)
  - 描述目标技术栈、共享层职责和前后端边界。

## Architecture Docs

- [架构总览](./arch/架构总览.md)
  - 总结当前工作区结构、运行链路和已实现范围。
- [共享规则层](./arch/共享规则层.md)
  - 说明共享数据模型、骰子/工具注册方式与动作结算入口。
- [前后端联机原型](./arch/前后端联机原型.md)
  - 说明 Colyseus 房间、客户端状态流和 3D 交互原型。

## Development Guide

- [AI开发指南](./AI开发指南.md)
  - 约束 AI 协作者的阅读顺序、文档维护方式和注释规范。
