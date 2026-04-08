# 进展记录

## 当前状态

- 已形成 `shared / server / client` 三层 workspace。
- 已接入大厅、准备、开局、结算后回房的联机流程。
- 已实现工具、地形、召唤物、角色能力、竞速模式、golden 测试与本地回放。
- 已建立 `PreviewDescriptor + ActionPresentation + PlaybackEngine` 的表现链路，客户端按语义预览和语义事件播放瞬态。

## 2026-04-08

- 修正 `lucky` 的全局状态模型：
  - `lucky` 停留领取后真实切换为 `emptyLucky`
  - 回合开始时统一把 `emptyLucky` 恢复为 `lucky`
  - 删除 client 侧基于当前玩家 `turnFlags` 的 Lucky 显示特判

- 重组 shared 地形框架：
  - 新增 `packages/shared/src/terrain-modules/`
  - 地形改为“一种地形一个文件”
  - 抽出 `terrain-modules/traversal.ts` 统一管理地面移动、飞跃穿越与投射物阻挡规则
- 扩展并重定义地形：
  - 新增 `poison`，停留触发并把玩家送回出生点
  - 旧 `pit` 改为经过触发并把玩家送回出生点
  - 新增 `highwall`，阻挡地面移动、飞跃穿越与投射物
  - `cannon` 接入地形模块并继续复用火箭核心结算
  - `lucky` 改为“逻辑不改地形，显示按当前玩家回合状态隐藏”
- 扩展 shared presentation：
  - `PresentationMotionStyle` 新增 `fall_side` 与 `spin_drop`
  - `effect` 新增 `lucky_claim`
  - `poison` 与 `pit` 通过玩家 motion 完成动画
- 扩展 client 地形表现：
  - 新增 `PoisonTileAsset`
  - 新增 `HighwallTileAsset`
  - 新增 `LuckyClaimEffectAsset`
  - `BoardScene` 依据当前行动玩家 `turnFlags` 控制 lucky 方块是否显示
- 更新默认棋盘符号：
  - `p -> poison`
  - `o -> pit`
  - `H -> highwall`
- 新增与更新 golden 用例：
  - `turn-start-poison-respawns-before-roll`
  - `pit-pass-through-respawns-mid-move`
  - `highwall-blocks-leap-traversal`
- 验证：
  - `npm.cmd run typecheck --workspace @watcher/shared`
  - `npm.cmd run typecheck --workspace @watcher/server`
  - `npm.cmd run typecheck --workspace @watcher/client`
  - `npm.cmd run goldens`
  - 结果：`27/27` golden cases passed

## 2026-04-07

- shared 主链切换为自顶向下传递 draft 的结算模型：
  - 新增 `packages/shared/src/rules/actionDraft.ts`
  - tool executor、terrain trigger、summon trigger 全部改为直接修改 draft
  - 删除旧的 patch-builder 主路径
- 火箭链路收回到工具模块内部：
  - 删除过渡层 `packages/shared/src/rules/rocketResolution.ts`
  - 在 `packages/shared/src/tool-modules/rocket.ts` 内部定义 `resolveRocketCore(draft, spec)`
  - `cannon` 直接复用 `resolveRocketCore()`
- 整理 client 工具资源目录：
  - 资源按 `packages/client/src/game/assets/tools/<tool-id>/` 聚合
  - 删除 `wallGhostPositions`、`summonPreviews` 等预览专用旁路
- 文档体系收口到当前架构：
  - 新增 `docs/arch/表现层原型.md`
  - 重写 `docs/index.md`、`docs/arch/共享规则层.md`、`docs/arch/内容注册与资源组织.md` 等权威入口

## 2026-04-06

- 完成 shared 工具交互协议重构：
  - 删除 `targetMode / tileTargeting`
  - 新增 `packages/shared/src/toolInteraction.ts`
  - `useTool` payload 统一为 `{ toolInstanceId, input }`
- client 交互层统一为 `InteractionSession + driver`
- shared 工具模块统一迁入 `packages/shared/src/tool-modules/`

## 2026-04-05

- 完成能力系统统一模型：
  - `Character -> Skill -> Modifier`
  - `Player.tags + Player.modifiers`
  - `turn-start / turn-action / turn-end`
- 删除旧的角色运行时与 turn-start action 旧系统
- 新增 `AWM` 与基础 modifier `bondage`

## 2026-04-04

- 将回合编排正式收口到 `packages/shared/src/gameOrchestration.ts`
- `WatcherRoom.ts` 改为 shared orchestration 的适配层
- `packages/shared/src/simulation/engine.ts` 改为 shared orchestration 的本地包装层
