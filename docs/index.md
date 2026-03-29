# Watcher Docs Index

`docs/index.md` 是项目文档入口。
在修改玩法、架构或关键交互前，先阅读这里列出的文档。

## Current Scope

当前代码已经覆盖到“统一 Turn Tool 列表”这一轮原型：

- `shared / server / client` 三层 monorepo 工作区
- 基于 Colyseus 的权威多人房间原型
- 基础地形：`floor`、`wall`、`earthWall`
- 双阶段回合流程：`roll` 与 `action`
- 双骰原型：移动骰子 + 工具骰子
- 玩家每回合获得一份 `tools[]`
  - `Movement(points)` 也被视为一种 Tool
  - 玩家可以按任意顺序消耗本回合 Tool
- 当前基础 Tool
  - `Movement`
  - `Jump`
  - `Hookshot`
  - `Pivot`
  - `Dash`
  - `Brake`
- Tool 条件系统原型
  - `Dash` 需要当前工具列表中仍然存在 `Movement`
- Tool 派生原型
  - `Pivot` 会新增一个 `Movement(2)`
  - `Dash` 会给当前列表中的所有 `Movement` +2 点
- 3D 交互原型
  - 头顶弧形 Tool 环动态展示本回合 `tools[]`
  - `Movement` 按钮会直接显示点数
  - 条件不满足的 Tool 会置灰禁用
  - Tool 目标模式当前分为 `instant`、`direction`、`tile`
  - 在场景中按住 Tool、拖动选目标、松手执行、右键取消
  - 方向型 Tool 使用场景内 3D 箭头提示方向
  - `Brake` 这种选格型 Tool 会直接高亮实际会停下的那一格
  - `Movement`、`Jump`、`Hookshot` 会额外显示预计落点或命中目标的脚底圈
- 占位素材：cube 场景与椭球棋子

## Requirement Docs

- [玩法设计_需求文档](./玩法设计_需求文档.md)
  - 描述玩法目标、棋盘元素、工具方向和角色设想。
- [架构设计_需求文档](./架构设计_需求文档.md)
  - 描述目标技术栈、共享层职责和前后端边界。

## Architecture Docs

- [架构总览](./arch/架构总览.md)
  - 总结当前工作区结构、运行链路和已实现范围。
- [共享规则层](./arch/共享规则层.md)
  - 说明共享数据模型、Turn Tool 列表、Tool 条件与统一结算入口。
- [前后端联机原型](./arch/前后端联机原型.md)
  - 说明 Colyseus 房间、客户端状态流和 3D Tool 交互原型。

## Development Guide

- [AI开发指南](./AI开发指南.md)
  - 约束 AI 协作者的阅读顺序、文档维护方式和注释规范。
