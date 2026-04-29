# 文档索引

## 阅读顺序

1. [AI开发指南](./AI开发指南.md)
   - 开发约束、文档约束与测试要求
2. [游戏规则与内容定义](./游戏规则与内容定义.md)
   - 面向玩家的规则、概念与现有基础内容权威定义
3. [架构总览](./arch/架构总览.md)
   - 三层 workspace、关键入口与主数据流
4. [共享规则层](./arch/共享规则层.md)
   - shared 模块边界、draft 主链、terrain-modules 与扩展入口
5. [能力系统统一模型](./arch/能力系统统一模型.md)
   - `Tool / Interaction / Skill / Modifier / Character / Player.tags / Player.modifiers / Turn Phase`
6. [交互层统一原型](./arch/交互层统一原型.md)
   - `InteractionSession`、driver 与多段交互
7. [表现层原型](./arch/表现层原型.md)
   - `PreviewDescriptor / ActionPresentation / PlaybackEngine / 地形显示规则`
8. [内容注册与资源组织](./arch/内容注册与资源组织.md)
   - shared 内容注册、terrain-modules、client 资源目录
9. [前后端联机原型](./arch/前后端联机原型.md)
   - room、schema、snapshot、presentation 同步链路
10. [地图编辑器原型](./arch/地图编辑器原型.md)
   - `/mapeditor`、布局文本、地形库与自定义地图联机测试
11. [房间与大厅流程](./arch/房间与大厅流程.md)
   - room 生命周期、lobby、开局、结算、回房
12. [progress](./progress.md)
   - 最近完成的结构调整与验证记录

## 说明

- 文档只描述当前实现，不保留过时设计稿
- 同一机制只保留一份权威定义，其它文档只做引用与边界说明
- 如架构发生变化，必须同步更新文档并删除旧术语
