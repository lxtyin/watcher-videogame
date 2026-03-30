# Watcher Docs Index

`docs/index.md` 是项目文档入口。
在修改玩法、架构或关键交互前，先阅读这里列出的文档。

## Current Scope

当前代码已经覆盖到“统一 Turn Tool 列表”这一轮原型：

- `shared / server / client` 三层 monorepo 工作区
- 基于 Colyseus 的权威多人房间原型
- 基础地形：`floor`、`wall`、`earthWall`
- 扩展地形原型：`pit`、`lucky`、`conveyor`
  - `pit` 在 Tool 结算结束后触发停留效果，立即回出生点
  - `lucky` 在 Tool 结算结束后为当前行动玩家额外投一次工具骰，每回合限一次
  - `conveyor` 只在地面移动型 Tool 的经过阶段生效，可加速或强制转向
- 双阶段回合流程：`roll` 与 `action`
- 双骰原型：移动骰子 + 工具骰子
- 工具骰面可配置
  - 每个骰面可以独立配置 Tool 类型、次数和基础参数
- 玩家每回合获得一份 `tools[]`
  - `Movement(points)` 也被视为一种 Tool
  - 玩家可以按任意顺序消耗本回合 Tool
- 当前基础 Tool
  - `Movement`
  - `Jump`
  - `Hookshot`
  - `Dash`
  - `Brake`
  - `砌墙`
  - `篮球`
  - `火箭`
  - `瞬移`
- Tool 参数原型
  - Tool 实例统一携带 `params`
  - 当前覆盖移动点数、飞跃距离、钩锁长度、冲刺加值、制动距离、墙体耐久、飞行物射程和爆炸推力等参数
- Tool 条件系统原型
  - `Dash` 需要当前工具列表中仍然存在 `Movement`
- Tool 派生原型
  - `Dash` 会给当前列表中的所有 `Movement` +2 点
  - `篮球` 命中玩家后会返还新的篮球次数
- 3D 交互原型
  - 头顶弧形 Tool 环动态展示本回合 `tools[]`
  - `Movement` 按钮会直接显示点数
  - 条件不满足的 Tool 会置灰禁用
  - Tool 目标模式当前分为 `instant`、`direction`、`tile`
  - 选格 Tool 会进一步区分 `axis_line`、`adjacent_ring`、`board_any`
  - 在场景中按住 Tool、拖动选目标、松手执行、右键取消
  - 鼠标中键按住可旋转视角，滚轮可缩放镜头
  - 方向型 Tool 使用场景内 3D 箭头提示方向
  - `Brake` 这种选格型 Tool 会直接高亮实际会停下的那一格
  - `Movement`、`Jump`、`Hookshot` 会额外显示预计落点或命中目标的脚底圈
  - `砌墙` 会预览土墙虚影
  - `火箭` 会高亮预计爆炸范围
  - `篮球` 只预览发射方向，不额外显示落点圈
- Debug 原型
  - 左侧栏可以在行动阶段通过下拉列表直接发放任意已实现 Tool
  - `瞬移` 当前作为 debug Tool 提供，用于快速验证落点与地形结算
- 地形扩展链路原型
  - 共享层区分 Tool 结算后的“停留”与移动路径中的“经过”
  - `Movement`、`Brake` 复用同一条地面遍历管线
  - `Jump` 不会触发加速带这类经过地形效果
- 角色占位规则原型
  - 玩家不再阻挡彼此，多名玩家可以停留在同一格
  - 推动结算复用地面平移逻辑，因此会和普通平移一样触发墙体、土墙与经过地形
- 角色与预览表现原型
  - 棋子素材已替换为 `cube-pets` GLB 模型，并按同格人数做竖直叠放
  - 模型朝向由最近一次位移方向驱动
  - `Rocket` 在瞄准时会用红色高亮明确显示预计爆炸范围
- 占位素材：cube 场景与 `cube-pets` GLB 棋子

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
- [角色系统原型](./arch/角色系统原型.md)
  - 说明角色注册表、被动 Tool 变换、主动技能 Tool、钱包召唤物与左栏角色交互。

## Development Guide

- [AI开发指南](./AI开发指南.md)
  - 约束 AI 协作者的阅读顺序、文档维护方式和注释规范。

## Animation Notes

- 动作表现现在通过共享层的 `presentation` 时间线驱动
  - 当前已覆盖 `player_motion`、`projectile`、`effect`
  - `Rocket` 爆炸是第一种落地的 `effect` 原型
- 客户端会把角色的“稳定落位”与权威快照位置分开维护
  - 权威状态可以先更新到最终坐标
  - 场景仍会先停留在上一稳定位置，再由 `presentation` 接管播放，避免先瞬移到终点再回播
- 文本自动化现在可以直接读取 `window.render_game_to_text()` 中的 `displayedPlayers`
  - 后续动画回归优先用文本断言“显示位置”和“权威位置”的交接是否正确

## 2026-03-30 Character System Update

本轮原型新增了“角色 -> 技能 -> 召唤物”这一层可扩展结构，当前已经落地到代码里：

- 角色注册表放在 `packages/shared/src/characters.ts`
  - 角色可以声明回合开始赠送的 Tool
  - 角色可以声明主动技能 Tool
  - 角色也可以声明对已有 Tool 的被动变换
- 召唤物注册与路径触发逻辑放在 `packages/shared/src/summons.ts`
  - 当前首个召唤物是 `wallet`
  - 它通过“移动经过”触发，而不是“停留后”触发
- 当前已实现的示例角色
  - `Late`
    - 被动：所有 `Movement` 会在回合生成时转换成 `Brake`
  - `Ehh`
    - 被动：每回合额外获得一个 `Basketball`
  - `Leader`
    - 主动：获得 `deployWallet`
    - 该主动技能会在 5x5 范围内放置一个钱包，并立即结束当前回合
    - 自己后续用地面移动经过钱包时，会拾取钱包并额外投一次工具骰
- 客户端左栏现在区分为“角色信息 / 主动技能 / 回合工具”
  - 角色切换按钮只允许在 `roll` 阶段使用
  - 主动技能和普通 Tool 走同一套可用性、选中与执行链路
- 场景内现在会渲染钱包召唤物与钱包放置预览

## 2026-03-30 Architecture Refactor

本轮在不改玩法行为的前提下，重点整理了扩展结构：

- Shared 内容注册表收束到 `packages/shared/src/content/`
  - Tool、角色、召唤物、表现事件和默认地图都从这里定义
  - `types.ts` 中的核心 id 类型改为从注册表推导
- Shared 规则执行拆成 `rules/`
  - `spatial.ts` 负责路径与空间计算
  - `toolExecutors.ts` 负责各 Tool 的直接效果
  - `actionResolution.ts` 负责通用后处理
  - `actionPresentation.ts` 负责语义化表现时间线
  - `actions.ts` 保留统一公开入口
- Server 房间拆成“编排 + helper”
  - `WatcherRoom.ts` 主要保留 turn flow 和消息入口
  - schema 映射、状态回写、事件日志分别放进独立 helper
- Client 内容配置收束到 `packages/client/src/game/content/`
  - 弧形按钮 UI 元数据与 pet 模型 manifest 不再散落在场景组件中

可配内容与资源组织详见：

- [内容注册与资源组织](./arch/内容注册与资源组织.md)
  - 说明 Shared 内容注册、Client 资源 manifest、Server 房间 helper 的职责边界
